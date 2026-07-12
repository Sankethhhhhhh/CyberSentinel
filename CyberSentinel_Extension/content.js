const DEBUG = true;

const PREFIX = "[CyberSentinel CS]";

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

// ─── Page‑level phishing warning (from background.js) ───

chrome.runtime.onMessage.addListener((request) => {
    alwaysLog("Message received from background — type:", request.type, "| full message:", JSON.stringify(request));

    if (request.type === "pageWarning") {
        alwaysLog("pageWarning received — url:", request.url, "| confidence:", request.confidence);
        showPhishingWarning(request.url, request.confidence);
    }
});

function showPhishingWarning(url, confidence) {
    if (document.getElementById("cybersentinel-shield")) {
        alwaysLog("Warning banner already exists, skipping duplicate");
        return;
    }

    alwaysLog("Showing phishing warning — URL:", url, "| Confidence:", confidence, "| Display %:", Math.round(confidence * 100));

    // 1. Red border around the whole page
    document.documentElement.style.outline = "5px solid red";
    document.documentElement.style.outlineOffset = "-5px";

    // 2. Sticky banner at the top
    const banner = document.createElement("div");
    banner.id = "cybersentinel-shield";
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
        background: linear-gradient(135deg, #dc2626, #991b1b);
        color: white; padding: 14px 20px; font-family: Arial, sans-serif;
        font-size: 14px; display: flex; align-items: center; gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4); cursor: pointer;
    `;
    banner.innerHTML = `
        <span style="font-size:22px;flex-shrink:0;">&#9888;&#65039;</span>
        <div style="flex:1;line-height:1.4;">
            <strong>Phishing Warning</strong><br>
            <span style="font-size:12px;opacity:0.9;">
                CyberSentinel detected this page as phishing (${Math.round(confidence * 100)}% confidence).
                <span style="display:block;font-size:11px;margin-top:2px;word-break:break-all;">${escapeHtml(url)}</span>
            </span>
        </div>
        <button id="cs-dismiss" style="
            background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);
            color:white;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:12px;
            flex-shrink:0;
        ">Dismiss</button>
    `;

    document.body.prepend(banner);

    // Shift page content down so the banner does not overlap
    document.body.style.marginTop = "80px";

    // Dismiss handler
    document.getElementById("cs-dismiss").addEventListener("click", (e) => {
        e.stopPropagation();
        dismissWarning();
    });

    // Click anywhere on the banner dismisses it too
    banner.addEventListener("click", (e) => {
        if (e.target === banner || e.target.closest("div")) dismissWarning();
    });

    // 3. Dim overlay behind the banner (optional subtle effect)
    const overlay = document.createElement("div");
    overlay.id = "cs-overlay";
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 2147483646; pointer-events: none;
        background: rgba(220, 38, 38, 0.06);
    `;
    document.body.prepend(overlay);
}

function dismissWarning() {
    const banner = document.getElementById("cybersentinel-shield");
    const overlay = document.getElementById("cs-overlay");
    if (banner) banner.remove();
    if (overlay) overlay.remove();
    document.body.style.marginTop = "";
    document.documentElement.style.outline = "";
    document.documentElement.style.outlineOffset = "";
    alwaysLog("Warning dismissed");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ─── Link scanning ───

let scannedLinks = new Set();
let scannedImages = new Set();

function highlightPhishing(link) {
    if (link.dataset.cybersentinelHighlighted) return;
    link.style.border = "2px solid red";
    link.style.backgroundColor = "rgba(255,0,0,0.2)";
    link.title = "Phishing Detected";
    link.dataset.cybersentinelHighlighted = "true";
    alwaysLog("Highlighted phishing link:", link.href);
}

async function scanLinks() {
    const links = document.querySelectorAll("a");
    const batch = [];

    for (const link of links) {
        if (!link.href || !link.href.startsWith("http")) continue;
        if (scannedLinks.has(link.href)) continue;
        scannedLinks.add(link.href);
        batch.push(link);
        if (batch.length >= 20) break;
    }

    if (batch.length === 0) return;

    alwaysLog("Scanning", batch.length, "links via background...");

    const results = await Promise.allSettled(
        batch.map(link =>
            chrome.runtime.sendMessage({ type: "checkPhishing", url: link.href })
                .then(res => ({ link, res }))
        )
    );

    let phishingCount = 0;
    for (const r of results) {
        if (r.status === "fulfilled" && r.value.res?.success && r.value.res.result?.isPhishing) {
            highlightPhishing(r.value.link);
            phishingCount++;
        }
    }
    alwaysLog("Link scan complete —", phishingCount, "phishing links found out of", batch.length);
}

async function scanQRImages() {
    const images = document.querySelectorAll("img");
    const batch = [];

    for (const img of images) {
        if (!img.complete || img.naturalWidth <= 0) continue;
        if (scannedImages.has(img.src)) continue;
        if (img.naturalWidth < 100 || img.naturalHeight < 100 ||
            img.naturalWidth > 2000 || img.naturalHeight > 2000) continue;
        scannedImages.add(img.src);
        batch.push(img);
        if (batch.length >= 10) break;
    }

    if (batch.length === 0) return;

    alwaysLog("Scanning", batch.length, "QR images via background...");

    for (const img of batch) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: "analyzeQR",
                imageUrl: img.src
            });

            if (response.success && response.result?.url_prediction === "phishing") {
                alwaysLog("Malicious QR detected:", img.src, "→ URL:", response.result?.extractedUrl);
                img.style.border = "3px solid red";
                img.style.boxShadow = "0 0 5px rgba(255,0,0,0.5)";
                img.title = "Malicious QR Code Detected";
                img.dataset.cybersentinelHighlighted = "true";
            }
        } catch (err) {
            alwaysError("QR scan error:", err.message);
        }
    }
}

function startScanning() {
    alwaysLog("Starting initial scan");
    scanLinks();
    scanQRImages();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startScanning);
} else {
    startScanning();
}

const observer = new MutationObserver(() => {
    scanLinks();
    scanQRImages();
});

if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener("DOMContentLoaded", () => {
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

alwaysLog("CyberSentinel content script loaded");
