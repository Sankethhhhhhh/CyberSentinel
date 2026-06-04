import io
import logging
from PIL import Image
from pyzbar.pyzbar import decode

from .inference_module import inference_module
from .labels import normalize_label

logger = logging.getLogger(__name__)


class QRAnalyzer:
    """Decode QR images and classify extracted URLs via the production inference path."""

    def decode_qr(self, image_bytes) -> str:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            decoded_objs = decode(image)
            if not decoded_objs:
                return None
            return decoded_objs[0].data.decode("utf-8")
        except Exception as e:
            logger.warning("Error decoding QR: %s", e)
            return None

    def analyze(self, image_bytes) -> dict:
        extracted_url = self.decode_qr(image_bytes)
        if not extracted_url:
            return {
                "error": "No QR code detected in image",
                "label": "unknown",
                "prediction": "unknown",
                "confidence": 0.0,
                "confidence_score": 0.0,
            }

        result = inference_module.predict("url", extracted_url)
        label = normalize_label(result.get("label", "unknown"))
        confidence = float(result.get("confidence", 0.0))

        payload = {
            "extracted_url": extracted_url,
            "label": label,
            "prediction": label,
            "confidence": confidence,
            "confidence_score": confidence,
        }
        if result.get("error"):
            payload["error"] = result["error"]
        return payload
