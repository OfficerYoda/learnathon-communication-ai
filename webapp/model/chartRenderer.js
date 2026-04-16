sap.ui.define([], function () {
    "use strict";

    // Chart.js is loaded as a global via index.html <script> tag
    // Access it as window.Chart

    /**
     * Generates a unique ID for chart canvas elements.
     * @returns {string}
     */
    function _chartId() {
        return "reflect-chart-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6);
    }

    /**
     * Gets SAP theme colors from CSS custom properties.
     * @returns {object}
     */
    function _getThemeColors() {
        var oStyles = getComputedStyle(document.documentElement);
        return {
            brand: oStyles.getPropertyValue("--sapBrandColor").trim() || "#0070f2",
            positive: oStyles.getPropertyValue("--sapPositiveColor").trim() || "#30914c",
            critical: oStyles.getPropertyValue("--sapCriticalColor").trim() || "#e76500",
            negative: oStyles.getPropertyValue("--sapNegativeColor").trim() || "#bb0000",
            neutral: oStyles.getPropertyValue("--sapNeutralColor").trim() || "#556b82",
            labelColor: oStyles.getPropertyValue("--sapContent_LabelColor").trim() || "#556b82",
            titleColor: oStyles.getPropertyValue("--sapTitleColor").trim() || "#1d2d3e",
            borderColor: oStyles.getPropertyValue("--sapContent_ForegroundBorderColor").trim() || "#d9d9d9",
            listBg: oStyles.getPropertyValue("--sapList_Background").trim() || "#ffffff"
        };
    }

    /**
     * Converts any CSS color string to an rgba() string with the given alpha.
     * Uses a temporary canvas 2D context to resolve the color, which handles
     * hex, rgb, rgba, hsl, hsla, and named colors.
     * @param {string} sColor - Any valid CSS color
     * @param {number} fAlpha - Alpha value 0–1
     * @returns {string} rgba() color string
     */
    function _colorWithAlpha(sColor, fAlpha) {
        // Use an off-screen canvas to parse any CSS color into rgba components
        var oCanvas = document.createElement("canvas");
        oCanvas.width = 1;
        oCanvas.height = 1;
        var oCtx = oCanvas.getContext("2d");
        oCtx.fillStyle = sColor;
        oCtx.fillRect(0, 0, 1, 1);
        var aPixel = oCtx.getImageData(0, 0, 1, 1).data;
        return "rgba(" + aPixel[0] + "," + aPixel[1] + "," + aPixel[2] + "," + fAlpha + ")";
    }

    return {

        /**
         * Renders a radar chart data object to an HTML string with a <canvas> placeholder.
         * @param {object} oData - The parsed chart JSON
         * @returns {string} HTML string
         */
        renderRadarHtml: function (oData) {
            var sId = _chartId();
            var sJson = JSON.stringify(oData).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            var sTitle = oData.title ? '<div class="reflect-chart-title">' + oData.title + '</div>' : "";
            return '<div class="reflect-chart-container">' +
                sTitle +
                '<div class="reflect-chart-canvas-wrap">' +
                '<canvas id="' + sId + '" data-reflect-chart="' + sJson + '"></canvas>' +
                '</div></div>';
        },

        /**
         * Renders gauge bar items to an HTML string (pure HTML/CSS, no canvas).
         * @param {object} oData - The parsed chart JSON with type "gauge"
         * @returns {string} HTML string
         */
        renderGaugeHtml: function (oData) {
            var aItems = oData.items || [];
            var sTitle = oData.title ? '<div class="reflect-chart-title">' + oData.title + '</div>' : "";
            var sHtml = '<div class="reflect-gauge-container">' + sTitle;

            for (var i = 0; i < aItems.length; i++) {
                var oItem = aItems[i];
                var iValue = Math.max(0, Math.min(100, oItem.value || 0));
                var sLabel = oItem.label || "";
                var sMin = oItem.min || "Low";
                var sMax = oItem.max || "High";
                var bHasImproved = typeof oItem.improved === "number";

                sHtml += '<div class="reflect-gauge-item">';
                sHtml += '<div class="reflect-gauge-label">' + sLabel + '</div>';

                if (bHasImproved) {
                    var iImproved = Math.max(0, Math.min(100, oItem.improved));
                    // Original bar
                    sHtml += '<div class="reflect-gauge-row">';
                    sHtml += '<span class="reflect-gauge-end reflect-gauge-end-min">' + sMin + '</span>';
                    sHtml += '<div class="reflect-gauge-track">';
                    sHtml += '<div class="reflect-gauge-fill reflect-gauge-fill-original" style="width:' + iValue + '%"></div>';
                    sHtml += '</div>';
                    sHtml += '<span class="reflect-gauge-end reflect-gauge-end-max">' + sMax + '</span>';
                    sHtml += '<span class="reflect-gauge-value">' + iValue + '</span>';
                    sHtml += '</div>';
                    // Improved bar
                    sHtml += '<div class="reflect-gauge-row">';
                    sHtml += '<span class="reflect-gauge-end reflect-gauge-end-min"></span>';
                    sHtml += '<div class="reflect-gauge-track">';
                    sHtml += '<div class="reflect-gauge-fill reflect-gauge-fill-improved" style="width:' + iImproved + '%"></div>';
                    sHtml += '</div>';
                    sHtml += '<span class="reflect-gauge-end reflect-gauge-end-max"></span>';
                    sHtml += '<span class="reflect-gauge-value">' + iImproved + '</span>';
                    sHtml += '</div>';
                } else {
                    sHtml += '<div class="reflect-gauge-row">';
                    sHtml += '<span class="reflect-gauge-end reflect-gauge-end-min">' + sMin + '</span>';
                    sHtml += '<div class="reflect-gauge-track">';
                    sHtml += '<div class="reflect-gauge-fill" style="width:' + iValue + '%"></div>';
                    sHtml += '</div>';
                    sHtml += '<span class="reflect-gauge-end reflect-gauge-end-max">' + sMax + '</span>';
                    sHtml += '<span class="reflect-gauge-value">' + iValue + '</span>';
                    sHtml += '</div>';
                }

                sHtml += '</div>';
            }

            // Legend for comparison mode
            if (aItems.length > 0 && typeof aItems[0].improved === "number") {
                sHtml += '<div class="reflect-gauge-legend">';
                sHtml += '<span class="reflect-gauge-legend-item"><span class="reflect-gauge-legend-swatch reflect-gauge-legend-original"></span>Original</span>';
                sHtml += '<span class="reflect-gauge-legend-item"><span class="reflect-gauge-legend-swatch reflect-gauge-legend-improved"></span>Improved</span>';
                sHtml += '</div>';
            }

            sHtml += '</div>';
            return sHtml;
        },

        /**
         * Parses a chart code block and returns rendered HTML.
         * Returns null if the JSON is invalid (e.g., still streaming).
         * @param {string} sCode - The raw JSON string from the code block
         * @returns {string|null} HTML string or null
         */
        renderChartBlock: function (sCode) {
            try {
                var oData = JSON.parse(sCode);
                if (oData.type === "radar") {
                    return this.renderRadarHtml(oData);
                } else if (oData.type === "gauge") {
                    return this.renderGaugeHtml(oData);
                }
                return null;
            } catch (e) {
                // JSON not yet complete (still streaming) — return null
                return null;
            }
        },

        /**
         * Scans a DOM element for uninitialized chart canvases and creates
         * Chart.js instances on them. Safe to call multiple times.
         * @param {HTMLElement} oDomRef - The container element to scan
         */
        initCharts: function (oDomRef) {
            if (!oDomRef || !window.Chart) return;

            var aCanvases = oDomRef.querySelectorAll("canvas[data-reflect-chart]");
            for (var i = 0; i < aCanvases.length; i++) {
                var oCanvas = aCanvases[i];

                // Skip already-initialized canvases
                if (oCanvas.getAttribute("data-reflect-initialized")) continue;
                oCanvas.setAttribute("data-reflect-initialized", "true");

                try {
                    var sJson = oCanvas.getAttribute("data-reflect-chart");
                    var oData = JSON.parse(sJson);
                    this._createChartInstance(oCanvas, oData);
                } catch (e) {
                    console.warn("[chartRenderer] Failed to init chart:", e);
                }
            }
        },

        /**
         * Creates a Chart.js radar chart instance on a canvas element.
         * @param {HTMLCanvasElement} oCanvas
         * @param {object} oData
         */
        _createChartInstance: function (oCanvas, oData) {
            var oColors = _getThemeColors();
            var aLabels = oData.dimensions || [];
            var iMax = (oData.scale && oData.scale.max) || 100;
            var iMin = (oData.scale && oData.scale.min) || 0;

            var aColorPalette = [
                oColors.brand,
                oColors.positive,
                oColors.critical,
                oColors.negative
            ];

            var aDatasets = (oData.datasets || []).map(function (oDs, idx) {
                var sColor = aColorPalette[idx % aColorPalette.length];
                return {
                    label: oDs.label || "Series " + (idx + 1),
                    data: oDs.values || [],
                    borderColor: sColor,
                    backgroundColor: _colorWithAlpha(sColor, 0.15),
                    borderWidth: 2,
                    pointBackgroundColor: sColor,
                    pointBorderColor: oColors.listBg,
                    pointBorderWidth: 1,
                    pointRadius: 4,
                    pointHoverRadius: 6
                };
            });

            new window.Chart(oCanvas, {
                type: "radar",
                data: {
                    labels: aLabels,
                    datasets: aDatasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: aDatasets.length > 1,
                            position: "bottom",
                            labels: {
                                color: oColors.titleColor,
                                font: { family: "'72', '72full', Arial, Helvetica, sans-serif", size: 12 },
                                usePointStyle: true,
                                pointStyle: "circle"
                            }
                        },
                        tooltip: {
                            backgroundColor: oColors.titleColor,
                            titleFont: { family: "'72', '72full', Arial, Helvetica, sans-serif" },
                            bodyFont: { family: "'72', '72full', Arial, Helvetica, sans-serif" }
                        }
                    },
                    scales: {
                        r: {
                            min: iMin,
                            max: iMax,
                            beginAtZero: true,
                            ticks: {
                                stepSize: iMax <= 10 ? 1 : 20,
                                color: oColors.labelColor,
                                backdropColor: "transparent",
                                font: { family: "'72Mono', monospace", size: 10 }
                            },
                            pointLabels: {
                                color: oColors.titleColor,
                                font: { family: "'72', '72full', Arial, Helvetica, sans-serif", size: 12, weight: "600" }
                            },
                            grid: {
                                color: oColors.borderColor
                            },
                            angleLines: {
                                color: oColors.borderColor
                            }
                        }
                    }
                }
            });
        }
    };
});
