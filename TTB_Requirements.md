# AI TTB Requirements

Completed take-home assessments should be submitted to:
https://forms.osi.office365.us/r/xWrQGduMw7

---

## Deliverables

1. **Source Code Repository** (e.g. GitHub or similar)
   - All source code
   - README with setup and run instructions
   - Brief documentation of approach, tools used, and assumptions made

2. **Deployed Application URL**
   - Working prototype Treasury can access and test

---

## Stakeholder Requirements

### Sarah Chen — Deputy Director of Label Compliance

- Brand name matches? Check. ABV is correct? Check. Government warning is there?
- Hard rule for 5 sec each label
- Simple UI mostly for older people
- Batch verification 200 to 300 at once

**Extracted requirements:**
- Results returned in ~5 seconds max per label
- UI must be extremely simple — "my mother could figure it out" (73 years old, non-technical benchmark)
- No hidden buttons, no complex navigation
- Support batch uploads of 200–300 labels at once
- Automate the routine matching work (brand name, ABV, Government Warning, etc.)

---

### Marcus Williams — IT Systems Administrator

- Deploy on Azure, standalone prototype

**Extracted requirements:**
- Deploy on Azure infrastructure
- No integration with COLA system — standalone prototype only
- Be mindful of outbound firewall restrictions — validate any cloud API is reachable on government network
- No storage of sensitive/PII data for prototype scope
- Keep federal compliance in mind (document retention, PII) even if not enforced for prototype

---

### Dave Morrison — Senior Compliance Agent (28 years)

- This should pass - brand name was 'STONE'S THROW' on the label but 'Stone's Throw' in the application

**Extracted requirements:**
- Must use fuzzy matching, not strict string matching (e.g. STONE'S THROW = Stone's Throw)
- Tool should help agents go faster, not slow them down or add friction
- Must not make existing workflow harder

---

### Jenny Park — Junior Compliance Agent (8 months)

- Warning statement - has to be word for word
- GOVERNMENT WARNING - part has to be in all caps and bold

> Also—and this is maybe out of scope for a prototype—but it would be amazing if the tool could handle images that aren't perfectly shot. I've seen labels that are photographed at weird angles, or the lighting is bad, or there's glare on the bottle. Right now if an agent can't read the label they just reject it and ask for a better image. But if AI could handle some of that...

**Extracted requirements:**
- Government Warning must be exact match — word-for-word, GOVERNMENT WARNING: in all caps and bold
- Reject any label with title case, wrong wording, or non-bold formatting on the warning
- Handle imperfect label images — angles, glare, bad lighting

---

## Technical Requirements

- You are free to use any programming languages, frameworks, or libraries you prefer. We want to see what kind of engineering, design, and integration decisions you make.
- The exact requirements vary by beverage type (beer, wine, distilled spirits) but common elements include:
  - Brand name
  - Class/type designation
  - Alcohol content (with some exceptions for certain wine/beer)
  - Net contents
  - Name and address of bottler/producer
  - Country of origin for imports
  - Government Health Warning Statement (mandatory on all alcohol beverages)
- We encourage you to review TTB's guidelines at ttb.gov for additional context on label requirements.
- Create own test labels.

**Your app should handle labels containing information like the example below:**

| Field | Example |
|---|---|
| Brand Name | "OLD TOM DISTILLERY" |
| Class/Type | "Kentucky Straight Bourbon Whiskey" |
| Alcohol Content | "45% Alc./Vol. (90 Proof)" |
| Net Contents | "750 mL" |
| Government Warning | [Standard government warning text] |

We encourage you to create or source additional test labels — AI image generation tools work well for this.

---

## Evaluation Criteria

- Correctness and completeness of core requirements
- Code quality and organization
- Appropriate technical choices for the scope
- User experience and error handling
- Attention to requirements
- Creative problem-solving

> We understand this is time-constrained. A working core application with clean code is preferred over ambitious but incomplete features. Document any trade-offs or limitations.
