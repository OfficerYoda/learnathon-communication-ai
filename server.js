import express from "express";
import httpProxy from "http-proxy";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadApiKey() {
    // 1. Check environment variable first (Docker)
    if (process.env.API_KEY) return process.env.API_KEY;
    // 2. Fallback: read from .env file (local dev)
    try {
        const content = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith("#") || !trimmed) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx > 0 && trimmed.slice(0, eqIdx).trim() === "API_KEY") {
                return trimmed.slice(eqIdx + 1).trim();
            }
        }
    } catch (_) {}
    return "";
}

const PORT = process.env.PORT || 8080;
const BASE_URI = process.env.LITELLM_BASE_URL || "http://localhost:6655/litellm/v1";
const apiKey = loadApiKey();

if (!apiKey) {
    console.warn("[proxy] WARNING: API_KEY is not set!");
} else {
    console.log("[proxy] API_KEY loaded, proxying /api/* to", BASE_URI);
}

const app = express();
const proxy = httpProxy.createProxyServer({ target: BASE_URI, changeOrigin: true });

proxy.on("error", (err, req, res) => {
    console.error("[proxy] error:", err.message);
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Proxy error: " + err.message }));
});

// Proxy /api/* -> LiteLLM
app.use("/api", (req, res) => {
    if (apiKey) req.headers["authorization"] = "Bearer " + apiKey;
    // Restore original URL without /api prefix for the proxy target
    req.url = req.url || "/";
    proxy.web(req, res);
});

// Serve SAPUI5 resources from ui5.sap.com (must keep full path)
const ui5Proxy = httpProxy.createProxyServer({ target: "https://ui5.sap.com", changeOrigin: true });
app.use(["/resources", "/test-resources"], (req, res, next) => {
    req.url = req.originalUrl; // restore full path e.g. /resources/sap-ui-core.js
    ui5Proxy.web(req, res);
});

// Serve static frontend
app.use(express.static(path.join(__dirname, "webapp")));

app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] Running at http://localhost:${PORT}`);
});
