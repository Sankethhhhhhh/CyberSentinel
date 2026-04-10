import os
from pymongo import MongoClient
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class DBService:
    def __init__(self):
        self.uri = os.getenv("MONGO_URI")
        self.client = None
        self.db = None
        self.predictions = None
        self.feedback = None
        
        if self.uri:
            try:
                self.client = MongoClient(self.uri, serverSelectionTimeoutMS=5000)
                # Create database: cybersentinel
                self.db = self.client.cybersentinel
                # Create collections: predictions, feedback
                self.predictions = self.db.predictions
                self.feedback = self.db.feedback
                
                # Add Database Indexes for performance
                self.predictions.create_index([("timestamp", -1)])
                self.predictions.create_index([("input_type", 1)])
                self.feedback.create_index([("timestamp", -1)])
                
                logger.info("MongoDB connection established and indexes created.")
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {e}")
        else:
            logger.warning("MONGO_URI not found in environment variables. Database logging disabled.")

    def log_prediction(self, input_type, data, features, label, confidence):
        """
        Store prediction results in the database with fault tolerance.
        """
        if self.predictions is None:
            return

        # Optimization: Ensure features is a lightweight dict summary
        # Large vectors or sparse matrices should be avoided here
        feature_summary = features
        if isinstance(features, dict) and len(features) > 20:
            # If features dict is too large, store only a count or specific metadata
            feature_summary = {"count": len(features)}

        payload = {
            "input_type": input_type,
            "data": data,
            "features": feature_summary,
            "label": label,
            "confidence": float(confidence),
            "timestamp": datetime.now(timezone.utc)
        }
        
        try:
            self.predictions.insert_one(payload)
        except Exception as e:
            logger.error(f"Fault Tolerance: Skipping DB log due to error: {e}")

    def log_feedback(self, data, correct_label):
        """
        Store user feedback in the database with fault tolerance.
        """
        if self.feedback is None:
            return

        payload = {
            "data": data,
            "correct_label": correct_label,
            "timestamp": datetime.now(timezone.utc)
        }
        
        try:
            self.feedback.insert_one(payload)
        except Exception as e:
            logger.error(f"Fault Tolerance: Skipping feedback log due to error: {e}")

# Instantiate globally
db_service = DBService()
