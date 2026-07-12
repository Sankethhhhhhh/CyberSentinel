import io
import os
import cv2
import numpy as np
from app.services.inference_module import inference_module

class QRAnalyzer:
    def __init__(self):
        self.qr_detector = cv2.QRCodeDetector()

    def decode_qr(self, image_bytes) -> str:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return None
            
            decoded_text, points, straight_qr = self.qr_detector.detectAndDecode(image)
            
            if decoded_text is None or decoded_text == '':
                return None
            
            return decoded_text
        except Exception as e:
            print(f"Error decoding QR: {e}")
            return None

    def analyze(self, image_bytes) -> dict:
        extracted_url = self.decode_qr(image_bytes)

        if not extracted_url:
            return {
                "error": "No QR code detected in image",
                "prediction": "unknown",
                "confidence_score": 0.0
            }

        result = inference_module.predict("url", extracted_url)

        return {
            "extracted_url": extracted_url,
            "prediction": result.get("label", "unknown"),
            "confidence_score": result.get("confidence", 0.0)
        }


if __name__ == "__main__":
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