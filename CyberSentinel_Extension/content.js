console.log("CyberSentinel loaded");
console.log("jsQR type:", typeof jsQR);
console.log("Images found:", document.querySelectorAll("img").length);

const BACKEND_URL = "http://127.0.0.1:8000/predict";
const MAX_LINKS = 15;

// Cache to prevent re-scanning same URLs/QRs
const scannedUrls = new Set();
const scannedQRs = new Set();

// =========================
// URL SCANNING ENGINE
// =========================

function highlightPhishing(link) {
    link.style.border = "2px solid red";
    link.style.backgroundColor = "rgba(255,0,0,0.2)";
    link.title = "⚠️ Phishing Detected";
}

function highlightElement(el) {
    if (el.dataset.cybersentinelFlagged) return;
    el.dataset.cybersentinelFlagged = "true";

    el.style.backgroundColor = "#fff3cd";
    el.style.borderLeft = "6px solid red";
    el.style.padding = "10px";
    el.style.fontWeight = "bold";
}
function highlightSMS(detectedText) {

    const elements = document.querySelectorAll("p, div, span");

    elements.forEach(el => {

        const text = el.innerText?.trim();

        if (!text) return;

        if (
            text.includes(detectedText.substring(0, 50)) ||
            detectedText.includes(text.substring(0, 50))
        ) {

            el.style.backgroundColor = "#fff3cd";
            el.style.borderLeft = "6px solid red";
            el.style.padding = "10px";
            el.style.fontWeight = "bold";

            const warning = document.createElement("div");

            warning.innerHTML = "⚠️ CyberSentinel: Phishing SMS Detected";

            warning.style.background = "red";
            warning.style.color = "white";
            warning.style.padding = "6px";
            warning.style.marginBottom = "8px";
            warning.style.fontWeight = "bold";

            if (!el.dataset.cybersentinelFlagged) {

                el.dataset.cybersentinelFlagged = "true";

                el.insertBefore(warning, el.firstChild);
            }
        }
    });
}

function isVisible(link) {
    const rect = link.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
}

async function scanLinks() {
    const allLinks = Array.from(document.querySelectorAll("a"))
        .filter(link => link.href && link.href.startsWith("http"));

    const visibleLinks = allLinks.filter(isVisible);

    const selectedLinks = [
        ...visibleLinks.slice(0, 10),
        ...allLinks.slice(0, 20)
    ];

    const finalLinks = [
        ...new Map(selectedLinks.map(link => [link.href, link])).values()
    ];

    console.log(`Scanning ${finalLinks.length} links...`);

    for (const link of finalLinks) {

        if (scannedUrls.has(link.href)) {
            continue;
        }

        scannedUrls.add(link.href);

        try {
            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    input_type: "url",
                    data: link.href
                })
            });

            if (!response.ok) {
                continue;
            }

            const result = await response.json();

            console.log("URL Analysis:", link.href, result);

            if (result.label !== "safe") {
                highlightPhishing(link);
            }

        } catch (err) {
            console.log("Link scan error:", err);
        }
    }
}

// =========================
// QR SCANNING ENGINE
// =========================

function highlightQR(img) {

    if (img.dataset.cybersentinelFlagged === "true") {
        return;
    }

    img.dataset.cybersentinelFlagged = "true";

    img.style.border = "3px solid red";
    img.title = "⚠️ Malicious QR detected";

    const warning = document.createElement("div");
    warning.innerText = "⚠️ Malicious QR Code";

    warning.style.color = "white";
    warning.style.background = "red";
    warning.style.padding = "5px";
    warning.style.fontWeight = "bold";
    warning.style.marginBottom = "5px";

    img.parentNode.insertBefore(warning, img);
}

async function scanImageForQR(img) {
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const qrCode = jsQR(
            imageData.data,
            canvas.width,
            canvas.height
        );

        if (qrCode) {
            console.log("QR FOUND:", qrCode.data);
            return qrCode.data;
        }

        return null;

    } catch (err) {
        console.log("QR decode error:", err);
        return null;
    }
}

async function scanQRImages() {
    const images = Array.from(document.querySelectorAll("img"));

    console.log(`Scanning ${images.length} images for QR codes...`);

    for (const img of images) {

        if (img.dataset.cybersentinelScanned) {
            continue;
        }

        img.dataset.cybersentinelScanned = "true";

        if (!img.complete || img.naturalWidth === 0) {
            continue;
        }

        const qrData = await scanImageForQR(img);

        if (!qrData) {
            continue;
        }

        if (scannedQRs.has(qrData)) {
            continue;
        }

        scannedQRs.add(qrData);

        if (!qrData.startsWith("http")) {
            continue;
        }

        try {
            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    input_type: "url",
                    data: qrData
                })
            });

            if (!response.ok) {
                continue;
            }

            const result = await response.json();

            console.log("QR Analysis:", result);

            if (result.label !== "safe") {
                highlightQR(img);
            }

        } catch (err) {
            console.log("QR scan error:", err);
        }
    }
}

// =========================
// SMS SCANNING ENGINE
// =========================

async function scanSMSContent() {

    const elements = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span");

    for (const el of elements) {

        try {
            const text = (el.innerText || "").trim();

            if (!text || text.length < 30) continue;

            console.log("Scanning SMS:", text);

            // avoid re-scanning the same element
            if (el.dataset.cybersentinelScanned) continue;
            el.dataset.cybersentinelScanned = "true";

            const smsText = text.slice(0, 1000);

            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    input_type: "sms",
                    data: smsText
                })
            });

            if (!response.ok) {
                continue;
            }

            const result = await response.json();

            console.log("Result:", result);
            console.log("SMS Analysis:", result);

            if (result.label !== "safe") {
                highlightElement(el);
            }

        } catch (err) {
            console.log("SMS scan error:", err);
        }
    }
}

// =========================
// TEXT EXTRACTION ENGINE
// =========================

function extractPageText() {
    if (!document.body) {
        return [];
    }

    const text = document.body.innerText
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1000);

    return text ? [text] : [];
}

// =========================
// INITIALIZATION
// =========================

window.addEventListener("load", () => {
    scanLinks();
    scanQRImages();
    scanSMSContent();
});

setInterval(scanLinks, 5000);
setInterval(scanQRImages, 7000);