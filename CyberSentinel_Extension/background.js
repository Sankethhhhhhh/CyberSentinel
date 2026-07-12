const BACKEND = "http://127.0.0.1:8000";
const DEBUG = true;

const PREFIX = "[CyberSentinel BG]";

function log(...args) {
    if (DEBUG) console.log(PREFIX, ...args);
}

function alwaysLog(...args) {
    console.log(PREFIX, ...args);
}

function alwaysWarn(...args) {
    console.warn(PREFIX, "[WARN]", ...args);
}

function alwaysError(...args) {
    console.error(PREFIX, "[ERROR]", ...args);
}

// ─── Message handler (link & QR scanning from content script) ───

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    alwaysLog("Received message from content script:", JSON.stringify(request));

    if (request.type === "checkPhishing") {
        checkPhishingURL(request.url)
            .then(result => {
                alwaysLog("checkPhishing result for URL:", request.url, "→", JSON.stringify(result));
                sendResponse({ success: true, result });
            })
            .catch(err => {
                alwaysError("checkPhishing failed:", err.message);
                sendResponse({ success: false, error: err.message });
            });
        return true;
    }

    if (request.type === "analyzeQR") {
        analyzeQRFromUrl(request.imageUrl)
            .then(result => {
                alwaysLog("analyzeQR result for imageUrl:", request.imageUrl, "→", JSON.stringify(result));
                sendResponse({ success: true, result });
            })
            .catch(err => {
                alwaysError("analyzeQR failed:", err.message);
                sendResponse({ success: false, error: err.message });
            });
        return true;
    }
});

// ─── Page-level URL scan on every navigation ───

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") return;
    if (!tab.url || !tab.url.startsWith("http")) {
        alwaysLog("Skipping non-http tab URL:", tab.url);
        return;
    }

    alwaysLog("[STEP 1] Page loaded — tabId:", tabId, "| URL captured from Chrome tabs API:", tab.url);
    checkPageURL(tabId, tab.url);
});

async function checkPageURL(tabId, url) {
    alwaysLog("[STEP 2] checkPageURL called for tabId:", tabId, "| URL:", url);

    const result = await checkPhishingURL(url);

    alwaysLog("[STEP 4] Decision for", url, "→ isPhishing:", result.isPhishing, "| confidence:", result.confidence, "| status:", result.status);

    if (!result.isPhishing) {
        alwaysLog("[STEP 5] URL is SAFE — no warning shown for:", url);
        return;
    }

    alwaysLog("[STEP 5] PHISHING PAGE DETECTED — showing warning for:", url);

    // 1. Show browser notification
    try {
        await chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "CyberSentinel Alert",
            message: "Phishing page detected! Stay on this page only if you trust it.",
            priority: 2
        });
        alwaysLog("Browser notification sent for:", url);
    } catch (err) {
        alwaysError("Notification error:", err.message);
    }

    // 2. Tell the content script to show the warning
    try {
        await chrome.tabs.sendMessage(tabId, {
            type: "pageWarning",
            url: url,
            confidence: result.confidence
        });
        alwaysLog("pageWarning message sent to content script for tabId:", tabId);
    } catch (err) {
        alwaysError("chrome.tabs.sendMessage FAILED for tabId:", tabId, "—", err.message, "| URL:", url, "| This usually means host_permission for this URL is missing — ensure '<all_urls>' is in manifest.json host_permissions");
    }
}

// ─── Backend helpers ───

async function checkPhishingURL(url) {
    const requestBody = { url };

    alwaysLog("[STEP 3a] Sending POST to backend:");
    alwaysLog("  Endpoint:", `${BACKEND}/extension/check-url`);
    alwaysLog("  Request body:", JSON.stringify(requestBody));

    let response;
    try {
        response = await fetch(`${BACKEND}/extension/check-url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });
    } catch (err) {
        alwaysError("[STEP 3b] Network error — failed to reach backend:", err.message);
        throw err;
    }

    alwaysLog("[STEP 3b] Backend HTTP status:", response.status, response.statusText);

    if (!response.ok) {
        alwaysWarn("[STEP 3c] Backend returned error status:", response.status, "for URL:", url);
        return { status: "error", code: response.status, isPhishing: false };
    }

    let data;
    try {
        const rawText = await response.text();
        alwaysLog("[STEP 3c] Raw backend response text:", rawText);
        data = JSON.parse(rawText);
        alwaysLog("[STEP 3d] Parsed backend response:", JSON.stringify(data, null, 2));
    } catch (err) {
        alwaysError("[STEP 3c] Failed to parse backend response as JSON:", err.message);
        throw err;
    }

    // Log the specific fields we're reading
    alwaysLog("[STEP 3e] Response fields — prediction:", data.prediction, "| confidence_score:", data.confidence_score);

    const result = {
        status: "ok",
        isPhishing: data.prediction === "phishing",
        confidence: data.confidence_score || 0
    };

    alwaysLog("[STEP 3f] Parsed result:", JSON.stringify(result));

    return result;
}

async function analyzeQRFromUrl(imageUrl) {
    const requestBody = { image_url: imageUrl };
    alwaysLog("Sending QR analysis request:", JSON.stringify(requestBody));

    let response;
    try {
        response = await fetch(`${BACKEND}/extension/analyze-qr`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });
    } catch (err) {
        alwaysError("QR fetch network error:", err.message);
        throw err;
    }

    alwaysLog("QR backend HTTP status:", response.status);

    if (!response.ok) {
        alwaysWarn("QR backend error status:", response.status);
        return { status: "error", code: response.status };
    }

    let data;
    try {
        const rawText = await response.text();
        alwaysLog("Raw QR response:", rawText);
        data = JSON.parse(rawText);
    } catch (err) {
        alwaysError("Failed to parse QR response:", err.message);
        throw err;
    }

    const result = {
        status: "ok",
        extractedUrl: data.extracted_url || "",
        isPhishing: data.url_prediction === "phishing",
        confidence: data.url_confidence || 0
    };

    alwaysLog("QR analysis result parsed:", JSON.stringify(result));
    return result;
}

alwaysLog("CyberSentinel background service worker loaded");
