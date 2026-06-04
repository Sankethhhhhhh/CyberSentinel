import { normalizeLabel } from "./labels";

export const calculateRisk = (data) => {
    if (!data) return 0;

    if (data.reason === "trusted_domain") return 0;

    const label = normalizeLabel(data.label);
    if (label === "unknown") return 50;

    const confidence = data.confidence ?? 0;

    return Math.round(
        label === "phishing" ? confidence * 100 : (1 - confidence) * 100
    );
};
