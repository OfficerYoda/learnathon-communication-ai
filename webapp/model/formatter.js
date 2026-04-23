sap.ui.define([
    "com/reflect/app/model/chartRenderer"
], function (chartRenderer) {
    "use strict";

    // marked is loaded as a global via index.html <script> tag
    // Access it as window.marked

    /**
     * Configure marked once when the module loads.
     * Uses a custom renderer to intercept ```chart code blocks.
     */
    function _initMarked() {
        if (!window.marked || window._reflectMarkedInitialized) return;
        window._reflectMarkedInitialized = true;

        var oRenderer = new window.marked.Renderer();

        // Override code block rendering to handle chart blocks
        var fnOriginalCode = oRenderer.code.bind(oRenderer);
        oRenderer.code = function (oToken) {
            if (oToken.lang === "chart") {
                var sChartHtml = chartRenderer.renderChartBlock(oToken.text);
                if (sChartHtml) {
                    return sChartHtml;
                }
                // If JSON is incomplete (streaming), render as a code block
                return '<pre class="reflect-code-block"><code>' +
                    oToken.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") +
                    '</code></pre>';
            }
            return fnOriginalCode(oToken);
        };

        window.marked.setOptions({
            renderer: oRenderer,
            gfm: true,
            breaks: false
        });
    }

    /**
     * Scans rendered HTML for the <!-- analysis-start --> marker.
     * If found, wraps everything after it in a <details>/<summary> element
     * so the analysis section is collapsed by default.
     * @param {string} sHtml - The rendered HTML string
     * @returns {string} HTML with analysis section wrapped, or unchanged if no marker
     */
    function _wrapAnalysisSection(sHtml) {
        var sMarker = "<!-- analysis-start -->";
        var iIdx = sHtml.indexOf(sMarker);

        if (iIdx === -1) {
            return sHtml;
        }

        var sBefore = sHtml.substring(0, iIdx);
        var sAfter = sHtml.substring(iIdx + sMarker.length);

        return sBefore +
            '<details class="reflect-analysis-details">' +
            '<summary class="reflect-analysis-toggle">Show analysis</summary>' +
            '<div class="reflect-analysis-content">' +
            sAfter +
            '</div></details>';
    }

    return {
        /**
         * Formats a Date to HH:MM:SS (24-hour).
         * @param {string} sTimestamp - ISO timestamp string
         * @returns {string}
         */
        formatTime: function (sTimestamp) {
            if (!sTimestamp) return "";
            var oDate = new Date(sTimestamp);
            return oDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });
        },

        /**
         * Formats a Date to "Mon DD, HH:MM" (24-hour).
         * @param {string} sTimestamp - ISO timestamp string
         * @returns {string}
         */
        formatTimestamp: function (sTimestamp) {
            if (!sTimestamp) return "";
            var oDate = new Date(sTimestamp);
            return oDate.toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });
        },

        /**
         * Returns the role label text based on role string.
         * @param {string} sRole - "user" or "assistant"
         * @returns {string}
         */
        formatRole: function (sRole) {
            return sRole === "user" ? "You" : "Assistant";
        },

        /**
         * Returns true if the role is "user".
         * @param {string} sRole
         * @returns {boolean}
         */
        isUserMessage: function (sRole) {
            return sRole === "user";
        },

        /**
         * Returns true if the role is "assistant".
         * @param {string} sRole
         * @returns {boolean}
         */
        isAssistantMessage: function (sRole) {
            return sRole === "assistant";
        },

        /**
         * Converts markdown text to HTML using marked.js with chart extensions.
         * Falls back to basic escaping if marked is not loaded.
         * If the markdown contains an <!-- analysis-start --> marker, everything
         * after it is wrapped in a collapsible <details>/<summary> element.
         * @param {string} sMarkdown - The markdown text
         * @returns {string} HTML string
         */
        markdownToHtml: function (sMarkdown) {
            if (!sMarkdown) return "";

            var sHtml;

            if (window.marked) {
                _initMarked();
                try {
                    sHtml = window.marked.parse(sMarkdown);
                } catch (e) {
                    console.warn("[formatter] marked.parse error:", e);
                }
            }

            if (!sHtml) {
                // Fallback: escape HTML and preserve line breaks
                sHtml = sMarkdown
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\n/g, "<br/>");
            }

            return _wrapAnalysisSection(sHtml);
        }
    };
});
