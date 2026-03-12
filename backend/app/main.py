from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from backend.app.services.url_detector import URLDetector
from backend.app.services.qr_analyzer import QRAnalyzer
from backend.app.services.sms_detector import SMIShingDetector
from backend.app.services.threat_intel import ThreatIntelModule
import uvicorn

app = FastAPI(title="AI Cybersecurity System API")

# Initialize detectors
url_detector = URLDetector()
qr_analyzer = QRAnalyzer()
sms_detector = SMIShingDetector()
threat_intel = ThreatIntelModule()


class URLRequest(BaseModel):
    url: str


class SMSRequest(BaseModel):
    message: str


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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)