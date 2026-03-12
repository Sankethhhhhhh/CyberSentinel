import pandas as pd
import torch
import numpy as np
from torch.utils.data import Dataset
from transformers import (
    DistilBertTokenizer, 
    DistilBertForSequenceClassification, 
    Trainer, 
    TrainingArguments,
    EarlyStoppingCallback
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import os

class SMSDataset(Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item

    def __len__(self):
        return len(self.labels)

def compute_metrics(pred):
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='binary')
    acc = accuracy_score(labels, preds)
    return {
        'accuracy': acc,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

def train_sms_model():
    # 1. Load dataset
    csv_path = os.path.join(os.path.dirname(__file__), '../../data/processed/sms_dataset.csv')
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Please ensure it exists in data/processed/")
        return

    print(f"Loading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # 2. Convert labels: ham -> 0, spam -> 1
    df['label_num'] = df['label'].map({'ham': 0, 'spam': 1})

    # 3. Split dataset
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        df['message'].tolist(), df['label_num'].tolist(), test_size=0.2, random_state=42
    )

    # 4. Use HuggingFace Transformers
    model_name = "distilbert-base-uncased"
    tokenizer = DistilBertTokenizer.from_pretrained(model_name)

    # 5. Tokenize messages properly
    train_encodings = tokenizer(train_texts, truncation=True, padding=True, max_length=128)
    val_encodings = tokenizer(val_texts, truncation=True, padding=True, max_length=128)

    train_dataset = SMSDataset(train_encodings, train_labels)
    val_dataset = SMSDataset(val_encodings, val_labels)

    # 6. Training configuration
    training_args = TrainingArguments(
        output_dir='./results',          # temporary output folder
        num_train_epochs=3,              # 3 epochs
        per_device_train_batch_size=16,  # batch size 16
        per_device_eval_batch_size=16,
        warmup_steps=100,
        weight_decay=0.01,
        logging_dir='./logs',
        logging_steps=10,
        eval_strategy="epoch",      # evaluate at each epoch
        save_strategy="epoch",
        load_best_model_at_end=True,     # required for EarlyStopping
        metric_for_best_model='f1',
    )

    model = DistilBertForSequenceClassification.from_pretrained(model_name, num_labels=2)

    # 7. Add early stopping
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=1)]
    )

    print("Starting fine-tuning...")
    trainer.train()

    # 8. Evaluate
    print("\nFinal Evaluation Metrics:")
    eval_results = trainer.evaluate()
    for key, value in eval_results.items():
        print(f"{key}: {value:.4f}")

    # 9. Save the trained model and tokenizer
    save_path = os.path.join(os.path.dirname(__file__), '../models/sms_model')
    os.makedirs(save_path, exist_ok=True)
    
    model.save_pretrained(save_path)
    tokenizer.save_pretrained(save_path)
    print(f"Fine-tuned model and tokenizer saved to {save_path}")

if __name__ == "__main__":
    try:
        train_sms_model()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
