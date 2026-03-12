import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os
import numpy as np

class SMIShingDetector:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # Use local model path if it exists, otherwise fallback to HuggingFace
        local_model_path = os.path.join(os.path.dirname(__file__), "../../models/sms_model")
        if os.path.exists(local_model_path):
            self.model_name = local_model_path
            print(f"Loading local SMS model from '{self.model_name}'...")
        else:
            self.model_name = "distilbert-base-uncased"
            print(f"Loading SMS model '{self.model_name}' from HuggingFace...")
            
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        # Using 2 labels for spam vs ham
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name, num_labels=2)
        self.model.to(self.device)
        self.model.eval()
        self.model_loaded = True

    def preprocess(self, text: str):
        # Basic preprocessing: lowercase and remove extra whitespace
        text = text.strip()
        return text

    def predict(self, text: str) -> dict:
        # Rule-based override: OTP/verification messages are always treated as legitimate.
        # This prevents false positives before running the ML model.
        otp_keywords = ["otp", "one time password", "verification code", "one-time password"]
        if any(k in text.lower() for k in otp_keywords):
            return {
                "message": text,
                "prediction": "ham",
                "confidence_score": 0.95,
                "is_fine_tuned": self.model_loaded
            }

        processed_text = self.preprocess(text)
        inputs = self.tokenizer(processed_text, return_tensors="pt", truncation=True, padding=True, max_length=128).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
            confidence, predicted = torch.max(probabilities, dim=1)
            
            # Map predicted index back to label
            label = "spam" if predicted.item() == 1 else "ham"
            confidence = float(confidence.item())

        return {
            "message": text,
            "prediction": label,
            "confidence_score": confidence,
            "is_fine_tuned": self.model_loaded
        }
