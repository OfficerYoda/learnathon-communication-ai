# Reflect — Communication Self-Reflection (SAPUI5)

An AI-powered communication self-reflection tool built with SAPUI5. Analyze messages using Nonviolent Communication (NVC) principles or draft/overhaul emails with intelligent tone calibration.

## Technology Stack

- **UI Framework**: SAPUI5 1.132.0 (OpenUI5 CDN)
- **Theme**: SAP Horizon (`sap_horizon`)
- **Architecture**: MVC (Model-View-Controller)
- **Build Tool**: UI5 CLI (`@ui5/cli`)
- **Backend**: LiteLLM proxy (localhost:6655) for LLM chat streaming

## Project Structure

```
webapp/
├── Component.js              # App entry point
├── manifest.json             # Central application descriptor
├── index.html                # Bootstrap page
├── view/
│   └── Main.view.xml         # Main chat UI (XML view)
├── controller/
│   └── Main.controller.js    # Chat logic, streaming, event handlers
├── model/
│   ├── api.js                # LiteLLM API: fetchModels() + streamChat()
│   ├── prompts.js            # Loads prompt modes from markdown files
│   └── formatter.js          # View formatters (time, markdown-to-HTML)
├── i18n/
│   ├── i18n.properties       # UI text strings (default)
│   └── i18n_en.properties    # English locale
├── prompts/
│   ├── email-drafting.md     # Email Drafting & Overhaul system prompt
│   └── nvc-communication.md  # NVC Communication Analysis system prompt
└── css/
    └── style.css             # Custom styles (extends SAP Horizon)
```

## Getting Started

### Prerequisites

- Node.js 18+
- A running LiteLLM proxy at `localhost:6655`

### Install Dependencies

```bash
npm install
```

### API Key Setup

Copy the example env file and add your API key:

```bash
cp .env.example .env
```

Then edit `.env`:

```
API_KEY=your-actual-api-key
```

The key is injected server-side by a custom proxy middleware. It never reaches the browser.

### Development Server

```bash
npm start
```

This opens `http://localhost:8080/index.html` with the UI5 development server.

### Production Build

```bash
npm run build
```

Output is written to `dist/`.

## Features

- **NVC Communication Analysis**: Paste a message and get a scored analysis across 8 dimensions (Clarity, Empathy, Tonality, etc.) with NVC-aligned alternatives
- **Email Drafting & Overhaul**: Draft new emails or improve existing ones with configurable tone selection
- **Ephemeral Sessions**: No data persistence; everything resets on page refresh
- **Configurable Context**: Set relationship type and situation description to inform AI responses
- **Model Selection**: Dynamically fetches available models from the LiteLLM proxy
