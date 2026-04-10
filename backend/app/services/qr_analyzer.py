import io
import os
from PIL import Image
from pyzbar.pyzbar import decode
from app.services.url_detector import URLDetector

class QRAnalyzer:
    def __init__(self):
        self.url_detector = URLDetector()

    def decode_qr(self, image_bytes) -> str:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            decoded_objs = decode(image)
            if not decoded_objs:
                return None
            return decoded_objs[0].data.decode('utf-8')
        except Exception as e:
            print(f"Error decoding QR: {e}")
            return None

    def analyze(self, image_bytes) -> dict:
        # Step 1: Decode QR
        extracted_url = self.decode_qr(image_bytes)
        if not extracted_url:
            return {"error": "No QR code detected in image", "prediction": "unknown", "confidence_score": 0.0}

        # Step 2: Extract URL and analyze it using the URL phishing model
        url_prediction = self.url_detector.predict(extracted_url)

        return {
            "extracted_url": extracted_url,
            "prediction": url_prediction.get("prediction", "unknown"),
            "confidence_score": url_prediction.get("confidence_score", 0.0)
        }

if __name__ == "__main__":
    # Internal test when run as a module
    import sys
    
    analyzer = QRAnalyzer()
    sample_path = os.path.join('data', 'quishing_dataset', 'phishing', 'phishing_00001.png')
    
    if os.path.exists(sample_path):
        with open(sample_path, 'rb') as f:
            img_bytes = f.read()
            result = analyzer.analyze(img_bytes)
            print(result)
    else:
        print(f"Sample image not found at {sample_path}")
