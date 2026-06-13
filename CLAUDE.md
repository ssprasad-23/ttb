# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Vite dev server (localhost:5173)
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

No test runner or linter is configured.

## Environment

Copy `.env` and set your key:

```
VITE_CLAUDE_API_KEY=sk-ant-...
```

The `dangerouslyAllowBrowser: true` flag on the Anthropic client is intentional — this is a browser-only prototype with no backend.

## Architecture

This is a vanilla JS + Vite single-page app with no framework. The entry point is `index.html` → `src/main.js`, which mounts the single `Uploader` component into `#app`.

**Data flow for a label check:**

1. User drops/selects image(s) or PDF(s) in `Uploader.js`
2. Each file is converted to a raw base64 payload via `toBase64.js` (`includeDataUrl: false` — the Anthropic SDK wants the payload without the `data:...;base64,` prefix)
3. `claudeCheck.js` sends the base64 + media type to `claude-sonnet-4-6` as a vision message (images) or document block (PDFs), with a structured system prompt demanding a strict JSON response
4. The response JSON is parsed and rendered as a pass/fail table per field in `Uploader.js`

All files are processed in parallel via `Promise.allSettled`.

**Timing bar:** `Uploader.js` tracks four milestones (start, all-base64-done, first-Claude-response, first-result-rendered) using `Date.now()` snapshots and a 50ms `setInterval` display ticker. Each timer counts elapsed ms from the shared `startTime` and freezes independently at its own milestone.

**Claude response contract** (`claudeCheck.js`): The system prompt instructs Claude to return only JSON with a top-level `result` ("PASS"/"FAIL"), a `fields` object (keys: `brand_name`, `abv`, `net_contents`, `class_type`, `bottler_address`, `government_warning`), and a `summary` string. Each field has `status`, `found`, and optional `reason`. The parser strips markdown fences before `JSON.parse`.

**Fields checked:** brand name, ABV (format: `XX% Alc./Vol.`), net contents, class/type designation, bottler address, government warning (must be bold and word-for-word exact per TTB rules).

**`src/components/Timer.js`** is currently an empty stub — timing logic lives entirely inside `Uploader.js`.
