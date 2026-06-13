import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
  dangerouslyAllowBrowser: true
})

const SYSTEM_PROMPT = `You are an expert TTB (Alcohol and Tobacco Tax and Trade Bureau) label compliance auditor.

Analyze the provided label image and return ONLY a JSON object in the exact format below — no prose, no markdown, no explanation.

Required fields to check:
- brand_name: Must be present and prominent
- abv: Must state "XX% Alc./Vol." or equivalent
- net_contents: Must state volume (e.g., "750 mL")
- class_type: Must state the class/type designation (e.g., "Kentucky Straight Bourbon Whiskey")
- bottler_address: Must include bottler or importer name and city/state
- government_warning: Must be present, in bold, and meet minimum size requirements

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

async function checkLabel(base64Image, mediaType = 'image/jpeg') {
  if (!base64Image) {
    throw new Error('Missing base64 image data.')
  }

  const fileBlock = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64Image } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } }

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

  const raw = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  if (!raw) {
    throw new Error('Claude returned an empty response.')
  }

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    return { response: cleaned }
  }
}

export default checkLabel