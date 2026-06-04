import joblib
import logging
import os

import numpy as np
from sklearn.pipeline import Pipeline

from .feature_engineering import preprocess_sms
from .labels import normalize_label

logger = logging.getLogger(__name__)


class SMIShingDetector:
    """
    SMS/smishing detector.

    Production artifact (train_sms_model.py):
        sklearn.pipeline.Pipeline with SMSPipelineTransformer + classifier.
        Inference input: raw SMS string(s), shape (n_samples,).

    Legacy artifact (optional):
        sms.model.pkl + vectorizer.pkl

    NOT supported via best_sms_pipeline.pkl:
        Bare matrix classifiers from model_pipeline.py (e.g. LGBMClassifier).
    """

    def __init__(self):
        self.model_dir = os.path.join(os.path.dirname(__file__), "../../models/sms_model")
        self.pipeline_path = os.path.join(self.model_dir, "best_sms_pipeline.pkl")
        self.model_path = os.path.join(self.model_dir, "sms.model.pkl")
        self.vectorizer_path = os.path.join(self.model_dir, "vectorizer.pkl")

        self.text_pipeline: Pipeline | None = None
        self.model = None
        self.vectorizer = None
        self.model_loaded = False
        self._load_artifacts()

    def _load_artifacts(self):
        if os.path.exists(self.pipeline_path):
            try:
                artifact = joblib.load(self.pipeline_path)
                if isinstance(artifact, Pipeline):
                    self.text_pipeline = artifact
                    self.model_loaded = True
                    logger.info(
                        "SMS text Pipeline loaded from %s (steps=%s)",
                        self.pipeline_path,
                        [name for name, _ in artifact.steps],
                    )
                    return
                logger.error(
                    "best_sms_pipeline.pkl is %s, not a sklearn Pipeline. "
                    "It was likely created by training/model_pipeline.py (matrix features only). "
                    "Run: python training/train_sms_model.py",
                    type(artifact).__name__,
                )
            except Exception as e:
                logger.error("Error loading %s: %s", self.pipeline_path, e)

        if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
            try:
                self.model = joblib.load(self.model_path)
                self.vectorizer = joblib.load(self.vectorizer_path)
                self.model_loaded = True
                logger.info("Legacy SMS model loaded from %s", self.model_dir)
            except Exception as e:
                logger.error("Error loading legacy SMS model: %s", e)
        else:
            logger.warning("SMS artifacts missing or incompatible under %s", self.model_dir)

    @staticmethod
    def _raw_text_batch(text: str) -> np.ndarray:
        """Match train_sms_model.py: X is a 1D array-like of strings, one sample."""
        return np.asarray([text], dtype=object)

    def predict(self, text: str) -> dict:
        if not self.model_loaded:
            return {
                "label": "unknown",
                "prediction": "unknown",
                "confidence": 0.0,
                "confidence_score": 0.0,
                "error": "Model not loaded",
            }

        otp_keywords = [
            "otp",
            "one time password",
            "verification code",
            "one-time password",
        ]
        if any(k in text.lower() for k in otp_keywords):
            return self._format("safe", 0.95, reason="otp_override")

        if self.text_pipeline is not None:
            X = self._raw_text_batch(text)
            probs = self.text_pipeline.predict_proba(X)[0]
            phishing_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
            label = "phishing" if phishing_prob > 0.35 else "safe"
            confidence = phishing_prob if label == "phishing" else 1.0 - phishing_prob
            return self._format(label, confidence)

        processed_text = preprocess_sms(text)
        vectorized = self.vectorizer.transform([processed_text])
        probs = self.model.predict_proba(vectorized)[0]
        phishing_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
        label = "phishing" if phishing_prob > 0.35 else "safe"
        confidence = phishing_prob if label == "phishing" else 1.0 - phishing_prob
        return self._format(label, confidence)

    def _format(self, label, confidence, reason=None):
        label = normalize_label(label)
        payload = {
            "label": label,
            "prediction": label,
            "confidence": float(confidence),
            "confidence_score": float(confidence),
        }
        if reason:
            payload["reason"] = reason
        return payload
