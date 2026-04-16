sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/layout/SplitterLayoutData",
    "sap/ui/core/Item",
    "com/reflect/app/model/api",
    "com/reflect/app/model/prompts",
    "com/reflect/app/model/formatter"
], function (Controller, JSONModel, SplitterLayoutData, Item, Api, Prompts, formatter) {
    "use strict";

    var EMAIL_MODE_ID = "email-drafting";
    var DEFAULT_MODEL = "anthropic--claude-4-sonnet";

    return Controller.extend("com.reflect.app.controller.Main", {

        formatter: formatter,

        // ─── Abort controller for streaming ───
        _oAbortController: null,

        // ─── Lifecycle ────────────────────────────────────────

        onInit: function () {
            var that = this;

            // Set up splitter layout data
            this._setupSplitter();

            // Load prompt modes
            var sPromptsPath = sap.ui.require.toUrl("com/reflect/app/prompts");
            Prompts.loadPromptModes(sPromptsPath).then(function (aModes) {
                var oConfigModel = that.getView().getModel("config");
                oConfigModel.setProperty("/modes", aModes);

                // Select first mode by default
                if (aModes.length > 0) {
                    oConfigModel.setProperty("/activeModeId", aModes[0].id);
                    oConfigModel.setProperty("/activeMode", aModes[0]);
                    oConfigModel.setProperty("/isEmailMode", aModes[0].id === EMAIL_MODE_ID);

                    // Also set the list selection
                    that._selectModeInList(aModes[0].id);
                }
            });

            // Load available models
            Api.fetchModels().then(function (aModels) {
                var oConfigModel = that.getView().getModel("config");
                oConfigModel.setProperty("/models", aModels);
                oConfigModel.setProperty("/modelsLoading", false);

                // Set the model select items
                that._bindModelSelect(aModels);

                // Set default model
                if (aModels.length > 0) {
                    var sDefault = aModels.indexOf(DEFAULT_MODEL) !== -1 ? DEFAULT_MODEL : aModels[0];
                    oConfigModel.setProperty("/selectedModel", sDefault);
                } else {
                    oConfigModel.setProperty("/selectedModel", DEFAULT_MODEL);
                }
            });

            // Handle Enter key in the chat input
            this._attachInputKeyHandler();
        },

        // ─── Setup ────────────────────────────────────────────

        _setupSplitter: function () {
            // Configure splitter layout after rendering
            var that = this;
            this.getView().addEventDelegate({
                onAfterRendering: function () {
                    var oSplitter = that.byId("mainSplitter");
                    if (oSplitter) {
                        var aAreas = oSplitter.getContentAreas();
                        if (aAreas.length >= 2) {
                            aAreas[0].setLayoutData(new SplitterLayoutData({
                                size: "280px",
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

        _bindModelSelect: function (aModels) {
            var oSelect = this.byId("modelSelect");
            if (!oSelect) return;

            oSelect.destroyItems();
            for (var i = 0; i < aModels.length; i++) {
                oSelect.addItem(new Item({
                    key: aModels[i],
                    text: formatter.modelDisplayName(aModels[i])
                }));
            }
        },

        _selectModeInList: function (sModeId) {
            var oList = this.byId("modulesList");
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
            // Defer to ensure DOM is available
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

            // Clear chat when switching modes
            this._clearChat();
        },

        onModelChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            this.getView().getModel("config").setProperty("/selectedModel", sKey);
        },

        onToneSelectionChange: function (oEvent) {
            var oMultiCombo = oEvent.getSource();
            var aSelectedKeys = oMultiCombo.getSelectedKeys();
            this.getView().getModel("config").setProperty("/selectedTones", aSelectedKeys);
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
                return "Message \u2014 " + sModeTitle + "...";
            }
            return "Type your message...";
        },

        formatEmptyTitle: function (sModeTitle) {
            return sModeTitle || "Reflect \u2014 Communication Workspace";
        },

        formatEmptyDesc: function (sDesc) {
            return sDesc || "Select a module from the sidebar to begin a structured self-reflection session.";
        },

        formatEmptyStateMeta: function (sModel) {
            var sDisplay = formatter.modelDisplayName(sModel);
            var sTime = formatter.formatTimestamp(new Date().toISOString());
            return "Model: " + sDisplay + "  |  Session: " + sTime;
        },

        formatAssistantContent: function (sContent) {
            if (!sContent) return "<div></div>";
            var sHtml = formatter.markdownToHtml(sContent);
            return '<div class="reflect-markdown-body">' + sHtml + '</div>';
        },

        // ─── Core Chat Logic ──────────────────────────────────

        _buildSystemMessage: function () {
            var oConfigModel = this.getView().getModel("config");
            var oMode = oConfigModel.getProperty("/activeMode");
            var sRelationship = (oConfigModel.getProperty("/relationship") || "").trim();
            var sSituation = (oConfigModel.getProperty("/situation") || "").trim();
            var aSelectedTones = oConfigModel.getProperty("/selectedTones") || [];
            var bIsEmailMode = oConfigModel.getProperty("/isEmailMode");

            var sPrompt = oMode ? oMode.content : "";

            if (sRelationship) {
                sPrompt += "\n\n## Current Context — Relationship\nThe user's relationship with the other party: " + sRelationship;
            }

            if (sSituation) {
                sPrompt += "\n\n## Current Context — Situation\n" + sSituation;
            }

            if (bIsEmailMode && aSelectedTones.length > 0) {
                sPrompt += "\n\n## Current Context — Desired Tone\nThe user wants the email to convey the following tone(s): " +
                    aSelectedTones.join(", ") +
                    ". Ensure the drafted or overhauled email reflects these tonal qualities.";
            }

            return sPrompt;
        },

        _sendMessage: function (sContent) {
            var that = this;
            var oChatModel = this.getView().getModel("chat");
            var oConfigModel = this.getView().getModel("config");

            var sModel = oConfigModel.getProperty("/selectedModel");
            var aMessages = oChatModel.getProperty("/messages") || [];

            // Create user message
            var oUserMsg = {
                id: this._generateId(),
                role: "user",
                content: sContent,
                timestamp: new Date().toISOString(),
                isStreaming: false
            };

            // Create placeholder assistant message
            var oAssistantMsg = {
                id: this._generateId(),
                role: "assistant",
                content: "",
                timestamp: new Date().toISOString(),
                isStreaming: true
            };

            // Build API messages from current state BEFORE updating
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

            // Update the display
            var aNewMessages = aMessages.concat([oUserMsg, oAssistantMsg]);
            oChatModel.setProperty("/messages", aNewMessages);
            oChatModel.setProperty("/hasMessages", true);
            oChatModel.setProperty("/isLoading", true);
            oChatModel.setProperty("/input", "");

            // Reset textarea
            var oInput = this.byId("chatInput");
            if (oInput) {
                oInput.setValue("");
            }

            // Scroll to bottom
            this._scrollToBottom();

            // Create abort controller
            this._oAbortController = new AbortController();

            // Stream the response
            Api.streamChat(
                aApiMessages,
                sModel,
                {
                    onToken: function (sToken) {
                        var aCurrentMessages = oChatModel.getProperty("/messages");
                        var iLast = aCurrentMessages.length - 1;
                        if (iLast >= 0 && aCurrentMessages[iLast].role === "assistant") {
                            var sPath = "/messages/" + iLast + "/content";
                            var sCurrentContent = oChatModel.getProperty(sPath) || "";
                            oChatModel.setProperty(sPath, sCurrentContent + sToken);
                        }
                        that._scrollToBottom();
                    },
                    onDone: function () {
                        var aCurrentMessages = oChatModel.getProperty("/messages");
                        var iLast = aCurrentMessages.length - 1;
                        if (iLast >= 0 && aCurrentMessages[iLast].role === "assistant") {
                            oChatModel.setProperty("/messages/" + iLast + "/isStreaming", false);
                        }
                        oChatModel.setProperty("/isLoading", false);
                        that._oAbortController = null;
                        that._scrollToBottom();
                    },
                    onError: function (sError) {
                        var aCurrentMessages = oChatModel.getProperty("/messages");
                        var iLast = aCurrentMessages.length - 1;
                        if (iLast >= 0 && aCurrentMessages[iLast].role === "assistant") {
                            oChatModel.setProperty("/messages/" + iLast + "/content", "Error: " + sError);
                            oChatModel.setProperty("/messages/" + iLast + "/isStreaming", false);
                        }
                        oChatModel.setProperty("/isLoading", false);
                        that._oAbortController = null;
                    }
                },
                this._oAbortController.signal
            );
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
        }
    });
});
