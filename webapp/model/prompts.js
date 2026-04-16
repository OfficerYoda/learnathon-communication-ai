sap.ui.define([], function () {
    "use strict";

    /**
     * Parses YAML-like frontmatter from a markdown string.
     * @param {string} sRaw - Raw markdown content with optional frontmatter
     * @returns {{ meta: object, body: string }}
     */
    function _parseFrontmatter(sRaw) {
        var oMatch = sRaw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        if (!oMatch) {
            return { meta: {}, body: sRaw };
        }

        var oMeta = {};
        var aLines = oMatch[1].split("\n");
        for (var i = 0; i < aLines.length; i++) {
            var iColon = aLines[i].indexOf(":");
            if (iColon > 0) {
                var sKey = aLines[i].slice(0, iColon).trim();
                var sValue = aLines[i].slice(iColon + 1).trim();
                oMeta[sKey] = sValue;
            }
        }
        return { meta: oMeta, body: oMatch[2] };
    }

    /**
     * Generates a title from a filename by replacing hyphens and capitalizing.
     * @param {string} sFilename - The filename without extension
     * @returns {string}
     */
    function _titleFromFilename(sFilename) {
        return sFilename
            .replace(/-/g, " ")
            .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    /**
     * Fetches a text file, returning empty string on failure.
     * @param {string} sUrl
     * @returns {Promise<string>}
     */
    function _fetchText(sUrl) {
        return fetch(sUrl)
            .then(function (res) {
                if (!res.ok) return "";
                return res.text();
            })
            .catch(function () {
                return "";
            });
    }

    // Registry of known prompt files (mode prompts only, not _system.md)
    var PROMPT_FILES = [
        "email-drafting",
        "nvc-communication"
    ];

    return {

        /**
         * Loads the shared system prompt (_system.md).
         * @param {string} sBasePath - Base path to the prompts directory
         * @returns {Promise<string>} The system prompt content (body only, no frontmatter)
         */
        loadSystemPrompt: function (sBasePath) {
            return _fetchText(sBasePath + "/_system.md").then(function (sRaw) {
                if (!sRaw) return "";
                var oResult = _parseFrontmatter(sRaw);
                return oResult.body.trim();
            });
        },

        /**
         * Loads all prompt modes from the prompts/ directory.
         * Returns a Promise that resolves to an array of prompt mode objects.
         * @param {string} sBasePath - Base path to the prompts directory
         * @returns {Promise<Array>} Array of { id, title, description, icon, content }
         */
        loadPromptModes: function (sBasePath) {
            var aPromises = PROMPT_FILES.map(function (sFile) {
                var sUrl = sBasePath + "/" + sFile + ".md";
                return _fetchText(sUrl).then(function (sRaw) {
                    if (!sRaw) return null;
                    var oResult = _parseFrontmatter(sRaw);
                    return {
                        id: sFile,
                        title: oResult.meta.title || _titleFromFilename(sFile),
                        description: oResult.meta.description || "",
                        icon: oResult.meta.icon || "\uD83D\uDCDD",
                        content: oResult.body.trim()
                    };
                });
            });

            return Promise.all(aPromises).then(function (aResults) {
                return aResults
                    .filter(function (o) { return o !== null; })
                    .sort(function (a, b) { return a.title.localeCompare(b.title); });
            });
        }
    };
});
