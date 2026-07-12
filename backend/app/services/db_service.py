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
        self.users = None
         
        if self.uri:
            try:
                self.client = MongoClient(self.uri, serverSelectionTimeoutMS=5000)
                # Create database: cybersentinel
                self.db = self.client.cybersentinel
                # Create collections: predictions, users
                self.predictions = self.db.predictions
                self.users = self.db.users
                 
                # Add Database Indexes for performance
                self.predictions.create_index([("timestamp", -1)])
                self.predictions.create_index([("input_type", 1)])
                self.users.create_index([("email", 1)], unique=True)
                
                logger.info("MongoDB connection established and indexes created.")
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {e}")
        else:
            logger.warning("MONGO_URI not found in environment variables. Database logging disabled.")

    def log_prediction(self, input_type, data, features, label, confidence, user_id="anonymous"):
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
            "user_id": user_id,
            "input_type": input_type,
            "input": data,
            "features": feature_summary,
            "prediction": label,
            "confidence_score": float(confidence),
            "timestamp": datetime.now(timezone.utc)
        }
        
        try:
            self.predictions.insert_one(payload)
        except Exception as e:
            logger.error(f"Fault Tolerance: Skipping DB log due to error: {e}")

# Instantiate globally
db_service = DBService()
