/**
 * claudecheck.js
 * Sends a label image or PDF to the Claude vision API and returns a
 * structured TTB compliance result.
 *
 * The system prompt instructs Claude to return only JSON — no prose, no markdown.
 * A CRITICAL VALIDATION block pre-scans for the government warning header before
 * evaluating any other fields, ensuring a title-case header is an immediate FAIL.
 *
 * Exports:
 *  - checkLabel(base64Image, mediaType) → Promise<Object>
 */

import Anthropic from '@anthropic-ai/sdk'

// dangerouslyAllowBrowser is intentional — this is a browser-only prototype with no backend.
// In production, API calls should be proxied through a server to keep the key secret.
const client = new Anthropic({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
  dangerouslyAllowBrowser: true
})

/**
 * System prompt that defines the compliance rules Claude must enforce.
 *
 * Key behaviors:
 *  - Returns ONLY JSON — no prose, no markdown fences
 *  - Pre-scans for "GOVERNMENT WARNING:" before evaluating any field (CRITICAL VALIDATION)
 *  - Accepts semantic brand name matches (e.g. "STONE'S THROW" = "Stone's Throw")
 *  - Attempts to read imperfect images (glare, angles, poor lighting) before failing
 *  - Omits "reason" from passing fields
 */
const SYSTEM_PROMPT = `You are an expert TTB (Alcohol and Tobacco Tax and Trade Bureau) label compliance auditor.

Analyze the provided label image and return ONLY a JSON object in the exact format below — no prose, no markdown, no explanation.

Handle images that may be imperfectly shot: angles, poor lighting, glare, shadows, or partial label visibility. Do your best to read and verify all required fields despite these real-world conditions. If the label is not sufficiently legible to verify the required fields, set result to "FAIL" and include in the summary: "Label image is not legible enough to perform compliance check. Please provide a clearer image."

CRITICAL VALIDATION: Before evaluating any fields, scan the label for the Government Warning text. If you see "Government Warning:" in title case, that is an IMMEDIATE FAIL for the entire label. The ONLY acceptable format is "GOVERNMENT WARNING:" in ALL CAPS and bold. If title case or any other variation exists, set result to "FAIL" and include in the summary: "Government warning header is not in correct ALL CAPS format."

Required fields to check:
- brand_name: Must be present and prominent on the label. Accept as PASS if the brand name matches semantically even if capitalization or punctuation differs (e.g., "STONE'S THROW" vs "Stone's Throw" is the same brand)
- abv: Must state "XX% Alc./Vol." or equivalent. Must be correct and present on the label
- net_contents: Must state volume (e.g., "750 mL")
- class_type: Must state the class/type designation (e.g., "Kentucky Straight Bourbon Whiskey")
- bottler_address: Must include bottler or importer name and city/state
- government_warning: Heading must appear EXACTLY as "GOVERNMENT WARNING:" — ALL CAPS and bold as rendered in the image. Any case variation (e.g., "Government Warning:") or absence is an immediate FAIL. Body text must match TTB requirements word for word.

For each field, return:
  "status": "PASS" or "FAIL"
  "found": the exact text found on the label (if present)
  "reason": explanation of why it fails (only include if status is "FAIL")

Set the top-level "result" to "PASS" only if ALL fields pass. Otherwise "FAIL".
Set "summary" to a one-sentence description of the overall outcome.

Return this exact JSON structure:

{
  "result": "PASS" or "FAIL",
  "fields": {
    "brand_name":       { "status": "...", "found": "...", "reason": "..." },
    "abv":              { "status": "...", "found": "...", "reason": "..." },
    "net_contents":     { "status": "...", "found": "...", "reason": "..." },
    "class_type":       { "status": "...", "found": "...", "reason": "..." },
    "bottler_address":  { "status": "...", "found": "...", "reason": "..." },
    "government_warning": { "status": "...", "found": "...", "reason": "..." }
  },
  "summary": "..."
}

Only include "reason" for fields that FAIL. Do not add any fields not listed above.`

/**
 * Sends a base64-encoded label file to Claude and returns the parsed compliance result.
 *
 * PDFs are sent as a `document` block; all image types are sent as an `image` block.
 * The raw response is stripped of any markdown fences before parsing — Claude occasionally
 * wraps JSON in ```json despite being instructed not to.
 *
 * @param {string} base64Image - Raw base64 payload (no data URL prefix)
 * @param {string} [mediaType='image/jpeg'] - MIME type of the file (e.g. 'image/png', 'application/pdf')
 * @returns {Promise<Object>} Parsed JSON result from Claude, or { response: rawText } if parsing fails
 * @throws {Error} If base64Image is missing or Claude returns an empty response
 */
async function checkLabel(base64Image, mediaType = 'image/jpeg') {
  if (!base64Image) {
    throw new Error('Missing base64 image data.')
  }

  // PDFs use the `document` block type; images use the `image` block type
  const fileBlock = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64Image } }
    : { type: 'image',    source: { type: 'base64', media_type: mediaType, data: base64Image } }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        fileBlock,
        { type: 'text', text: SYSTEM_PROMPT }
      ]
    }]
  })

  // Concatenate all text blocks (Claude typically returns one)
  const raw = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  if (!raw) {
    throw new Error('Claude returned an empty response.')
  }

  // Strip markdown fences if present (```json ... ```)
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // If JSON parsing fails, return the raw text so the UI can still display something
    return { response: cleaned }
  }
}

export default checkLabel
