import joblib
import os
import numpy as np
import scipy.sparse as sp
import logging
import time
from typing import Dict, Union

# Import exact preprocessing logic from feature_engineering module 
# to ensure 100% feature match with the training pipeline
from .feature_engineering import extract_url_features, preprocess_sms, keyword_features
from .sms_detector import SMIShingDetector

logger = logging.getLogger(__name__)

# Initialize detector once
sms_detector = SMIShingDetector()

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
                    "confidence": float(res.get("confidence_score", 0.5))
                }

            except Exception as e:
                print("SMS ERROR:", str(e))
                result = {
                    "label": "safe",
                    "confidence": 0.5
                }
        else:
            return {"error": "Invalid input_type. Must be 'url' or 'sms'."}
            
        latency_ms = (time.perf_counter() - start_time) * 1000
        result['latency_ms'] = round(latency_ms, 2)
        
        return result

    def _predict_url(self, url: str) -> Dict[str, Union[str, float]]:
        if not self.url_model:
            return {"label": "unknown", "confidence": 0.0, "error": "URL model unavailable"}
            
        # 1. Feature Extraction (Guarantees exact mapping as training pipeline)
        features_dict = extract_url_features(url)
        
        # 2. Array Formatting (Dictionary insertion order preserved in Python 3.7+)
        X = np.array(list(features_dict.values())).reshape(1, -1)
        
        # 3. Model Prediction
        result = self._format_prediction(self.url_model, X)
        result["features_extracted"] = features_dict
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
