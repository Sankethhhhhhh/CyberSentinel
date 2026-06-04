"""Canonical label normalization for API and client contracts."""

from typing import Optional

SAFE_LABELS = frozenset({"safe", "benign", "ham", "legitimate", "legit"})
PHISHING_LABELS = frozenset({"phishing", "spam", "malicious", "fraud"})


def normalize_label(label: Optional[str]) -> str:
    if not label:
        return "unknown"
    normalized = str(label).strip().lower()
    if normalized in SAFE_LABELS:
        return "safe"
    if normalized in PHISHING_LABELS:
        return "phishing"
    if normalized == "unknown":
        return "unknown"
    return normalized


def is_threat_label(label: Optional[str]) -> bool:
    return normalize_label(label) == "phishing"


def is_safe_label(label: Optional[str]) -> bool:
    return normalize_label(label) == "safe"
