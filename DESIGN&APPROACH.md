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

API Response Format

```json
{
  "result": "PASS | FAIL",
  "fields": {
    "brand_name":         { "status": "PASS", "found": "Old Tom Distillery" },
    "abv":                { "status": "FAIL", "found": "45%", "reason": "Missing Alc./Vol. notation" },
    "net_contents":       { "status": "PASS", "found": "750 mL" },
    "class_type":         { "status": "PASS", "found": "Kentucky Straight Bourbon Whiskey" },
    "bottler_address":    { "status": "PASS", "found": "Bottled by XYZ, Louisville, KY" },
    "government_warning": { "status": "PASS", "found": "GOVERNMENT WARNING: ..." }
  },
  "summary": "Label fails ABV format requirement."
}
```

**Claude response contract:** Returns only JSON — no prose, no markdown. `reason` is omitted on passing fields. Top-level `result` is `PASS` only if all 6 fields pass.

## Stakeholder Requirements → Design Decisions

| Stakeholder | Requirement | How it's addressed |
|---|---|---|
| Sarah Chen (Deputy Director) | Results in about 5 seconds | Parallel `Promise.allSettled()` with live 4-milestone timing bar |
| Sarah Chen | "My mother could figure it out" | Single-screen, drag-and-drop, no navigation or hidden steps |
| Sarah Chen | 200–300 label batch uploads | All files processed concurrently, not sequentially |
| Marcus Williams (IT Admin) | Standalone — no COLA integration | Fully self-contained; no backend, no database |
| Marcus Williams | Government network firewall | Anthropic Claude API is the only external call |
| Marcus Williams | No PII/sensitive data storage | Files encoded in-memory, used for the API call, then discarded |
| Dave Morrison (Senior Agent) | Semantic brand matching, not rigid string comparison | System prompt accepts "STONE'S THROW" = "Stone's Throw" |
| Dave Morrison | Tool must not slow agents down | No false failures on casing or typographic variations a human would pass |
| Jenny Park (Junior Agent) | Government Warning must be word-for-word exact | Any wording, casing, or formatting deviation is a hard fail |
| Jenny Park | "GOVERNMENT WARNING:" must be ALL CAPS and bold | Title case explicitly rejected via CRITICAL VALIDATION block in system prompt |
| Jenny Park | Handle imperfect photos (glare, angles, bad lighting) | Claude vision attempts extraction before flagging an image as unreadable |

## UI & UX

Designed for a mixed-age team where half the staff is over 50 — single screen, no menus, no navigation. Results are color-coded green (PASS) and red (FAIL) so agents can read the outcome at a glance without interpreting text. Every failed field includes a plain-English reason explaining exactly what was wrong (e.g., "Heading reads 'Government Warning:' — must be ALL CAPS"), so agents don't have to guess why a label was rejected.

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

## Trade-offs

| Decision | Benefit | Cost |
|---|---|---|
| No backend — API key in the browser (`dangerouslyAllowBrowser: true`) | Zero infrastructure, instant deploy, easy to iterate | API key is exposed in the browser bundle; not safe for full scale production |
| All compliance logic in the system prompt | No rule engine to maintain; Claude handles nuance naturally | Results depend on model accuracy — AI can misread a label; not a substitute for a human agent |
| Files encoded in-memory, discarded after API call | No PII storage, no compliance risk | No audit trail; checked labels can't be retrieved or logged |
| Vanilla JS, no framework | Fast to build, zero framework overhead, easy for anyone to read | Less structure; would need refactoring before scaling to a larger team |
| Single-user session, no persistence | Simple, stateless | Results lost on page refresh; no history or queue management |

## Limitations

- No audit trail — files are discarded after the API call; results are not stored
- API key exposed client-side — a backend proxy would be required for production
- AI accuracy — Claude may misread degraded images; results are a first pass, not a definitive ruling