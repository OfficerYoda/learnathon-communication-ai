sap.ui.define([], function () {
    "use strict";

    var API_BASE_URL = "/api";

    function _getApiKey() {
        // In SAPUI5, we read the API key from a global config or URL parameter
        // For development, you can set it via URL: ?sap-ui-api-key=YOUR_KEY
        var oUriParams = new URLSearchParams(window.location.search);
        return oUriParams.get("api-key") || window.__REFLECT_API_KEY || "";
    }

    return {

        /**
         * Fetches available models from the LiteLLM proxy.
         * @returns {Promise<string[]>} Array of model IDs
         */
        fetchModels: function () {
            return fetch(API_BASE_URL + "/models", {
                headers: {
                    "Authorization": "Bearer " + _getApiKey()
                }
            })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error("Failed to fetch models: " + res.status);
                }
                return res.json();
            })
            .then(function (data) {
                return (data.data || [])
                    .map(function (m) { return m.id; })
                    .filter(function (id) { return id.indexOf("embedding") === -1; })
                    .sort();
            })
            .catch(function (err) {
                console.error("Failed to fetch models:", err);
                return [];
            });
        },

        /**
         * Streams a chat completion from the LiteLLM proxy using SSE.
         * @param {Array} aMessages - Array of {role, content} message objects
         * @param {string} sModel - The model ID to use
         * @param {object} oCallbacks - {onToken, onDone, onError} callbacks
         * @param {AbortSignal} [oAbortSignal] - Optional abort signal
         * @returns {Promise<void>}
         */
        streamChat: function (aMessages, sModel, oCallbacks, oAbortSignal) {
            return fetch(API_BASE_URL + "/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + _getApiKey()
                },
                body: JSON.stringify({
                    model: sModel,
                    messages: aMessages,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 4096
                }),
                signal: oAbortSignal
            })
            .then(function (res) {
                if (!res.ok) {
                    return res.text().then(function (sBody) {
                        oCallbacks.onError("API error " + res.status + ": " + sBody);
                    });
                }

                var oReader = res.body && res.body.getReader();
                if (!oReader) {
                    oCallbacks.onError("No response body");
                    return;
                }

                var oDecoder = new TextDecoder();
                var sBuffer = "";

                function pump() {
                    return oReader.read().then(function (result) {
                        if (result.done) {
                            oCallbacks.onDone();
                            return;
                        }

                        sBuffer += oDecoder.decode(result.value, { stream: true });
                        var aLines = sBuffer.split("\n");
                        sBuffer = aLines.pop() || "";

                        for (var i = 0; i < aLines.length; i++) {
                            var sTrimmed = aLines[i].trim();
                            if (!sTrimmed || sTrimmed.indexOf("data: ") !== 0) {
                                continue;
                            }
                            var sData = sTrimmed.slice(6);
                            if (sData === "[DONE]") {
                                oCallbacks.onDone();
                                return;
                            }

                            try {
                                var oParsed = JSON.parse(sData);
                                var sDelta = oParsed.choices &&
                                    oParsed.choices[0] &&
                                    oParsed.choices[0].delta &&
                                    oParsed.choices[0].delta.content;
                                if (sDelta) {
                                    oCallbacks.onToken(sDelta);
                                }
                            } catch (e) {
                                // skip malformed JSON chunks
                            }
                        }

                        return pump();
                    });
                }

                return pump();
            })
            .catch(function (err) {
                if (err.name === "AbortError") {
                    oCallbacks.onDone();
                } else {
                    oCallbacks.onError(err.message);
                }
            });
        }
    };
});
