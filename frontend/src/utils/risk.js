export const calculateRisk = (data) => {
    if (!data) return 0;

    if (data.reason === "trusted_domain") return 0;

    const confidence = data.confidence ?? 0;

    return Math.round(
        data.label === "phishing"
            ? confidence * 100
            : (1 - confidence) * 100
    );
};
