# AI-Powered Multi-Modal Detection System

This project is a full-stack AI cybersecurity system designed to detect Phishing URLs, QR Code Phishing (Quishing), and SMS Phishing (Smishing) using machine learning and deep learning.

## Project Structure

```
major/
├── backend/
│   ├── app/                # FastAPI application
│   ├── models/             # Trained ML/DL models
│   ├── training/           # Model training scripts
│   └── Dockerfile          # Backend container config
├── frontend/
│   ├── src/                # React components & logic
│   ├── tailwind.config.js  # Styling configuration
│   └── Dockerfile          # Frontend container config
└── docker-compose.yml       # Orchestration
```

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose (optional but recommended)

### Local Development (Manual)

#### 1. Backend Setup
1. Navigate to `backend/`
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Run training scripts to generate model files:
   - `python training/train_url_model.py`
   - `python training/train_qr_cnn.py`
   - `python training/train_smishing_model.py`
6. Start the server: `python app/main.py`

#### 2. Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`

### Deployment with Docker

1. Ensure you are in the root directory (`major/`).
2. Run `docker-compose up --build`.
3. The dashboard will be available at `http://localhost`.

## Modules Implemented

- **URL Detector**: Ensemble of RandomForest, XGBoost, and SVM with lexical feature extraction.
- **QR Analyzer**: Dual-pipeline (URL lexical + MobileNetV3 CNN) for Quishing detection.
- **SMS Detector**: Fine-tuned DistilBERT for Smishing classification.
- **Threat Intelligence**: Integration hooks for VirusTotal and PhishTank.

## Performance Targets
- Accuracy: >95% (on validated datasets)
- Inference Time: <100ms per request
