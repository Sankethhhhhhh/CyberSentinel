import pandas as pd
import numpy as np
import joblib
import warnings
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    roc_auc_score, classification_report, confusion_matrix
)
import lightgbm as lgb
import xgboost as xgb
import os
import scipy.sparse as sp
from sklearn.feature_extraction.text import TfidfVectorizer

warnings.filterwarnings('ignore')


def evaluate_model(name, model, X_test, y_test):
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else None

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='binary')
    recall = recall_score(y_test, y_pred, average='binary')
    f1 = f1_score(y_test, y_pred, average='binary')
    roc_auc = roc_auc_score(y_test, y_prob) if y_prob is not None else "N/A"

    print(f"\n{'='*40}")
    print(f"Model: {name}")
    print(f"{'='*40}")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    if roc_auc != "N/A":
        print(f"ROC-AUC:   {roc_auc:.4f}")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    return {
        "Model": name,
        "Accuracy": accuracy,
        "Precision": precision,
        "Recall": recall,
        "F1_Score": f1,
        "ROC_AUC": roc_auc if roc_auc != "N/A" else None
    }


def train_and_evaluate_pipeline(X, y, save_path="best_model.pkl"):
    print("Splitting data into 80/20 stratified train-test sets...")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    models = {
        "Logistic Regression": LogisticRegression(
            max_iter=1000, class_weight='balanced', random_state=42
        ),
        "LightGBM": lgb.LGBMClassifier(
            n_estimators=200, learning_rate=0.1, max_depth=-1,
            random_state=42, verbose=-1
        ),
        "XGBoost": xgb.XGBClassifier(
            n_estimators=200, learning_rate=0.1, max_depth=6,
            random_state=42, use_label_encoder=False, eval_metric='logloss'
        )
    }

    results = []
    trained_models = {}

    for name, model in models.items():
        print(f"\nTraining {name}...")

        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='f1')
        print(f"Mean CV F1: {cv_scores.mean():.4f}")

        model.fit(X_train, y_train)
        trained_models[name] = model

        metrics = evaluate_model(name, model, X_test, y_test)
        results.append(metrics)

    results_df = pd.DataFrame(results).sort_values(by="F1_Score", ascending=False)

    best_model_name = results_df.iloc[0]["Model"]
    best_model = trained_models[best_model_name]

    print(f"\nBest Model: {best_model_name}")
    joblib.dump(best_model, save_path)

    return best_model, results_df


if __name__ == "__main__":
    data_path = os.path.join(
        os.path.dirname(__file__),
        "../../data/processed/final_sms_dataset.csv"
    )

    print(f"Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)

    # -------- FIXED LABEL HANDLING --------
    df = df.dropna(subset=['text', 'label'])

    df['label'] = df['label'].astype(str).str.lower().str.strip()

    df['label'] = df['label'].replace({
        'ham': 0,
        'legitimate': 0,
        'safe': 0,
        'smish': 1,
        'smishing': 1,
        'spam': 1,
        'phishing': 1
    })

    df['label'] = pd.to_numeric(df['label'], errors='coerce')
    df = df.dropna(subset=['label'])
    df['label'] = df['label'].astype(int)

    print("Label distribution:")
    print(df['label'].value_counts())

    # -------- FEATURES --------
    print("Extracting features...")
    df['num_digits'] = df['text'].str.count(r'\d')
    df['has_url'] = df['text'].str.contains(r'http|www', regex=True).astype(int)
    df['length'] = df['text'].apply(len)

    # -------- TF-IDF --------
    print("Generating TF-IDF...")
    vectorizer = TfidfVectorizer(max_features=3000, ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform(df['text'])

    # -------- COMBINE FEATURES --------
    numeric_features = df[['num_digits', 'has_url', 'length']].values
    X = sp.hstack([tfidf_matrix, sp.csr_matrix(numeric_features)])
    y = df['label'].values

    # -------- TRAIN --------
    best_model, comparison_df = train_and_evaluate_pipeline(
        X, y, save_path="best_sms_pipeline.pkl"
    )