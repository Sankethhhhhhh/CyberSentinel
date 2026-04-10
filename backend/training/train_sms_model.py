import pandas as pd
import numpy as np
import os
import sys
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix, recall_score
from sklearn.pipeline import Pipeline

# Add the app directory to sys.path to import the feature engineering module
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.services.feature_engineering import SMSPipelineTransformer

def train_sms_model():
    # 1. Load dataset
    csv_path = os.path.join(os.path.dirname(__file__), '../../data/processed/sms_dataset.csv')
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Please ensure it exists in data/processed/")
        return

    print(f"Loading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # 2. Check Class Imbalance
    print("\n--- Class Imbalance Check ---")
    print(df['label'].value_counts())
    print("-----------------------------\n")

    # Convert labels: ham -> 0, spam -> 1
    df['label_num'] = df['label'].map({'ham': 0, 'spam': 1})
    df = df.dropna(subset=['message'])

    X = df['message'].values
    y = df['label_num'].values

    # 3. Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 4. Define and Train full Pipeline
    print("Initializing SMS Phishing Pipeline...")
    pipeline = Pipeline([
        ('transformer', SMSPipelineTransformer()),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1, class_weight="balanced"))
    ])

    print("Training the pipeline on SMS data...")
    pipeline.fit(X_train, y_train)

    # 5. Evaluate
    print("\nEvaluating model (Threshold = 0.5 default)...")
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    
    # Custom threshold evaluation (0.35)
    y_pred_tuned = (y_proba > 0.35).astype(int)
    
    print(f"Initial Accuracy (0.5): {accuracy_score(y_test, y_pred):.4f}")
    print(f"Tuned Recall (0.35): {recall_score(y_test, y_pred_tuned):.4f}")
    
    print("\nClassification Report (Tuned 0.35 Threshold):")
    print(classification_report(y_test, y_pred_tuned))

    # 6. Save the FULL pipeline
    save_path = os.path.join(os.path.dirname(__file__), '../models/sms_model')
    os.makedirs(save_path, exist_ok=True)
    
    pipeline_file = os.path.join(save_path, 'best_sms_pipeline.pkl')
    joblib.dump(pipeline, pipeline_file)
    
    # Also save the old format for backward compatibility temporarily if needed, 
    # but the user requested saving the full pipeline.
    # We'll just stick to the full pipeline as requested.

    print(f"\nSUCCESS: Full SMS pipeline saved to {pipeline_file}")
    print("This includes: Preprocessing + TF-IDF Vectorizer + RandomForestModel")

if __name__ == "__main__":
    try:
        train_sms_model()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
