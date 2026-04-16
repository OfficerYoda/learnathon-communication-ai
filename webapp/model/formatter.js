sap.ui.define([], function () {
    "use strict";

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
                second: "2-digit",
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
         * Returns the display name from a model ID (last segment after /).
         * @param {string} sModel - Full model ID string
         * @returns {string}
         */
        modelDisplayName: function (sModel) {
            if (!sModel) return "";
            var aParts = sModel.split("/");
            return aParts[aParts.length - 1] || sModel;
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
         * Converts markdown text to HTML using a simple built-in converter.
         * Handles: headers, bold, italic, code blocks, inline code, lists,
         * blockquotes, links, tables, horizontal rules, and paragraphs.
         * @param {string} sMarkdown - The markdown text
         * @returns {string} HTML string
         */
        markdownToHtml: function (sMarkdown) {
            if (!sMarkdown) return "";

            var sHtml = sMarkdown;

            // Fenced code blocks (```lang\n...\n```)
            sHtml = sHtml.replace(/```(\w*)\n([\s\S]*?)```/g, function (match, lang, code) {
                var escaped = code
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                return '<pre class="reflect-code-block"><code>' + escaped + '</code></pre>';
            });

            // Inline code
            sHtml = sHtml.replace(/`([^`]+)`/g, '<code class="reflect-inline-code">$1</code>');

            // Tables
            sHtml = sHtml.replace(/((?:\|[^\n]+\|\n)+)/g, function (tableBlock) {
                var rows = tableBlock.trim().split("\n");
                if (rows.length < 2) return tableBlock;

                var result = '<table class="reflect-table">';

                // Header row
                var headerCells = rows[0].split("|").filter(function (c) { return c.trim() !== ""; });
                result += "<thead><tr>";
                headerCells.forEach(function (cell) {
                    result += "<th>" + cell.trim() + "</th>";
                });
                result += "</tr></thead>";

                // Skip separator row (row index 1)
                if (rows.length > 2) {
                    result += "<tbody>";
                    for (var i = 2; i < rows.length; i++) {
                        var cells = rows[i].split("|").filter(function (c) { return c.trim() !== ""; });
                        result += "<tr>";
                        cells.forEach(function (cell) {
                            result += "<td>" + cell.trim() + "</td>";
                        });
                        result += "</tr>";
                    }
                    result += "</tbody>";
                }

                result += "</table>";
                return result;
            });

            // Blockquotes
            sHtml = sHtml.replace(/^>\s*(.+)$/gm, '<blockquote class="reflect-blockquote">$1</blockquote>');
            // Merge consecutive blockquotes
            sHtml = sHtml.replace(/<\/blockquote>\n<blockquote class="reflect-blockquote">/g, "<br/>");

            // Headers (h1–h4)
            sHtml = sHtml.replace(/^#### (.+)$/gm, '<h4 class="reflect-h4">$1</h4>');
            sHtml = sHtml.replace(/^### (.+)$/gm, '<h3 class="reflect-h3">$1</h3>');
            sHtml = sHtml.replace(/^## (.+)$/gm, '<h2 class="reflect-h2">$1</h2>');
            sHtml = sHtml.replace(/^# (.+)$/gm, '<h1 class="reflect-h1">$1</h1>');

            // Horizontal rules
            sHtml = sHtml.replace(/^---+$/gm, '<hr class="reflect-hr"/>');

            // Bold + Italic
            sHtml = sHtml.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
            // Bold
            sHtml = sHtml.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
            // Italic
            sHtml = sHtml.replace(/\*(.+?)\*/g, "<em>$1</em>");

            // Unordered lists
            sHtml = sHtml.replace(/((?:^[-*]\s+.+$\n?)+)/gm, function (block) {
                var items = block.trim().split("\n");
                var list = '<ul class="reflect-ul">';
                items.forEach(function (item) {
                    list += "<li>" + item.replace(/^[-*]\s+/, "") + "</li>";
                });
                list += "</ul>";
                return list;
            });

            // Ordered lists
            sHtml = sHtml.replace(/((?:^\d+\.\s+.+$\n?)+)/gm, function (block) {
                var items = block.trim().split("\n");
                var list = '<ol class="reflect-ol">';
                items.forEach(function (item) {
                    list += "<li>" + item.replace(/^\d+\.\s+/, "") + "</li>";
                });
                list += "</ol>";
                return list;
            });

            // Links [text](url)
            sHtml = sHtml.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

            // Paragraphs: wrap remaining loose lines
            sHtml = sHtml.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p class="reflect-p">$1</p>');

            // Clean up double line breaks
            sHtml = sHtml.replace(/\n{2,}/g, "\n");

            return sHtml;
        }
    };
});
