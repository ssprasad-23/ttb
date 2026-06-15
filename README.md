# TTB Label AI Agent
An automated tool for validating alcohol label compliance against TTB (Alcohol and Tobacco Tax and Trade Bureau) regulations. Upload label images or PDFs, and get instant pass/fail results with detailed field-by-field analysis.

## Project Structure

```
ttb/
├── index.html                 # HTML entry point
├── package.json               # Dependencies and scripts
├── package-lock.json
├── vite.config.js             # Vite configuration
├── .env                        # Environment variables (API key)
├── .gitignore
├── README.md
├── CLAUDE.md                  # Claude Code guidance
│
├── src/
│   ├── main.js                # Application entry point
│   ├── style.css              # Global styles
│   │
│   ├── components/
│   │   ├── Uploader.js        # Main UI component (file upload, timing, results)
│   │   ├── ResultDisplay.js   # Results table rendering
│   │   └── Timer.js           # Timing visualization (stub)
│   │
│   └── utils/
│       ├── claudeCheck.js     # Claude API integration with system prompt
│       └── toBase64.js        # File-to-base64 conversion utility
│
└── node_modules/              # Dependencies (npm install)
```

## Architecture

- **Frontend**: Vanilla JS + Vite (no framework)
- **Vision API**: Claude Sonnet 4.6 with vision capabilities
- **Entry point**: `index.html` → `src/main.js` → `Uploader` component
- **Data flow**: 
  - File upload → File validation
  - Click button → Base64 encoding (parallel) → Claude API call (vision analysis)
  - Parse JSON response → Render results table

## Features

- **Multi-format support**: JPG, PNG, WEBP, GIF, TIFF, PDF
- **Real-time encoding**: Base64 encoding happens when "Check Labels" is clicked
- **Vision-based validation**: Uses Claude API to analyze label images
- **Strict compliance checking**:
  - Brand name (semantic matching, capitalization-flexible)
  - ABV (Alcohol by Volume) format validation
  - Net contents verification
  - Class/type designation
  - Bottler address validation
  - Government warning (strict ALL CAPS + bold requirement)
- **Performance tracking**: Real-time timing metrics from upload → encoding → API response → display
- **Batch processing**: Handle multiple files simultaneously

### Key Files

- **index.html** - Mounts the Uploader component
- **src/main.js** - Bootstraps the app, imports and renders Uploader
- **src/components/Uploader.js** - Core UI: handles file drops, timing bar, results display
- **src/utils/claudeCheck.js** - System prompt + Claude API call logic (vision analysis)
- **src/utils/toBase64.js** - Converts files to base64 (no data URL prefix)
- **src/style.css** - All styling (drop zone, results table, timing bar)
- **package.json** - Dependencies: `@anthropic-ai/sdk`, Vite, PostCSS

## Setup

### Prerequisites
- Node.js 16+ and npm
- Anthropic API key

### Installation

1. Clone the repo and install dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root:


3. Add your Anthropic API key in .env file:
```
VITE_CLAUDE_API_KEY=sk-ant-...
```

## Running

### Development Server
```bash
npm run dev
```
Starts the Vite dev server at `http://localhost:5173`

### Production Build
```bash
npm run build
```
Creates optimized production build in `dist/`

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally

