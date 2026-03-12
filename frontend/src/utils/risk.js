/**
 * Calculates the final risk percentage (0-100) based on the AI model's prediction.
 * @param {Object} result - The API response object from the backend.
 * @returns {number} The calculated risk percentage.
 */
export const calculateRisk = (result) => {
    if (!result) return 0;

    // 1. Trusted domains should always be 0% risk
    if (result.reason === "trusted_domain") {
        return 0;
    }

    const confidence = result.confidence_score ?? 0;

    // 2. High confidence in a threat -> High Risk
    if (result.prediction === "phishing" || result.prediction === "spam") {
        return Math.round(confidence * 100);
    }

    // 3. High confidence in benign/authentic -> Low Risk
    return Math.round((1 - confidence) * 100);
};
