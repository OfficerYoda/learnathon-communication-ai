sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/layout/SplitterLayoutData",
    "com/reflect/app/model/api",
    "com/reflect/app/model/prompts",
    "com/reflect/app/model/formatter",
    "com/reflect/app/model/chartRenderer"
], function (Controller, JSONModel, SplitterLayoutData, Api, Prompts, formatter, chartRenderer) {
    "use strict";

    var EMAIL_MODE_ID = "email-drafting";
    var DEFAULT_MODEL = "anthropic--claude-sonnet-latest";

    // Maps dimension keys (used in MultiComboBox) to display labels (used in prompts/charts)
    var DIMENSION_LABELS = {
        "Empathy": "Empathy",
        "Clarity": "Clarity",
        "I-Language": "I-Language",
        "NeedExpression": "Need Expression",
        "ToneMatch": "Tone Match",
        "Structure": "Structure",
        "Actionability": "Actionability",
        "Conciseness": "Conciseness",
        "Assertiveness": "Assertiveness",
        "Boundaries": "Boundaries"
    };

    return Controller.extend("com.reflect.app.controller.Main", {

        formatter: formatter,

        // ─── Instance state ───
        _oAbortController: null,
        _sSystemPrompt: "",     // Shared system prompt content from _system.md
        _oChartObserver: null,  // MutationObserver for chart initialization

        // ─── Lifecycle ────────────────────────────────────────

        onInit: function () {
            var that = this;

            // Set up splitter layout data
            this._setupSplitter();

            var sPromptsPath = sap.ui.require.toUrl("com/reflect/app/prompts");

            // Load system prompt and mode prompts in parallel
            Promise.all([
                Prompts.loadSystemPrompt(sPromptsPath),
                Prompts.loadPromptModes(sPromptsPath)
            ]).then(function (aResults) {
                that._sSystemPrompt = aResults[0] || "";
                var aModes = aResults[1];

                var oConfigModel = that.getView().getModel("config");
                oConfigModel.setProperty("/modes", aModes);

                // Select first mode by default
                if (aModes.length > 0) {
                    oConfigModel.setProperty("/activeModeId", aModes[0].id);
                    oConfigModel.setProperty("/activeMode", aModes[0]);
                    oConfigModel.setProperty("/isEmailMode", aModes[0].id === EMAIL_MODE_ID);
                    that._selectModeInList(aModes[0].id);
                }

                // Set the fixed model
                oConfigModel.setProperty("/selectedModel", DEFAULT_MODEL);
            });

            // Handle Enter key in the chat input
            this._attachInputKeyHandler();

            // Set up MutationObserver for chart rendering
            this._setupChartObserver();
        },

        onExit: function () {
            if (this._oChartObserver) {
                this._oChartObserver.disconnect();
                this._oChartObserver = null;
            }
        },

        // ─── Setup ────────────────────────────────────────────

        _setupSplitter: function () {
            var that = this;
            this.getView().addEventDelegate({
                onAfterRendering: function () {
                    var oSplitter = that.byId("mainSplitter");
                    if (oSplitter) {
                        var aAreas = oSplitter.getContentAreas();
                        if (aAreas.length >= 2) {
                            aAreas[0].setLayoutData(new SplitterLayoutData({
                                size: "auto",
                                minSize: 200
                            }));
                            aAreas[1].setLayoutData(new SplitterLayoutData({
                                size: "auto",
                                minSize: 400
                            }));
                        }
                    }
                }
            });
        },

        _setupChartObserver: function () {
            var that = this;
            // Defer to ensure DOM is available
            setTimeout(function () {
                var oScroll = that.byId("messagesScroll");
                if (!oScroll) return;

                var oDom = oScroll.getDomRef();
                if (!oDom) {
                    // View not yet rendered, try again later
                    that.getView().addEventDelegate({
                        onAfterRendering: function () {
                            that._startChartObserver();
                        }
                    });
                    return;
                }
                that._startChartObserver();
            }, 1000);
        },

        _startChartObserver: function () {
            if (this._oChartObserver) return; // Already set up

            var oScroll = this.byId("messagesScroll");
            if (!oScroll || !oScroll.getDomRef()) return;

            var oDom = oScroll.getDomRef();

            this._oChartObserver = new MutationObserver(function () {
                chartRenderer.initCharts(oDom);
            });

            this._oChartObserver.observe(oDom, {
                childList: true,
                subtree: true
            });
        },

        _selectModeInList: function (sModeId) {
            var oList = this.byId("modesList");
            if (!oList) return;

            var aItems = oList.getItems();
            for (var i = 0; i < aItems.length; i++) {
                var oData = aItems[i].getCustomData();
                for (var j = 0; j < oData.length; j++) {
                    if (oData[j].getKey() === "modeId" && oData[j].getValue() === sModeId) {
                        oList.setSelectedItem(aItems[i]);
                        return;
                    }
                }
            }
        },

        _attachInputKeyHandler: function () {
            var that = this;
            setTimeout(function () {
                var oInput = that.byId("chatInput");
                if (oInput) {
                    oInput.addEventDelegate({
                        onkeydown: function (oEvent) {
                            if (oEvent.key === "Enter" && !oEvent.shiftKey) {
                                oEvent.preventDefault();
                                that.onSendMessage();
                            }
                        }
                    });
                }
            }, 500);
        },

        // ─── Event Handlers ───────────────────────────────────

        onModeChange: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var aCustomData = oItem.getCustomData();
            var sModeId = "";

            for (var i = 0; i < aCustomData.length; i++) {
                if (aCustomData[i].getKey() === "modeId") {
                    sModeId = aCustomData[i].getValue();
                    break;
                }
            }

            if (!sModeId) return;

            var oConfigModel = this.getView().getModel("config");
            var aModes = oConfigModel.getProperty("/modes");
            var oMode = null;

            for (var j = 0; j < aModes.length; j++) {
                if (aModes[j].id === sModeId) {
                    oMode = aModes[j];
                    break;
                }
            }

            oConfigModel.setProperty("/activeModeId", sModeId);
            oConfigModel.setProperty("/activeMode", oMode);
            oConfigModel.setProperty("/isEmailMode", sModeId === EMAIL_MODE_ID);

            this._clearChat();
        },

        onToneSelectionChange: function (oEvent) {
            var oMultiCombo = oEvent.getSource();
            var aSelectedKeys = oMultiCombo.getSelectedKeys();
            this.getView().getModel("config").setProperty("/selectedTones", aSelectedKeys);
        },

        onDimensionSelectionChange: function (oEvent) {
            var oMultiCombo = oEvent.getSource();
            var aSelectedKeys = oMultiCombo.getSelectedKeys();
            this.getView().getModel("config").setProperty("/selectedDimensions", aSelectedKeys);
        },

        onToggleSidebar: function () {
            var oToolPage = this.byId("mainToolPage");
            oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        },

        onClearChat: function () {
            this._clearChat();
        },

        onInputChange: function (oEvent) {
            var sValue = oEvent.getParameter("value") || "";
            this.getView().getModel("chat").setProperty("/input", sValue);
        },

        onSendMessage: function () {
            var oChatModel = this.getView().getModel("chat");
            var sInput = (oChatModel.getProperty("/input") || "").trim();

            if (!sInput || oChatModel.getProperty("/isLoading")) return;

            this._sendMessage(sInput);
        },

        onStopStreaming: function () {
            if (this._oAbortController) {
                this._oAbortController.abort();
                this._oAbortController = null;
            }
        },

        // ─── Formatters (used from view) ──────────────────────

        formatCharCount: function (sInput) {
            var iLen = (sInput || "").length;
            return iLen + " chars";
        },

        formatInputPlaceholder: function (sModeTitle) {
            if (sModeTitle) {
                return "Message...";
            }
            return "Type your message...";
        },

        formatEmptyTitle: function (sModeTitle) {
            return sModeTitle || "Reflect \u2014 Communication Workspace";
        },

        formatEmptyDesc: function (sDesc) {
            return sDesc || "Select a module from the sidebar to begin a structured self-reflection session.";
        },

        formatEmptyStateMeta: function () {
            var sTime = formatter.formatTimestamp(new Date().toISOString());
            return "Session: " + sTime;
        },

        // ─── Core Chat Logic ──────────────────────────────────

        _buildSystemMessage: function () {
            var oConfigModel = this.getView().getModel("config");
            var oMode = oConfigModel.getProperty("/activeMode");
            var sRelationship = (oConfigModel.getProperty("/relationship") || "").trim();
            var sSituation = (oConfigModel.getProperty("/situation") || "").trim();
            var aSelectedTones = oConfigModel.getProperty("/selectedTones") || [];
            var aSelectedDimensions = oConfigModel.getProperty("/selectedDimensions") || [];
            var bIsEmailMode = oConfigModel.getProperty("/isEmailMode");

            // Start with the shared system prompt (chart tool docs)
            var sPrompt = this._sSystemPrompt;

            // Append the mode-specific prompt
            if (oMode && oMode.content) {
                sPrompt += "\n\n" + oMode.content;
            }

            // Inject selected analysis dimensions (applies to all modes)
            if (aSelectedDimensions.length > 0) {
                var aDimensionNames = [];
                for (var i = 0; i < aSelectedDimensions.length; i++) {
                    aDimensionNames.push(DIMENSION_LABELS[aSelectedDimensions[i]] || aSelectedDimensions[i]);
                }
                sPrompt += "\n\n## Current Context \u2014 Analysis Dimensions\n" +
                    "Use ONLY the following dimensions for all scoring, analysis tables, and radar charts: " +
                    aDimensionNames.join(", ") + ".\n" +
                    "Each dimension is scored 0\u2013100. Do NOT add, remove, or rename any dimensions \u2014 use exactly these in the order listed.";
            }

            if (sRelationship) {
                sPrompt += "\n\n## Current Context \u2014 Relationship\nThe user's relationship with the other party: " + sRelationship;
            }

            if (sSituation) {
                sPrompt += "\n\n## Current Context \u2014 Situation\n" + sSituation;
            }

            if (bIsEmailMode && aSelectedTones.length > 0) {
                sPrompt += "\n\n## Current Context \u2014 Desired Tone\nThe user wants the email to convey the following tone(s): " +
                    aSelectedTones.join(", ") +
                    ". Ensure the drafted or overhauled email reflects these tonal qualities.";
            }

            if (bIsEmailMode && oConfigModel.getProperty("/emailImproveOnly")) {
                sPrompt += "\n\n## Output Mode — Improve Only\n" +
                    "Do NOT analyze the email. Do NOT produce any scoring, charts, radar charts, gauge bars, commentary, or explanations. " +
                    "Return ONLY the improved email text — nothing before it, nothing after it.";
            }

            return sPrompt;
        },

        _sendMessage: function (sContent) {
            var that = this;
            var oChatModel = this.getView().getModel("chat");
            var oConfigModel = this.getView().getModel("config");

            var sModel = oConfigModel.getProperty("/selectedModel");
            var aMessages = oChatModel.getProperty("/messages") || [];

            var oUserMsg = {
                id: this._generateId(),
                role: "user",
                content: sContent,
                contentHtml: "",
                timestamp: new Date().toISOString(),
                isLoading: false
            };

            // Placeholder assistant message (shows "generating" state)
            var oAssistantMsg = {
                id: this._generateId(),
                role: "assistant",
                content: "",
                contentHtml: "",
                timestamp: new Date().toISOString(),
                isLoading: true
            };

            // Build API messages
            var aApiMessages = [
                { role: "system", content: this._buildSystemMessage() }
            ];

            for (var i = 0; i < aMessages.length; i++) {
                aApiMessages.push({
                    role: aMessages[i].role,
                    content: aMessages[i].content
                });
            }

            aApiMessages.push({ role: "user", content: sContent });

            // Add user message + placeholder assistant message
            var aNewMessages = aMessages.concat([oUserMsg, oAssistantMsg]);
            var iAssistantIdx = aNewMessages.length - 1;

            oChatModel.setProperty("/messages", aNewMessages);
            oChatModel.setProperty("/hasMessages", true);
            oChatModel.setProperty("/isLoading", true);
            oChatModel.setProperty("/input", "");

            var oInput = this.byId("chatInput");
            if (oInput) {
                oInput.setValue("");
            }

            this._scrollToBottom();
            this._startChartObserver();

            this._oAbortController = new AbortController();

            // Send non-streaming request, update placeholder on completion
            Api.sendChat(aApiMessages, sModel, this._oAbortController.signal)
                .then(function (sResponse) {
                    var sHtml = formatter.markdownToHtml(sResponse);
                    var sBasePath = "/messages/" + iAssistantIdx;

                    oChatModel.setProperty(sBasePath + "/content", sResponse);
                    oChatModel.setProperty(sBasePath + "/contentHtml",
                        '<div class="reflect-markdown-body">' + sHtml + '</div>');
                    oChatModel.setProperty(sBasePath + "/isLoading", false);
                    oChatModel.setProperty("/isLoading", false);
                    that._oAbortController = null;
                    that._scrollToBottom();

                    // Initialize any charts in the response and attach
                    // toggle listeners for charts inside collapsed analysis sections
                    setTimeout(function () {
                        var oScroll = that.byId("messagesScroll");
                        if (oScroll && oScroll.getDomRef()) {
                            chartRenderer.initCharts(oScroll.getDomRef());
                            that._attachAnalysisToggleListeners(oScroll.getDomRef());
                        }
                    }, 150);
                })
                .catch(function (err) {
                    var sBasePath = "/messages/" + iAssistantIdx;

                    if (err.name === "AbortError") {
                        // Remove the placeholder on abort
                        var aCurrent = oChatModel.getProperty("/messages");
                        aCurrent.splice(iAssistantIdx, 1);
                        oChatModel.setProperty("/messages", aCurrent);
                        oChatModel.setProperty("/isLoading", false);
                        that._oAbortController = null;
                        return;
                    }

                    var sErrHtml = '<div class="reflect-markdown-body"><p>Error: ' +
                        err.message.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</p></div>';

                    oChatModel.setProperty(sBasePath + "/content", "Error: " + err.message);
                    oChatModel.setProperty(sBasePath + "/contentHtml", sErrHtml);
                    oChatModel.setProperty(sBasePath + "/isLoading", false);
                    oChatModel.setProperty("/isLoading", false);
                    that._oAbortController = null;
                });
        },

        _clearChat: function () {
            this.onStopStreaming();
            var oChatModel = this.getView().getModel("chat");
            oChatModel.setProperty("/messages", []);
            oChatModel.setProperty("/hasMessages", false);
            oChatModel.setProperty("/isLoading", false);
            oChatModel.setProperty("/input", "");
        },

        _scrollToBottom: function () {
            var that = this;
            setTimeout(function () {
                var oScroll = that.byId("messagesScroll");
                if (oScroll && oScroll.getDomRef()) {
                    var oDom = oScroll.getDomRef();
                    oDom.scrollTop = oDom.scrollHeight;
                }
            }, 50);
        },

        _generateId: function () {
            return "msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        },

        /**
         * Attaches a one-time toggle event listener on any <details> elements
         * with class "reflect-analysis-details" that haven't been wired up yet.
         * When the user expands the analysis section, Chart.js canvases inside
         * it are initialized (they can't render while hidden).
         * @param {HTMLElement} oDomRef - Container to scan for <details> elements
         */
        _attachAnalysisToggleListeners: function (oDomRef) {
            if (!oDomRef) return;

            var aDetails = oDomRef.querySelectorAll(".reflect-analysis-details");
            for (var i = 0; i < aDetails.length; i++) {
                var oDetails = aDetails[i];

                // Skip already-wired elements
                if (oDetails.getAttribute("data-reflect-toggle-bound")) continue;
                oDetails.setAttribute("data-reflect-toggle-bound", "true");

                oDetails.addEventListener("toggle", function () {
                    if (this.open) {
                        // Small delay to let the browser lay out the now-visible content
                        setTimeout(function () {
                            chartRenderer.initCharts(this);
                        }.bind(this), 50);
                    }
                });
            }
        }
    });
});
