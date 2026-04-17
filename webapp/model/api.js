sap.ui.define([], function () {
    "use strict";

    var API_BASE_URL = "/api";

    return {

        /**
         * Fetches available models from the LiteLLM proxy.
         * Authentication is handled server-side by the proxy middleware.
         * @returns {Promise<string[]>} Array of model IDs
         */
        fetchModels: function () {
            return fetch(API_BASE_URL + "/models")
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
         * Sends a chat completion request (non-streaming) and returns
         * the full assistant response content.
         * Authentication is handled server-side by the proxy middleware.
         * @param {Array} aMessages - Array of {role, content} message objects
         * @param {string} sModel - The model ID to use
         * @param {AbortSignal} [oAbortSignal] - Optional abort signal
         * @returns {Promise<string>} The assistant's response text
         */
        sendChat: function (aMessages, sModel, oAbortSignal) {
            return fetch(API_BASE_URL + "/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: sModel,
                    messages: aMessages,
                    stream: false,
                    temperature: 0.7,
                    max_tokens: 4096
                }),
                signal: oAbortSignal
            })
            .then(function (res) {
                if (!res.ok) {
                    return res.text().then(function (sBody) {
                        throw new Error("API error " + res.status + ": " + sBody);
                    });
                }
                return res.json();
            })
            .then(function (oData) {
                var sContent = oData.choices &&
                    oData.choices[0] &&
                    oData.choices[0].message &&
                    oData.choices[0].message.content;
                return sContent || "";
            });
        }
    };
});
