import faiss
import numpy as np
import logging
from typing import Dict, Union, Tuple, Optional

logger = logging.getLogger(__name__)

class SimilarityService:
    def __init__(self):
        # Dimensions for URL and SMS vectors
        # URL features currently have a fixed count from URLFeatureExtractor (~15-18)
        # SMS TF-IDF vectors have many more dimensions (size of vocabulary)
        self.url_index = None
        self.sms_index = None
        
        # Mapping from FAISS index to metadata: { index: {"label": str, "confidence": float} }
        self.url_metadata = {}
        self.sms_metadata = {}
        
        # Incremental counters for mapping
        self.url_count = 0
        self.sms_count = 0

    def _init_index(self, dimension: int):
        """Initializes a FAISS IndexFlatL2 for a given dimension."""
        return faiss.IndexFlatL2(dimension)

    def add_prediction(self, input_type: str, vector: np.ndarray, label: str, confidence: float):
        """
        Adds a new prediction vector and its result to the similarity index.
        """
        try:
            # Ensure vector is 2D and float32
            vector = vector.astype('float32')
            if len(vector.shape) == 1:
                vector = vector.reshape(1, -1)
            
            dimension = vector.shape[1]
            
            if input_type == "url":
                if self.url_index is None:
                    self.url_index = self._init_index(dimension)
                self.url_index.add(vector)
                self.url_metadata[self.url_count] = {"label": label, "confidence": confidence}
                self.url_count += 1
            elif input_type == "sms":
                if self.sms_index is None:
                    self.sms_index = self._init_index(dimension)
                self.sms_index.add(vector)
                self.sms_metadata[self.sms_count] = {"label": label, "confidence": confidence}
                self.sms_count += 1
            
            logger.info(f"Added {input_type} vector to FAISS index.")
        except Exception as e:
            logger.error(f"Error adding vector to FAISS: {e}")

    def find_similar(self, input_type: str, vector: np.ndarray, threshold: float = 0.5) -> Optional[dict]:
        """
        Searches FAISS for a similar vector.
        Returns cached {label, confidence} if distance < threshold.
        """
        index = self.url_index if input_type == "url" else self.sms_index
        metadata = self.url_metadata if input_type == "url" else self.sms_metadata
        
        if index is None or index.ntotal == 0:
            return None
            
        try:
            # Ensure vector is 2D and float32
            vector = vector.astype('float32')
            if len(vector.shape) == 1:
                vector = vector.reshape(1, -1)
            
            # Search for k=1 (nearest neighbor)
            distances, indices = index.search(vector, k=1)
            
            distance = float(distances[0][0])
            idx = int(indices[0][0])
            
            if distance < threshold and idx != -1:
                logger.info(f"FAISS Match Found: {input_type} distance={distance:.4f} (threshold={threshold})")
                return metadata.get(idx)
            else:
                logger.info(f"FAISS Match Missed: {input_type} distance={distance:.4f} (threshold={threshold})")
        except Exception as e:
            logger.error(f"Error searching FAISS: {e}")
            
        return None

# Instantiate singleton
similarity_service = SimilarityService()
