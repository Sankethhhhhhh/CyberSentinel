const SAFE = new Set(["safe", "benign", "ham", "legitimate"]);
const PHISHING = new Set(["phishing", "spam", "malicious"]);

export const normalizeLabel = (label) => {
    const n = (label || "unknown").toString().toLowerCase();
    if (SAFE.has(n)) return "safe";
    if (PHISHING.has(n)) return "phishing";
    return n;
};

export const isThreatLabel = (label) => normalizeLabel(label) === "phishing";
