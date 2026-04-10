import joblib
import os
import numpy as np

class SMIShingDetector:
    def __init__(self):
        # Paths to Scikit-learn artifacts
        model_dir = os.path.join(os.path.dirname(__file__), "../../models/sms_model")
        self.model_path = os.path.join(model_dir, "sms.model.pkl")
        self.vectorizer_path = os.path.join(model_dir, "vectorizer.pkl")
        
        self.model = None
        self.vectorizer = None
        self.model_loaded = False

        if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
            try:
                self.model = joblib.load(self.model_path)
                self.vectorizer = joblib.load(self.vectorizer_path)
                self.model_loaded = True
                print(f"SMS Model & Vectorizer loaded from {model_dir}")
            except Exception as e:
                print(f"Error loading SMS model: {e}")
        else:
            print(f"SMS artifacts missing at {model_dir}")

    def preprocess(self, text: str):
        return text.strip().lower()

    def predict(self, text: str) -> dict:
        print("SMS INPUT:", text)
        
        if not self.model_loaded:
            return {
                "prediction": "safe",
                "confidence_score": 0.5,
                "error": "Model not loaded"
            }

        # Rule-based override: OTP/verification messages
        otp_keywords = ["otp", "one time password", "verification code", "one-time password"]
        if any(k in text.lower() for k in otp_keywords):
            return {
                "prediction": "safe",
                "confidence_score": 0.95,
                "reason": "otp_override"
            }

        processed_text = self.preprocess(text)
        
        # Vectorization & Inference
        vectorized = self.vectorizer.transform([processed_text])
        print("VECTOR SHAPE:", vectorized.shape)
        
        probs = self.model.predict_proba(vectorized)[0]
        print("PROBS:", probs)
        
        confidence_score = float(max(probs))
        prediction = "phishing" if probs[1] > 0.5 else "safe"

        return {
            "prediction": prediction,
            "confidence_score": confidence_score
        }
