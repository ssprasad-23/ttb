# TTB Label Compliance Checker

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
├── favicon.svg
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

## Features

- **Multi-format support**: JPG, PNG, WEBP, GIF, TIFF, PDF
- **Real-time encoding**: Base64 encoding starts immediately on file upload
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
```bash
cp .env.example .env
```

3. Add your Anthropic API key:
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

## Usage

1. Start the dev server: `npm run dev`
2. Open `http://localhost:5173` in your browser
3. Drag & drop label images/PDFs onto the drop zone, or click to browse
4. Base64 encoding starts immediately (timing bar displays progress)
5. Click "Check Labels" to send to Claude for compliance analysis
6. View results: each field shows PASS/FAIL status with details

## Architecture

- **Frontend**: Vanilla JS + Vite (no framework)
- **Vision API**: Claude Sonnet 4.6 with vision capabilities
- **Entry point**: `index.html` → `src/main.js` → `Uploader` component
- **Data flow**: 
  - File upload → Base64 encoding (immediate)
  - Click button → Claude API call (vision analysis)
  - Parse JSON response → Render results table


### Key Files

- **index.html** - Mounts the Uploader component
- **src/main.js** - Bootstraps the app, imports and renders Uploader
- **src/components/Uploader.js** - Core UI: handles file drops, timing bar, results display
- **src/utils/claudeCheck.js** - System prompt + Claude API call logic (vision analysis)
- **src/utils/toBase64.js** - Converts files to base64 (no data URL prefix)
- **src/style.css** - All styling (drop zone, results table, timing bar)
- **vite.config.js** - Vite bundler config
- **package.json** - Dependencies: `@anthropic-ai/sdk`, Vite, PostCSS


## Environment

The `.env` file configures the API key for the browser-based Anthropic SDK. The app handles batch processing in parallel via `Promise.allSettled()`.
