# Design & Approach

## Overview

Browser-based prototype validating alcohol labels against TTB compliance rules using Claude vision API.

## Approach

**Stack:** Vanilla JS + Vite, no backend. Direct Claude API via @anthropic-ai/sdk.

**Flow:**
1. User uploads images/PDFs (drag & drop or file browser)
2. File validation (type check: JPG, PNG, WEBP, GIF, TIFF, PDF)
3. User clicks "Check Labels"
4. Base64 encoding (parallel for all files)
5. Claude vision API analyzes each label
6. Results rendered: pass/fail table with thumbnail

**Key design:** Strict system prompt enforcing nuanced TTB rules (semantic brand matching, exact government warning format). No backend.

## Tools & Stack

| Component | Tool |
|-----------|------|
| Bundler | Vite |
| Language | Vanilla JS |
| AI | Claude Sonnet 4.6 |
| SDK | @anthropic-ai/sdk |
| Styling | CSS + PostCSS |

## Key Decisions

1. **Strict System Prompt** — Claude enforces exact compliance rules (e.g., "GOVERNMENT WARNING:" ALL CAPS, not title case)
2. **JSON-Only Response** — Structured parsing, no prose
3. **Parallel Batch** — `Promise.allSettled()` for all files
4. **Timing Metrics** — 4 milestones tracked for performance transparency
5. **No Backend** — All logic in system prompt; simpler to iterate

## Assumptions

- Image quality sufficient for vision (handles glare/angles)
- Files under 5MB
- Single-user session
- 6 fields sufficient (brand name, ABV, net contents, class/type, bottler address, government warning)
- Semantic brand matching OK ("STONE'S THROW" = "Stone's Throw")

## Limitations

- No blob storage or database saved for already checked files