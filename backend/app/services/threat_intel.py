import os
import logging
import requests
from dotenv import load_dotenv

from .labels import normalize_label

load_dotenv()
logger = logging.getLogger(__name__)


class ThreatIntelModule:
    def __init__(self):
        self.pt_key = os.getenv("PHISHTANK_API_KEY")
        self.vt_key = os.getenv("VIRUSTOTAL_API_KEY")

    def check_phishtank(self, url):
        if not self.pt_key:
            return {"is_phishing": False}
        try:
            payload = {"url": url, "format": "json", "app_key": self.pt_key}
            response = requests.post(
                "https://checkurl.phishtank.com/checkurl/", data=payload, timeout=2.0
            )
            if response.status_code == 200:
                data = response.json()
                return {"is_phishing": data.get("results", {}).get("in_database", False)}
        except Exception as e:
            logger.debug("PhishTank check failed: %s", e)
        return {"is_phishing": False}

    def check_virustotal(self, url):
        if not self.vt_key:
            return {"ratio": 0.0}
        try:
            headers = {"x-apikey": self.vt_key}
            params = {"url": url}
            response = requests.get(
                "https://www.virustotal.com/api/v3/urls",
                params=params,
                headers=headers,
                timeout=2.0,
            )
            if response.status_code == 200:
                stats = response.json().get("data", {}).get("attributes", {}).get(
                    "last_analysis_stats", {}
                )
                malicious = stats.get("malicious", 0)
                total = sum(stats.values()) if stats else 1
                return {"ratio": malicious / total if total > 0 else 0.0}
        except Exception as e:
            logger.debug("VirusTotal check failed: %s", e)
        return {"ratio": 0.0}

    def get_aggregate_score(self, url, ml_result):
        label = normalize_label(
            ml_result.get("label") or ml_result.get("prediction", "unknown")
        )
        ml_score = float(
            ml_result.get("confidence")
            or ml_result.get("confidence_score", 0.0)
        )

        if not self.pt_key and not self.vt_key:
            response = {
                "url": url,
                "label": label,
                "prediction": label,
                "confidence": ml_score,
                "confidence_score": ml_score,
                "intel_sources": "unavailable",
            }
            if "reason" in ml_result:
                response["reason"] = ml_result["reason"]
            return response

        threat_ml_score = ml_score if label == "phishing" else (1.0 - ml_score)

        pt_res = self.check_phishtank(url)
        vt_res = self.check_virustotal(url)
        intel_score = (1.0 if pt_res["is_phishing"] else 0.0) * 0.5 + vt_res["ratio"] * 0.5
        final_risk = (0.7 * threat_ml_score) + (0.3 * intel_score)
        final_label = normalize_label("phishing" if final_risk > 0.5 else "safe")

        return {
            "url": url,
            "label": final_label,
            "prediction": final_label,
            "confidence": ml_score,
            "confidence_score": ml_score,
            "phishtank_flag": pt_res["is_phishing"],
            "virustotal_ratio": vt_res["ratio"],
            "final_risk_score": round(final_risk, 4),
        }
