import joblib
import os
import numpy as np
from urllib.parse import urlparse
from .url_feature_extractor import URLFeatureExtractor


class URLDetector:

    def __init__(self):

        self.model_path = os.path.join(
            os.path.dirname(__file__),
            "../../models/url_models/best_url_model.pkl"
        )

        self.best_model = None
        self.models_loaded = False

        # Trusted domains (reduces false positives)
        self.trusted_domains = [
            "youtube.com",
            "google.com",
            "github.com",
            "wikipedia.org",
            "amazon.com",
            "microsoft.com",
            "apple.com",
            "facebook.com",
            "instagram.com",
            "linkedin.com"
        ]

        self.load_models()

    def load_models(self):

        if os.path.exists(self.model_path):

            self.best_model = joblib.load(self.model_path)
            self.models_loaded = True

            print(f"Loaded URL model from {self.model_path}")
            return
        else:
            print(f"URL model not found at {self.model_path}. Please ensure it is in place.")

    def predict(self, url: str) -> dict:

        if not self.models_loaded:

            return {
                "url": url,
                "prediction": "unknown",
                "confidence_score": 0.0,
                "error": "Models not loaded"
            }

        # -----------------------
        # Trusted domain check
        # -----------------------
        
        url = url.strip().rstrip("/")

        domain = urlparse(url).netloc.lower()

        for trusted in self.trusted_domains:

            if domain == trusted or domain.endswith("." + trusted):

                return {
                    "url": url,
                    "prediction": "benign",
                    "confidence_score": 1.0,
                    "reason": "trusted_domain"
                }

        # -----------------------
        # Feature extraction
        # -----------------------

        extractor = URLFeatureExtractor(url)
        features = extractor.extract_features()

        feature_names = URLFeatureExtractor.get_feature_names()

        feature_values = [features[name] for name in feature_names]

        X = np.array(feature_values).reshape(1, -1)

        # -----------------------
        # Model prediction
        # -----------------------

        probabilities = self.best_model.predict_proba(X)[0]
        prediction = int(np.argmax(probabilities))
        confidence = float(np.max(probabilities))

        label = "phishing" if prediction == 1 else "benign"

        return {
            "url": url,
            "prediction": label,
            "confidence_score": confidence
        }