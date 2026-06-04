import joblib
import os
import logging
from urllib.parse import urlparse

from .feature_engineering import extract_url_features, normalize_url, url_features_to_array
from .labels import normalize_label

logger = logging.getLogger(__name__)


class URLDetector:
    """URL classifier using the same feature pipeline as training and /predict."""

    TRUSTED_DOMAINS = [
        "youtube.com",
        "google.com",
        "github.com",
        "wikipedia.org",
        "amazon.com",
        "microsoft.com",
        "apple.com",
        "facebook.com",
        "instagram.com",
        "linkedin.com",
    ]

    def __init__(self):
        self.model_path = os.path.join(
            os.path.dirname(__file__),
            "../../models/url_models/best_url_model.pkl",
        )
        self.best_model = None
        self.models_loaded = False
        self.load_models()

    def load_models(self):
        if os.path.exists(self.model_path):
            try:
                self.best_model = joblib.load(self.model_path)
                self.models_loaded = True
                logger.info("Loaded URL model from %s", self.model_path)
            except Exception as e:
                logger.error("Failed to load URL model: %s", e)
        else:
            logger.warning("URL model not found at %s", self.model_path)

    def _is_trusted_domain(self, url: str) -> bool:
        domain = urlparse(normalize_url(url)).netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return any(domain == trusted or domain.endswith("." + trusted) for trusted in self.TRUSTED_DOMAINS)

    def predict(self, url: str, skip_whois: bool = True) -> dict:
        url = normalize_url(url)

        if not self.models_loaded:
            return self._response(url, "unknown", 0.0, error="Models not loaded")

        if self._is_trusted_domain(url):
            return self._response(url, "safe", 1.0, reason="trusted_domain")

        features = extract_url_features(url, skip_whois=skip_whois)
        X = url_features_to_array(features)

        probabilities = self.best_model.predict_proba(X)[0]
        prediction_idx = int(probabilities.argmax())
        confidence = float(probabilities[prediction_idx])
        label = "phishing" if prediction_idx == 1 else "safe"

        return self._response(url, label, confidence, features_extracted=features)

    @staticmethod
    def _response(url, label, confidence, error=None, reason=None, features_extracted=None):
        label = normalize_label(label)
        payload = {
            "url": url,
            "label": label,
            "confidence": confidence,
            "prediction": label,
            "confidence_score": confidence,
        }
        if error:
            payload["error"] = error
        if reason:
            payload["reason"] = reason
        if features_extracted is not None:
            payload["features_extracted"] = features_extracted
        return payload
