import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import joblib
import os
import sys
import json

# Add the app directory to sys.path to import the feature extractor
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.services.url_feature_extractor import URLFeatureExtractor

def prepare_dataset(csv_path):
    """
    Loads phishing_dataset.csv and extracts features.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}. Please ensure it exists in data/processed/")

    print(f"Loading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # 2. Print class distribution
    print("\nClass Distribution:")
    print(df["label"].value_counts())
    
    # 3. Map labels: benign -> 0, phishing -> 1
    df['label_num'] = df['label'].map({'benign': 0, 'phishing': 1})
    
    print("\nExtracting features from URLs...")
    feature_list = []
    count = 0
    total = len(df)
    for url in df['url']:
        extractor = URLFeatureExtractor(url)
        feature_list.append(extractor.extract_features())
        count += 1
        if count % 10000 == 0:
            print(f"Processed {count}/{total} URLs...")
    
    X = pd.DataFrame(feature_list)
    y = df['label_num']
    return X, y

def print_training_summary(X, y, models_list):
    """
    Prints a summary of the training configuration.
    """
    print("\n" + "="*40)
    print("TRAINING CONFIGURATION SUMMARY")
    print("="*40)
    print(f"Dataset Size:    {len(X)} samples")
    print(f"Train/Test Split: 80/20 (Stratified)")
    print(f"Feature List:    {list(X.columns)}")
    print(f"Models:          {', '.join(models_list)}")
    print("="*40 + "\n")

def train_models(X, y):
    # 4. Split dataset with stratification
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    models_dir = os.path.join(os.path.dirname(__file__), '../models/url_models')
    os.makedirs(models_dir, exist_ok=True)

    models_to_train = ["Random Forest", "XGBoost", "SVM"]
    print_training_summary(X, y, models_to_train)

    results = []
    all_metrics = {}

    # 1. Random Forest
    print("\nTraining Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    metrics = evaluate_model("Random Forest", rf, X_test, y_test)
    joblib.dump(rf, os.path.join(models_dir, 'rf_url_model.pkl'))
    results.append(('rf', rf, metrics['f1']))
    all_metrics['rf'] = metrics

    # 2. XGBoost
    print("\nTraining XGBoost...")
    xgb = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42, n_jobs=-1)
    xgb.fit(X_train, y_train)
    metrics = evaluate_model("XGBoost", xgb, X_test, y_test)
    joblib.dump(xgb, os.path.join(models_dir, 'xgb_url_model.pkl'))
    results.append(('xgb', xgb, metrics['f1']))
    all_metrics['xgb'] = metrics

    # 3. SVM
    print("\nTraining SVM (using subset for speed)...")
    # SVM is O(n^2), limiting to 20k for practical training time
    if len(X_train) > 20000:
        X_train_svm, _, y_train_svm, _ = train_test_split(X_train, y_train, train_size=20000, random_state=42, stratify=y_train)
    else:
        X_train_svm, y_train_svm = X_train, y_train

    svm = SVC(probability=True, random_state=42)
    svm.fit(X_train_svm, y_train_svm)
    metrics = evaluate_model("SVM", svm, X_test, y_test)
    joblib.dump(svm, os.path.join(models_dir, 'svm_url_model.pkl'))
    results.append(('svm', svm, metrics['f1']))
    all_metrics['svm'] = metrics

    # 8. Select the best model based on F1-score
    best_model_entry = max(results, key=lambda x: x[2])
    best_model_name = best_model_entry[0]
    best_model_obj = best_model_entry[1]
    
    print(f"\nBest Model: {best_model_name} (F1-score: {best_model_entry[2]:.4f})")
    joblib.dump(best_model_obj, os.path.join(models_dir, 'best_url_model.pkl'))
    print(f"Best model saved as 'best_url_model.pkl'")

    # Save metrics to JSON
    metrics_path = os.path.join(models_dir, 'model_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(all_metrics, f, indent=4)
    print(f"Metrics saved to {metrics_path}")

def evaluate_model(name, model, X_test, y_test):
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    print(f"\n--- {name} Evaluation ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    return {
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1': float(f1),
        'confusion_matrix': cm.tolist()
    }

if __name__ == "__main__":
    dataset_path = os.path.join(os.path.dirname(__file__), '../../data/processed/phishing_dataset.csv')
    try:
        X, y = prepare_dataset(dataset_path)
        train_models(X, y)
        print("\nAll models trained and saved to backend/models/url_models/")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
