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

### Option 1: Run with Podman (recommended)

**1. Install Podman**

```bash
brew install podman
podman machine init
podman machine start
```

**2. Clone the repo and set up your environment**

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```
API_KEY=your-actual-api-key
LITELLM_BASE_URL=http://host.containers.internal:6655/litellm/v1
```

**3. Build and start the container**

```bash
podman compose up --build
```

**4. Open the app**

```
http://localhost:8080/index.html
```

To start again later (no rebuild needed):

```bash
podman compose up
```

---

### Option 2: Run with Docker

Same steps as above, but use `docker` instead of `podman`:

```bash
cp .env.example .env
# Set API_KEY and:
# LITELLM_BASE_URL=http://host.docker.internal:6655/litellm/v1
docker compose up --build
```

---

### Option 3: Run locally (without container)

**Prerequisites:** Node.js 18+, a running LiteLLM proxy at `localhost:6655`

```bash
npm install
cp .env.example .env
# Set API_KEY=your-actual-api-key
npm start
```

---

> The API key is injected server-side and never exposed to the browser.

## Features

- **NVC Communication Analysis**: Paste a message and get a scored analysis across 8 dimensions (Clarity, Empathy, Tonality, etc.) with NVC-aligned alternatives
- **Email Drafting & Overhaul**: Draft new emails or improve existing ones with configurable tone selection
- **Ephemeral Sessions**: No data persistence; everything resets on page refresh
- **Configurable Context**: Set relationship type and situation description to inform AI responses
- **Model Selection**: Dynamically fetches available models from the LiteLLM proxy
