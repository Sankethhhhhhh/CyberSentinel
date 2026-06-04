import joblib
import os
import logging
import time
from typing import Dict, Union

from .feature_engineering import extract_url_features, normalize_url, url_features_to_array
from .labels import normalize_label
from .sms_detector import SMIShingDetector

logger = logging.getLogger(__name__)

sms_detector = SMIShingDetector()


class RealTimeInferenceModule:
    """Production inference for POST /predict (URL + SMS)."""

    def __init__(self, models_dir: str = None):
        if not models_dir:
            models_dir = os.path.join(os.path.dirname(__file__), "../../models")

        self.url_model_path = os.path.join(models_dir, "url_models/best_url_model.pkl")
        self.url_model = None
        self.load_models()

    def load_models(self):
        try:
            if os.path.exists(self.url_model_path):
                self.url_model = joblib.load(self.url_model_path)
                logger.info("Real-Time Inference: URL model loaded.")
            else:
                logger.warning("URL model missing at %s", self.url_model_path)
        except Exception as e:
            logger.error("Failed to load URL model: %s", e)

    def predict(self, input_type: str, data: str) -> Dict[str, Union[str, float]]:
        start_time = time.perf_counter()
        input_type = input_type.lower()

        if input_type == "url":
            result = self._predict_url(data)
        elif input_type == "sms":
            result = self._predict_sms(data)
        else:
            return {"error": "Invalid input_type. Must be 'url' or 'sms'."}

        latency_ms = (time.perf_counter() - start_time) * 1000
        result["latency_ms"] = round(latency_ms, 2)
        return result

    def _predict_url(self, url: str) -> Dict[str, Union[str, float]]:
        if not self.url_model:
            return {"label": "unknown", "confidence": 0.0, "error": "URL model unavailable"}

        url = normalize_url(url)
        features_dict = extract_url_features(url, skip_whois=True)
        X = url_features_to_array(features_dict)
        result = self._format_prediction(self.url_model, X)
        result["features_extracted"] = features_dict
        return result

    def _predict_sms(self, text: str) -> Dict[str, Union[str, float]]:
        try:
            res = sms_detector.predict(text)
            if res.get("error"):
                return {"label": "unknown", "confidence": 0.0, "error": res["error"]}
            return {
                "label": normalize_label(res.get("label", res.get("prediction", "safe"))),
                "confidence": float(res.get("confidence", res.get("confidence_score", 0.5))),
            }
        except Exception as e:
            logger.exception("SMS inference failed: %s", e)
            return {"label": "unknown", "confidence": 0.0, "error": str(e)}

    def _format_prediction(self, model, X, threshold: float = None) -> Dict[str, Union[str, float]]:
        import numpy as np

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

        final_label = normalize_label("phishing" if prediction_idx == 1 else "safe")
        return {"label": final_label, "confidence": round(confidence, 4)}


inference_module = RealTimeInferenceModule()
