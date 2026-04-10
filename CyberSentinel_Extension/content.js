const BACKEND_URL = "http://127.0.0.1:8000/predict";
const MAX_LINKS = 15;

// --- LINK SCANNING ENGINE ---

function highlightPhishing(link) {
    link.style.border = "2px solid red";
    link.style.backgroundColor = "rgba(255,0,0,0.2)";
    link.title = "⚠️ Phishing Detected";
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

    const finalLinks = [...new Map(selectedLinks.map(l => [l.href, l])).values()];

    console.log(`Scanning ${finalLinks.length} links (sequential mode)...`);

    for (let link of finalLinks) {
        try {
            const res = await fetch(BACKEND_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input_type: "url",
                    data: link.href
                })
            });

            if (!res.ok) continue;

            const data = await res.json();

            if (data.label !== "safe") {
                highlightPhishing(link);
            }

        } catch (err) {
            console.log("Link scan error:", err);
        }
    }
}

// --- QR SCANNING ENGINE ---

async function loadJsQR() {
    if (window.jsQR) return;
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr/dist/jsQR.js";
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
}

async function scanImageForQR(img) {
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = window.jsQR(imageData.data, canvas.width, canvas.height);

        return code ? code.data : null;
    } catch {
        return null;
    }
}

function highlightQR(img) {
    img.style.border = "3px solid red";
    img.title = "⚠️ Malicious QR detected";
}

async function scanQRImages() {
    await loadJsQR();

    const images = Array.from(document.querySelectorAll("img"));

    for (let img of images) {
        if (!img.complete) continue;

        const qrData = await scanImageForQR(img);

        if (!qrData || !qrData.startsWith("http")) continue;

        try {
            const res = await fetch(BACKEND_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input_type: "url",
                    data: qrData
                })
            });

            const data = await res.json();

            if (data.label !== "safe") {
                highlightQR(img);
            }

        } catch (err) {
            console.log("QR scan error:", err);
        }
    }
}

// --- INITIALIZATION ---

window.addEventListener("load", () => {
    scanLinks();
    scanQRImages();
});

setInterval(scanLinks, 5000);
setInterval(scanQRImages, 7000);