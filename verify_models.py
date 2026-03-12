import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from backend.app.services.url_detector import URLDetector
    from backend.app.services.sms_detector import SMIShingDetector
    
    print("Testing URLDetector...")
    url_detector = URLDetector()
    if url_detector.models_loaded:
        print("✅ URLDetector loaded successfully.")
    else:
        print("❌ URLDetector failed to load model.")
        
    print("\nTesting SMIShingDetector...")
    sms_detector = SMIShingDetector()
    if sms_detector.model_loaded:
        print("✅ SMIShingDetector loaded successfully.")
    else:
        print("❌ SMIShingDetector failed to load model.")

except Exception as e:
    print(f"❌ Error during verification: {e}")
    import traceback
    traceback.print_exc()
