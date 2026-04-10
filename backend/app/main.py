from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import Literal, List, Union
from app.services.url_detector import URLDetector
from app.services.qr_analyzer import QRAnalyzer
from app.services.sms_detector import SMIShingDetector
from app.services.threat_intel import ThreatIntelModule
from app.services.inference_module import inference_module
from app.services.db_service import db_service
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor
import base64
import uvicorn

app = FastAPI(title="AI Cybersecurity System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all (for dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize detectors
url_detector = URLDetector()
qr_analyzer = QRAnalyzer()
sms_detector = SMIShingDetector()
threat_intel = ThreatIntelModule()


class URLRequest(BaseModel):
    url: str


class SMSRequest(BaseModel):
    message: str


class PredictionRequest(BaseModel):
    input_type: Literal["url", "sms", "url_batch", "qr"]
    data: Union[str, List[str]]


class FeedbackRequest(BaseModel):
    data: str
    correct_label: str


class PredictionResponse(BaseModel):
    label: str
    confidence: float


@app.get("/")
async def root():
    return {"message": "AI Cybersecurity System API is running"}


@app.post("/analyze-url")
async def analyze_url(request: URLRequest):
    try:
        prediction = url_detector.predict(request.url)
        result = threat_intel.get_aggregate_score(request.url, prediction)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-qr")
async def analyze_qr(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        result = qr_analyzer.analyze(contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-sms")
async def analyze_sms(request: SMSRequest):
    try:
        result = sms_detector.predict(request.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/feedback")
async def feedback(request: FeedbackRequest, background_tasks: BackgroundTasks):
    """
    Endpoint to receive user feedback on predictions.
    Logged to MongoDB asynchronously.
    """
    try:
        background_tasks.add_task(
            db_service.log_feedback,
            data=request.data,
            correct_label=request.correct_label
        )
        return {"message": "Feedback received and logged."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
async def predict(request: PredictionRequest, background_tasks: BackgroundTasks):
    """
    Unified endpoint for phishing detection.
    Optimized for low latency inference with background DB logging (currently disabled).
    """
    try:
        if request.input_type == "url_batch":
            if not isinstance(request.data, list):
                raise HTTPException(status_code=400, detail="data must be a list for url_batch")
            
            def process_url(url):
                return inference_module.predict("url", url)

            with ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(process_url, request.data))
                
            return {"results": results}

        data_to_predict = request.data
        if request.input_type == "qr":
            # Decode base64 image data
            try:
                # Handle cases where data might have 'data:image/png;base64,' prefix
                img_data = request.data
                if isinstance(img_data, str) and "," in img_data:
                    img_data = img_data.split(",")[1]
                
                image_bytes = base64.b64decode(img_data)
                decoded_url = qr_analyzer.decode_qr(image_bytes)
                
                if not decoded_url:
                    return {"error": "No QR code could be decoded from the provided image."}
                
                # Pass decoded URL through the standard URL inference
                data_to_predict = decoded_url
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid base64/QR data: {e}")

        # Single prediction logic
        result = inference_module.predict(
            input_type="url" if request.input_type == "qr" else request.input_type,
            data=data_to_predict
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
            
        # [OPTIMIZATION] Log to MongoDB in the background disabled to reduce latency 
        # background_tasks.add_task(
        #     db_service.log_prediction,
        #     input_type=request.input_type,
        #     data=request.data,
        #     features=result.get("features_extracted", {}),
        #     label=result["label"],
        #     confidence=result["confidence"]
        # )
            
        return PredictionResponse(
            label=result["label"],
            confidence=result["confidence"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)