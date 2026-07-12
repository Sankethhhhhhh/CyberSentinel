import os
import hashlib
import base64
import requests
from dotenv import load_dotenv

load_dotenv()

class ThreatIntelModule:
    def __init__(self):
        self.pt_key = os.getenv("PHISHTANK_API_KEY")
        self.vt_key = os.getenv("VIRUSTOTAL_API_KEY")

    def check_phishtank(self, url):
        """Check if URL exists in PhishTank database."""
        if not self.pt_key:
            return {"is_phishing": False}
        try:
            payload = {"url": url, "format": "json", "app_key": self.pt_key}
            response = requests.post("https://checkurl.phishtank.com/checkurl/", data=payload, timeout=2.0)
            if response.status_code == 200:
                data = response.json()
                return {"is_phishing": data.get("results", {}).get("in_database", False)}
        except Exception:
            pass
        return {"is_phishing": False}

    def check_virustotal(self, url):
        """Query VirusTotal URL report via v3 API (submit + poll)."""
        if not self.vt_key:
            return {"ratio": 0.0, "scanned": False, "total": 0}
        try:
            headers = {"x-apikey": self.vt_key}

            # Step 1: Submit URL for analysis
            submit_resp = requests.post(
                "https://www.virustotal.com/api/v3/urls",
                data={"url": url},
                headers=headers,
                timeout=5.0
            )
            if submit_resp.status_code != 200:
                # Try GET by url_id as fallback (for previously scanned URLs)
                url_id = base64.urlsafe_b64encode(
                    hashlib.sha256(url.encode()).digest()
                ).decode().rstrip("=")
                report_resp = requests.get(
                    f"https://www.virustotal.com/api/v3/urls/{url_id}",
                    headers=headers,
                    timeout=5.0
                )
                if report_resp.status_code != 200:
                    return {"ratio": 0.0, "scanned": False, "total": 0}
                data = report_resp.json()
            else:
                # Step 2: Poll analysis results
                analysis_id = submit_resp.json()["data"]["id"]
                analysis_resp = requests.get(
                    f"https://www.virustotal.com/api/v3/analyses/{analysis_id}",
                    headers=headers,
                    timeout=5.0
                )
                if analysis_resp.status_code != 200:
                    return {"ratio": 0.0, "scanned": False, "total": 0}
                data = analysis_resp.json()

            stats = data.get("data", {}).get("attributes", {}).get("stats", {})
            malicious = stats.get("malicious", 0)
            suspicious = stats.get("suspicious", 0)
            total = sum(stats.values()) if stats else 0
            if total == 0:
                return {"ratio": 0.0, "scanned": False, "total": 0, "malicious": 0, "suspicious": 0}
            flagged = malicious + suspicious
            return {
                "ratio": flagged / total,
                "scanned": True,
                "total": total,
                "malicious": malicious,
                "suspicious": suspicious
            }

        except Exception:
            pass
        return {"ratio": 0.0, "scanned": False, "total": 0}

    def get_aggregate_score(self, url, ml_result):
        """Combine ML prediction with threat intelligence signals."""
        ml_score = ml_result.get("confidence_score", 0.0)
        prediction = ml_result.get("prediction", "unknown")
        
        # If both keys are missing, return ML prediction only as requested
        if not self.pt_key and not self.vt_key:
            response = {
                "url": url,
                "prediction": prediction,
                "confidence_score": ml_score,
                "intel_sources": "unavailable"
            }
            # Preserve reason field (e.g. trusted_domain) from ML result
            if "reason" in ml_result:
                response["reason"] = ml_result["reason"]
            return response

        # Normalize ML score for aggregation (if benign, threat score is low)
        threat_ml_score = ml_score if prediction == "phishing" else (1.0 - ml_score)

        pt_res = self.check_phishtank(url)
        vt_res = self.check_virustotal(url)

        # Intel Score: 50% PhishTank, 50% VirusTotal
        intel_score = (1.0 if pt_res["is_phishing"] else 0.0) * 0.5 + vt_res["ratio"] * 0.5
        
        # Aggregate logic: ML weight = 0.7, Threat intel weight = 0.3
        final_risk = (0.7 * threat_ml_score) + (0.3 * intel_score)
        
        return {
            "url": url,
            "prediction": "phishing" if final_risk > 0.5 else "benign",
            "confidence_score": ml_score,
            "phishtank_flag": pt_res["is_phishing"],
            "virustotal_ratio": vt_res["ratio"],
            "virustotal": {
                "scanned": vt_res.get("scanned", False),
                "total": vt_res.get("total", 0),
                "malicious": vt_res.get("malicious", 0),
                "suspicious": vt_res.get("suspicious", 0)
            },
            "final_risk_score": round(final_risk, 4)
        }
