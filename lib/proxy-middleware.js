import httpProxy from "http-proxy";
import fs from "fs";
import path from "path";
/**
 * Reads API_KEY from the .env file directly.
 * UI5 CLI's dotenvx doesn't populate process.env for custom middleware,
 * so we parse it ourselves.
 * @returns {string} The API key, or empty string if not found
 */
function loadApiKey() {
    try {
        var envPath = path.resolve(process.cwd(), ".env");
        var content = fs.readFileSync(envPath, "utf8");
        var lines = content.split("\n");
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.startsWith("#") || !line) continue;
            var eqIdx = line.indexOf("=");
            if (eqIdx > 0) {
                var key = line.slice(0, eqIdx).trim();
                var value = line.slice(eqIdx + 1).trim();
                if (key === "API_KEY") return value;
            }
        }
    } catch (e) {
        // .env file not found or unreadable
    }
    return "";
}

/**
 * Custom UI5 server middleware that proxies /api requests to the LiteLLM
 * backend and injects the API_KEY as a Bearer token server-side.
 *
 * The browser never sees or receives the API key.
 *
 * @param {object} parameters
 * @param {object} parameters.options - middleware options from ui5.yaml
 * @returns {function} Express-compatible middleware
 */
export default function ({ options }) {
    const baseUri = (options.configuration && options.configuration.baseUri) || "http://localhost:6655/litellm/v1";
    const apiKey = loadApiKey();

    if (!apiKey) {
        console.warn("[reflect-api-proxy] WARNING: API_KEY is not set. Create a .env file with API_KEY=your-key (see .env.example)");
    }

    const proxy = httpProxy.createProxyServer({
        target: baseUri,
        changeOrigin: true
    });

    proxy.on("error", function (err, req, res) {
        console.error("[reflect-api-proxy] Proxy error:", err.message);
        if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
        }
        res.end(JSON.stringify({ error: "Proxy error: " + err.message }));
    });

    return function (req, res, next) {
        if (!req.url.startsWith("/api")) {
            return next();
        }

        // Strip /api prefix: /api/models -> /models
        req.url = req.url.replace(/^\/api/, "") || "/";

        // Inject Authorization header server-side
        if (apiKey) {
            req.headers["authorization"] = "Bearer " + apiKey;
        }

        proxy.web(req, res);
    };
}
