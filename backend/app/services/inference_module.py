import joblib
import os
import numpy as np
import scipy.sparse as sp
import logging
import time
from typing import Dict, Union, List
from urllib.parse import urlparse
import xgboost as xgb

# Import exact preprocessing logic from feature_engineering module 
# to ensure 100% feature match with the training pipeline
from .feature_engineering import extract_url_features, preprocess_sms, keyword_features
from .sms_detector import SMIShingDetector
from .threat_intel import ThreatIntelModule

logger = logging.getLogger(__name__)

# Initialize detector once
sms_detector = SMIShingDetector()

# Threat Intelligence singleton
threat_intel = ThreatIntelModule()

FEATURE_DESCRIPTIONS = {
    "url_length": "URL length",
    "num_dots": "Number of dots in URL",
    "num_special_chars": "Special character count",
    "has_https": "Uses HTTPS protocol",
    "has_ip": "IP address used as domain",
    "num_subdomains": "Number of subdomains",
    "entropy": "URL string entropy (unusual patterns)",
    "domain_age_days": "Domain age in days"
}

FEATURE_RISK_DIRECTION = {
    "url_length": "long",
    "num_dots": "high",
    "num_special_chars": "high",
    "has_https": "missing",
    "has_ip": "present",
    "num_subdomains": "high",
    "entropy": "high",
    "domain_age_days": "young"
}

TRUSTED_DOMAINS = [
    "google.com", "github.com", "stackoverflow.com", "microsoft.com",
    "apple.com", "amazon.com", "facebook.com", "youtube.com",
    "linkedin.com", "wikipedia.org", "twitter.com", "instagram.com",
    "reddit.com", "medium.com", "gitlab.com", "bitbucket.org",
    "npmjs.com", "pypi.org", "docker.com", "kubernetes.io",
    "oracle.com", "ibm.com", "aws.amazon.com", "cloudflare.com",
    "vercel.com", "netlify.com", "heroku.com", "digitalocean.com",
    "whatsapp.com", "telegram.org", "signal.org", "discord.com",
    "slack.com", "notion.so", "figma.com", "atlassian.net",
    "adobe.com", "salesforce.com", "shopify.com", "wordpress.com",
    "blogger.com", "tumblr.com", "quora.com", "pinterest.com",
    "spotify.com", "netflix.com", "zoom.us", "teams.microsoft.com",
    "okta.com", "auth0.com", "mongodb.com", "redis.io",
    "python.org", "nodejs.org", "react.dev", "angular.io",
    "nginx.com", "apache.org", "jetbrains.com", "visualstudio.com",
    "canva.com", "mailchimp.com", "stripe.com", "paypal.com",
    "dropbox.com", "box.com", "sendgrid.com", "twilio.com",
    "news.ycombinator.com", "ycombinator.com", "producthunt.com",
    "dev.to", "hashnode.com", "codepen.io", "jsfiddle.net",
    "replit.com", "glitch.com", "codesandbox.io", "stackblitz.com",
    "mit.edu", "harvard.edu", "stanford.edu", "berkeley.edu",
    "sciencedirect.com", "ieee.org", "acm.org", "arxiv.org",
    "nytimes.com", "wsj.com", "bloomberg.com", "forbes.com",
    "cnn.com", "bbc.com", "bbc.co.uk", "theguardian.com",
    "nationalgeographic.com", "nature.com", "scientificamerican.com"
]

class RealTimeInferenceModule:
    """
    Real-time inference module for Phishing/SMS classification.
    Optimized for low-latency (<100ms) by keeping models in memory.
    """
    def __init__(self, models_dir: str = None):
        # Allow custom model paths, fallback to default structure
        if not models_dir:
            models_dir = os.path.join(os.path.dirname(__file__), '../../models')
            
        # Target paths corresponding to training outputs
        self.url_model_path = os.path.join(models_dir, 'url_models/best_url_model.pkl')
        
        # Pre-allocate models in memory
        self.url_model = None
        
        self.load_models()
        
    def load_models(self):
        """Loads all artifacts directly into memory at startup."""
        try:
            if os.path.exists(self.url_model_path):
                self.url_model = joblib.load(self.url_model_path)
            
            logger.info("Real-Time Inference Module: URL model loaded into memory.")
        except Exception as e:
            logger.error(f"Failed to load required models: {e}")

    def predict(self, input_type: str, data: str) -> Dict[str, Union[str, float, float]]:
        """
        Main entrance point for unified real-time classification.
        
        Returns: 
           { 'label': 'phishing' or 'safe', 'confidence': float, 'latency_ms': float }
        """
        start_time = time.perf_counter()
        
        input_type = input_type.lower()
        if input_type == 'url':
            result = self._predict_url(data)
        elif input_type == "sms":
            try:
                # Use the optimized standalone detector
                res = sms_detector.predict(data)

                result = {
                    "label": res.get("prediction", "safe"),
                    "confidence": float(res.get("confidence_score", 0.5)),
                    "explanation": self._generate_sms_explanation(data)
                }

            except Exception as e:
                print("SMS ERROR:", str(e))
                result = {
                    "label": "safe",
                    "confidence": 0.5,
                    "explanation": []
                }
        else:
            return {"error": "Invalid input_type. Must be 'url' or 'sms'."}
            
        latency_ms = (time.perf_counter() - start_time) * 1000
        result['latency_ms'] = round(latency_ms, 2)
        
        return result

    def _generate_url_explanation(self, features_dict: dict) -> List[dict]:
        """Generate per-feature SHAP contribution explanation for URL prediction."""
        feature_names = list(features_dict.keys())
        X = np.array(list(features_dict.values())).reshape(1, -1)

        try:
            booster = self.url_model.get_booster()
            dmatrix = xgb.DMatrix(X, feature_names=feature_names)
            contribs = booster.predict(dmatrix, pred_contribs=True)[0]

            explanations = []
            for i, name in enumerate(feature_names):
                contribution = float(contribs[i])
                raw_value = features_dict[name]
                descriptions = FEATURE_DESCRIPTIONS.get(name, name)
                risk_dir = FEATURE_RISK_DIRECTION.get(name, "")
                explanations.append({
                    "feature": name,
                    "description": descriptions,
                    "value": raw_value if not isinstance(raw_value, float) else round(raw_value, 2),
                    "contribution": round(contribution, 4),
                    "importance": round(abs(contribution), 4),
                    "direction": "increases_risk" if contribution > 0 else "decreases_risk",
                    "risk_indicator": risk_dir
                })
            explanations.sort(key=lambda x: x["importance"], reverse=True)
            return explanations

        except Exception as e:
            logger.warning(f"SHAP explanation unavailable, using feature importance fallback: {e}")
            return self._generate_url_explanation_fallback(features_dict)

    def _generate_url_explanation_fallback(self, features_dict: dict) -> List[dict]:
        """Fallback explanation using feature importances when SHAP is unavailable."""
        feature_names = list(features_dict.keys())
        try:
            importances = self.url_model.feature_importances_
        except Exception:
            importances = [1.0 / len(feature_names)] * len(feature_names)

        total_importance = sum(abs(i) for i in importances)
        explanations = []
        for i, name in enumerate(feature_names):
            raw_value = features_dict[name]
            norm_imp = abs(importances[i]) / total_importance if total_importance > 0 else 0
            explanations.append({
                "feature": name,
                "description": FEATURE_DESCRIPTIONS.get(name, name),
                "value": raw_value if not isinstance(raw_value, float) else round(raw_value, 2),
                "contribution": round(float(importances[i]), 4),
                "importance": round(norm_imp, 4),
                "direction": "increases_risk" if importances[i] > 0 else "decreases_risk",
                "risk_indicator": FEATURE_RISK_DIRECTION.get(name, "")
            })
        explanations.sort(key=lambda x: x["importance"], reverse=True)
        return explanations

    def _generate_sms_explanation(self, text: str) -> List[dict]:
        """Generate keyword-based explanation for SMS prediction."""
        text_lower = text.lower()
        phishing_keywords = [
            "urgent", "verify", "account", "bank", "click",
            "login", "password", "blocked", "suspended",
            "lottery", "winner", "claim", "prize",
            "link", "http", "www", "limited", "action required",
            "kyc", "refund", "tax", "billing", "payment"
        ]

        explanations = []
        matched_keywords = [kw for kw in phishing_keywords if kw in text_lower]

        if matched_keywords:
            for kw in matched_keywords:
                explanations.append({
                    "feature": f"keyword_{kw}",
                    "description": f"Contains phishing keyword: '{kw}'",
                    "value": 1,
                    "contribution": 0.12,
                    "importance": 0.12,
                    "direction": "increases_risk",
                    "risk_indicator": "present"
                })

        has_url = "http" in text_lower or "www" in text_lower
        if has_url:
            explanations.append({
                "feature": "contains_url",
                "description": "Message contains a URL link",
                "value": 1,
                "contribution": 0.15,
                "importance": 0.15,
                "direction": "increases_risk",
                "risk_indicator": "present"
            })

        has_urgent_action = any(w in text_lower for w in ["verify", "update", "confirm", "billing", "account"])
        if has_urgent_action:
            explanations.append({
                "feature": "action_keywords",
                "description": "Contains urgent action keywords",
                "value": 1,
                "contribution": 0.10,
                "importance": 0.10,
                "direction": "increases_risk",
                "risk_indicator": "present"
            })

        explanations.sort(key=lambda x: x["importance"], reverse=True)
        return explanations

    def _enrich_with_threat_intel(self, url: str, ml_result: dict) -> dict:
        """Query external threat intel APIs (PhishTank, VirusTotal) for enrichment."""
        mapped_ml = {
            "confidence_score": ml_result.get("confidence", 0.0),
            "prediction": ml_result.get("label", "unknown")
        }
        return threat_intel.get_aggregate_score(url, mapped_ml)

    def _is_trusted_domain(self, url: str) -> str:
        """Check if URL belongs to a trusted domain. Returns matched domain or empty string."""
        try:
            domain = urlparse(url).netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            for trusted in TRUSTED_DOMAINS:
                if domain == trusted or domain.endswith("." + trusted):
                    return trusted
        except Exception:
            pass
        return ""

    def _predict_url(self, url: str) -> Dict[str, Union[str, float]]:
        if not self.url_model:
            return {"label": "unknown", "confidence": 0.0, "error": "URL model unavailable"}

        # 1. Trusted Domain Pre-check (do this BEFORE feature extraction to
        #    avoid slow/failing WHOIS lookups for well-known domains)
        matched_domain = self._is_trusted_domain(url)
        if matched_domain:
            result = {
                "label": "safe",
                "confidence": 0.95,
                "explanation": [{
                    "feature": "trusted_domain",
                    "description": f"Domain '{matched_domain}' is in trusted allowlist",
                    "value": 1,
                    "contribution": -0.95,
                    "importance": 1.0,
                    "direction": "decreases_risk",
                    "risk_indicator": "trusted"
                }],
                "override": "trusted_domain"
            }
            result["threat_intel"] = self._enrich_with_threat_intel(url, result)
            return result

        # 2. Feature Extraction
        features_dict = extract_url_features(url)
        X = np.array(list(features_dict.values())).reshape(1, -1)

        # 3. Model Prediction
        result = self._format_prediction(self.url_model, X)
        result["features_extracted"] = features_dict
        result["explanation"] = self._generate_url_explanation(features_dict)
        result["override"] = "ml"

        # 4. Safe-signal override: if ML says phishing but URL has HTTPS
        #    and strong safe signals, reduce confidence or flip to safe.
        if result["label"] == "phishing":
            safe_signals = []
            risk_signals = []
            for e in result["explanation"]:
                if e["direction"] == "decreases_risk" and e["contribution"] < -0.1:
                    safe_signals.append(e)
                if e["direction"] == "increases_risk" and e["contribution"] > 0.5:
                    risk_signals.append(e)

            has_https = features_dict.get("has_https", 0) == 1
            has_ip = features_dict.get("has_ip", 0) == 1
            short_url = features_dict.get("url_length", 100) < 30
            low_entropy = features_dict.get("entropy", 10) < 3.5

            # Strong safe signal: HTTPS + no IP + many safe SHAP contributions
            if has_https and not has_ip and len(safe_signals) >= 2 and result["confidence"] < 0.85:
                safe_explanation = [{
                    "feature": "safe_signal_override",
                    "description": "URL has HTTPS + no IP + multiple safe signals — overriding ML",
                    "value": 1,
                    "contribution": -result["confidence"],
                    "importance": result["confidence"],
                    "direction": "decreases_risk",
                    "risk_indicator": "override"
                }]
                return {
                    "label": "safe",
                    "confidence": 0.65,
                    "features_extracted": features_dict,
                    "explanation": result["explanation"] + safe_explanation,
                    "override": "safe_signal_override"
                }

            # Moderate safe signal: HTTPS + short URL + low entropy
            if has_https and (short_url or low_entropy) and result["confidence"] < 0.75:
                result["label"] = "safe"
                result["confidence"] = 0.55
                result["override"] = "safe_signal_override"

        # 5. Threat Intelligence Enrichment (PhishTank, VirusTotal)
        result["threat_intel"] = self._enrich_with_threat_intel(url, result)
        return result

    def _predict_sms(self, text: str) -> Dict[str, Union[str, float]]:
        # 1. Prediction using Pipeline or Legacy artifacts
        if self.sms_pipeline:
            # Full Pipeline handles preprocessing + TF-IDF + model
            probabilities = self.sms_pipeline.predict_proba([text])[0]
            kwd_dict = keyword_features(text) # Still needed for logging/explanation
        else:
            # Fallback Preprocessing (Identical parsing as training vectors)
            processed_text = preprocess_sms(text)
            tfidf_vec = self.sms_vectorizer.transform([processed_text])
            kwd_dict = keyword_features(text)
            kwd_sparse = sp.csr_matrix([list(kwd_dict.values())])
            kwd_multiplied = sp.hstack([kwd_sparse, kwd_sparse, kwd_sparse])
            X = sp.hstack([tfidf_vec, kwd_multiplied])
            probabilities = self.sms_model.predict_proba(X)[0]
        
        # 2. Risk Level & Threshold Tuning (Recall-heavy: 0.35)
        phishing_prob = float(probabilities[1])
        result = self._format_prediction_v2(phishing_prob, threshold=0.35)
        
        # 3. Interpretability Layer
        result["explanation"] = self.explain_prediction(text, kwd_dict)
        result["features_extracted"] = kwd_dict
        
        return result

    def _format_prediction_v2(self, phishing_prob: float, threshold: float = 0.35) -> Dict[str, Union[str, float]]:
        """
        New formatter with Risk Scoring (LOW, MEDIUM, HIGH)
        """
        if phishing_prob > threshold:
            label = "phishing"
        else:
            label = "safe"
            
        # Risk Scoring System
        if phishing_prob > 0.8:
            risk_level = "HIGH"
        elif phishing_prob > threshold:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
            
        return {
            "label": label,
            "confidence": round(phishing_prob if label == "phishing" else (1 - phishing_prob), 4),
            "risk_level": risk_level,
            "phishing_probability": round(phishing_prob, 4)
        }

    def _format_prediction(self, model, X, threshold: float = None) -> Dict[str, Union[str, float]]:
        """
        Standardizes output across all incoming classifiers (Safe vs Phishing)
        and captures max probability metric for confidence score.
        """
        probabilities = model.predict_proba(X)[0]
        
        if threshold is not None:
            phishing_prob = float(probabilities[1])
            if phishing_prob > threshold:
                prediction_idx = 1
                confidence = phishing_prob
            else:
                prediction_idx = 0
                confidence = float(probabilities[0])
        else:
            prediction_idx = int(np.argmax(probabilities))
            confidence = float(np.max(probabilities))
        
        final_label = "phishing" if prediction_idx == 1 else "safe"
        
        return {
            "label": final_label,
            "confidence": round(confidence, 4)
        }

# Export singleton pattern to avoid loading models multiple times
inference_module = RealTimeInferenceModule()

if __name__ == "__main__":
    # Latency and Logic Test block
    print("Generating Real-Time Inference Results...")
    
    # 1. Test URL Engine
    url_result = inference_module.predict("url", "http://update-login-secure.bank.com/session39192")
    print(f"URL Input Result: {url_result}")
    
    # 2. Test SMS Engine
    sms_result = inference_module.predict("sms", "URGENT ACTION! Reply with your PIN to verify account")
    print(f"SMS Input Result: {sms_result}")
