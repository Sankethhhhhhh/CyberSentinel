import os
import joblib
import numpy as np
import scipy.sparse as sp
import pandas as pd
import logging
from .feature_engineering import extract_url_features, preprocess_sms, keyword_features
from .similarity_service import similarity_service

logger = logging.getLogger(__name__)

THRESHOLD = 0.25
HIGH_RISK_THRESHOLD = 0.7

PHISHING_KEYWORDS = [
    "verify", "verification", "account", "update", "login",
    "bank", "otp", "password", "billing", "payment",
    "suspend", "suspended", "restricted", "expired",
    "confirm", "identity", "secure", "alert", "activity",
    "transaction", "unusual", "access", "review"
]

def keyword_score(text):
    text = text.lower()
    score = 0

    for word in PHISHING_KEYWORDS:
        if word in text:
            score += 0.15

    return min(score, 1.0)

def compute_sms_rule_score(text: str) -> float:
    """Computes a weighted heuristic score for SMS phishing terms."""
    text = text.lower()
    score = 0.0

    strong_keywords = ["urgent", "verify", "bank", "account", "locked"]
    medium_keywords = ["click", "login", "link"]
    weak_keywords = ["free", "gift", "reward", "now"]

    for word in strong_keywords:
        if word in text:
            score += 2

    for word in medium_keywords:
        if word in text:
            score += 1

    for word in weak_keywords:
        if word in text:
            score += 0.5

    # Pattern boost for combinations
    weak_combo = ["free", "gift", "reward", "offer", "claim"]
    medium_combo = ["click", "login", "verify", "account"]

    weak_count = sum(1 for w in weak_combo if w in text)
    medium_count = sum(1 for w in medium_combo if w in text)

    # Boost if multiple weak signals
    if weak_count >= 2:
        score += 1

    # Boost if weak + medium combo
    if weak_count >= 1 and medium_count >= 1:
        score += 1

    # Context Boost Rule (Financial + Action)
    financial_terms = ["bank", "account", "kyc", "refund", "tax"]
    action_terms = ["verify", "update", "click", "login", "confirm"]
    
    if any(f in text for f in financial_terms) and any(a in text for a in action_terms):
        score += 1

    return min(1.0, score / 3.0)

def compute_url_rule_score(url: str, features: dict) -> float:
    """Computes a heuristic score for URL indicators."""
    score = 0.0
    # 1. No HTTPS
    if not features.get('is_https', 1): score += 0.3
    # 2. IP address used as domain
    if features.get('ip_present', 0): score += 0.4
    # 3. High number of subdomains/special chars
    if features.get('num_subdomains', 1) > 3: score += 0.2
    if features.get('special_char_count', 0) > 5: score += 0.1
    # 4. Short domain age (0 or 1)
    if features.get('domain_age_days', 0) <= 7: score += 0.2
    
    return min(1.0, score)

class PredictionService:
    def __init__(self):
        self.url_model = None
        self.sms_model = None
        self.sms_vectorizer = None
        
        # Load models on initialization
        self.load_models()
        
    def load_models(self):
        """Loads all required models and vectorizers from the models directory."""
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        
        url_model_path = os.path.join(BASE_DIR, "models", "url_models", "best_url_model.pkl")
        sms_model_path = os.path.join(BASE_DIR, "models", "sms_model", "sms.model.pkl")
        sms_vec_path = os.path.join(BASE_DIR, "models", "sms_model", "vectorizer.pkl")
        
        try:
            if os.path.exists(url_model_path):
                self.url_model = joblib.load(url_model_path)
                logger.info(f"Successfully loaded URL model from {url_model_path}")
            else:
                logger.warning(f"URL model not found at {url_model_path}")
                
            if os.path.exists(sms_model_path) and os.path.exists(sms_vec_path):
                print("Loading SMS model from:", sms_model_path)
                print("Loading vectorizer from:", sms_vec_path)
                
                self.sms_model = joblib.load(sms_model_path)
                self.sms_vectorizer = joblib.load(sms_vec_path)
                
                if hasattr(self.sms_model, 'n_features_in_'):
                    print("Model expects:", self.sms_model.n_features_in_)
                
                logger.info("Successfully loaded SMS model and vectorizer.")
            else:
                logger.warning(f"SMS model or vectorizer not found at {sms_model_path} or {sms_vec_path}")
                
        except Exception as e:
            logger.error(f"Error loading models: {e}")

    def predict_url(self, url: str) -> dict:
        """
        Runs a hybrid inference pipeline for a given URL (ML + Similarity + Rules).
        """
        if not self.url_model:
            return {"error": "URL model is not loaded.", "prediction": "unknown", "confidence_score": 0.0}
            
        try:
            # 1. Feature Extraction
            features_dict = extract_url_features(url)
            feature_array = np.array(list(features_dict.values())).reshape(1, -1)
            
            # 2. Machine Learning Probability
            if hasattr(self.url_model, 'classes_'):
                print("URL Model Classes:", self.url_model.classes_)
                # Safer dynamic lookup for the phishing class (1 = phishing)
                phishing_idx = list(self.url_model.classes_).index(1)
            else:
                phishing_idx = 1 # Fallback
                
            probabilities = self.url_model.predict_proba(feature_array)[0]
            ml_prob = float(probabilities[phishing_idx])
            
            # 3. Similarity Search (Cache Layer)
            url_vector = np.array(list(features_dict.values())).reshape(1, -1).astype('float32')
            cached_result = similarity_service.find_similar("url", url_vector, threshold=3.0)
            sim_score = cached_result["confidence"] if cached_result else 0.0
            
            # 4. Rule-Based Scoring
            rule_score = compute_url_rule_score(url, features_dict)
            
            # 5. Rule Override (STRENGTHENED)
            if rule_score >= 0.7:
                return {
                    "url": url,
                    "prediction": "phishing",
                    "confidence_score": rule_score,
                    "ml_score": ml_prob,
                    "similarity_score": sim_score,
                    "rule_score": rule_score,
                    "source": "rule_override"
                }
            
            # 6. Soft Override (New)
            if rule_score >= 0.5 and ml_prob >= 0.1:
                return {
                    "url": url,
                    "prediction": "phishing",
                    "confidence_score": max(rule_score, ml_prob),
                    "ml_score": ml_prob,
                    "similarity_score": sim_score,
                    "rule_score": rule_score,
                    "source": "soft_override"
                }

            # 7. ML Override (Standard)
            if ml_prob >= 0.7:
                return {
                    "url": url,
                    "prediction": "phishing",
                    "confidence_score": ml_prob,
                    "ml_score": ml_prob,
                    "similarity_score": sim_score,
                    "rule_score": rule_score,
                    "source": "ml_override"
                }
                
            # 8. Hybrid Decision Scoring
            # Weights: 40% ML, 40% Rule, 20% Sim
            final_score = (0.40 * ml_prob) + (0.40 * rule_score) + (0.20 * sim_score)
            
            if final_score > 0.5:
                label = "phishing"
                confidence = final_score
            else:
                label = "safe"
                confidence = 1 - final_score
            
            # 8. Periodic Maintenance: Add to similarity index if it's a "firm" result
            if final_score > 0.7 or final_score < 0.3:
                similarity_service.add_prediction("url", url_vector, label, confidence)
            
            return {
                "url": url,
                "prediction": label,
                "confidence_score": confidence,
                "ml_score": ml_prob,
                "similarity_score": sim_score,
                "rule_score": rule_score,
                "source": "hybrid_intelligence"
            }
        except Exception as e:
            logger.error(f"Error predicting URL {url}: {e}")
            return {"error": str(e), "prediction": "unknown", "confidence_score": 0.0}

    def predict_sms(self, text: str) -> dict:
        """
        Runs a hybrid inference pipeline for a given SMS (ML + Similarity + Rules).
        """
        if not self.sms_model or not self.sms_vectorizer:
            return {"error": "SMS model or vectorizer is not loaded.", "prediction": "unknown", "confidence_score": 0.0}
            
        try:
            # 1. Preprocessing & Feature Extraction
            processed_text = preprocess_sms(text)
            tfidf_features = self.sms_vectorizer.transform([processed_text])
            
            keywords_dict = keyword_features(text)
            keyword_features_array = sp.csr_matrix([list(keywords_dict.values())])
            kwd_multiplied = sp.hstack([keyword_features_array, keyword_features_array, keyword_features_array])
            
            combined_features = sp.hstack([tfidf_features, kwd_multiplied])
            
            # 2. Machine Learning Probability
            if hasattr(self.sms_model, 'classes_'):
                print("SMS Model Classes:", self.sms_model.classes_)
                # Safer dynamic lookup for the phishing class (1 = phishing/spam)
                phishing_idx = list(self.sms_model.classes_).index(1)
            else:
                phishing_idx = 1 # Fallback
                
            # print("Inference feature shape:", combined_features.shape)
            probabilities = self.sms_model.predict_proba(combined_features)[0]
            ml_prob = float(probabilities[phishing_idx])
            
            # 3. Similarity Search (Cache Layer)
            sms_vector = tfidf_features.toarray().astype('float32')
            cached_result = similarity_service.find_similar("sms", sms_vector, threshold=1.0)
            sim_score = cached_result["confidence"] if cached_result else 0.0

            # 4. Rule-Based Scoring
            rule_score = compute_sms_rule_score(text)
            kwd_score = keyword_score(text)
            
            # 5. Force Override for Strong Signals
            if kwd_score > 0.6 and ml_prob > 0.1:
                return {
                    "message": text,
                    "prediction": "phishing",
                    "confidence_score": kwd_score,
                    "ml_score": ml_prob,
                    "similarity_score": sim_score,
                    "rule_score": rule_score,
                    "keyword_score": kwd_score,
                    "source": "keyword_override"
                }

            # 6. Rule Override (STRENGTHENED)
            if rule_score >= 0.7:
                return {
                    "message": text,
                    "prediction": "phishing",
                    "confidence_score": rule_score,
                    "ml_score": ml_prob,
                    "similarity_score": sim_score,
                    "rule_score": rule_score,
                    "source": "rule_override"
                }
            
            # 7. Soft Override (Combined Signals)
            if rule_score >= 0.5 and ml_prob >= 0.1:
                return {
                    "message": text,
                    "prediction": "phishing",
                    "confidence_score": max(rule_score, ml_prob),
                    "ml_score": ml_prob,
                    "similarity_score": sim_score,
                    "rule_score": rule_score,
                    "source": "soft_override"
                }

            # 8. Hybrid Decision Scoring
            # Updated weights: 55% ML, 35% Keyword, 10% Rule
            final_score = (
                0.55 * ml_prob +
                0.35 * kwd_score +
                0.10 * rule_score
            )
            
            # 9. URL Boost (Optional Upgrade)
            if "http" in text.lower() or "www" in text.lower():
                final_score += 0.1

            # 10. Action Keyword Boost
            if any(word in text.lower() for word in ["verify", "update", "confirm", "billing", "account"]):
                final_score += 0.15
            
            if final_score > THRESHOLD:
                label = "phishing"
                confidence = min(1.0, final_score)
            else:
                label = "safe"
                confidence = 1 - final_score
            
            similarity_service.add_prediction("sms", sms_vector, label, confidence)
            
            return {
                "message": text,
                "prediction": label,
                "confidence_score": confidence,
                "ml_score": ml_prob,
                "similarity_score": sim_score,
                "rule_score": rule_score,
                "source": "hybrid_intelligence"
            }
        except Exception as e:
            logger.error(f"Error predicting SMS {text}: {e}")
            return {"error": str(e), "prediction": "unknown", "confidence_score": 0.0}

# Provide a singleton instance for easy import and usage in API routes
prediction_service = PredictionService()
