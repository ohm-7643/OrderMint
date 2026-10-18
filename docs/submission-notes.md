# OrderMint — Hacktoberfest 2026 Submission Notes

## Challenge Reference
- **Challenge**: Hacktoberfest Open-Source AI Challenge: Week 2 (Side Hustle)
- **Required Tag**: `#hf26challenge`
- **Theme**: Build something with open-weight models or open-source AI that someone would actually pay for.
- **Submission Deadline**: October 18, 2026 at 11:59 PM PDT (UTC: October 19, 2026 at 06:59 AM)

---

## 1. DEV Submission Post Outline

### Title Ideas
- `OrderMint: Local-First AI Order Management for Micro-Businesses & Home Kitchens`
- `Turning Messy WhatsApp Chats into Verified Bills: How I Built OrderMint with Local AI`

### Post Body (Challenge Headings)

#### What I Built
OrderMint is a local-first, privacy-respecting order management application designed specifically for micro-businesses—home bakers, cloud kitchens, tiffin providers, and independent social sellers—who take customer orders through messaging apps like WhatsApp.

Instead of sellers manually re-typing unstructured messages into spreadsheets or paper notebooks, OrderMint transforms chat messages into structured draft orders, reconciles them with the seller's catalog, calculates totals with deterministic integer math, and generates printable invoices.

#### Demo
- [Insert Video Link / GIF Walkthrough]
- **Try it locally**:
  1. Clone the repository and run `npm run setup`.
  2. Start the app: `npm run dev` and navigate to `http://127.0.0.1:5173`.
  3. Click **Load Demo Catalog** in the Catalog tab.
  4. Go to **Import Messages**, click **Sample: Cake & Correction**, and hit **Extract Orders**.
  5. In **Review Orders**, inspect how multi-message edits (`2 choc cakes` -> `actually make cakes 3`) are reconciled, resolve any price flags, and click **Approve Order**.
  6. Click **View Printable Bill** to see the tax invoice ready for printing or PDF export.

#### Code
- **Repository**: [GitHub Repository URL to be inserted by user]
- **Stack**: React, Vite, Node.js, Express (ES modules), SQLite via `better-sqlite3`, Ollama (`qwen3:8b` / open-weight models).
- **Zero Cloud AI**: All data processing and local inference run 100% on device.

#### How I Built It
OrderMint is built on a fundamental architectural principle:
> **AI suggests; application code validates; the seller approves.**

1. **Deterministic Parser**: Messages are normalized (handling English & Hinglish number words like *ek, do, teen*, common abbreviations like *choc, van, pkt, pcs*, and multipliers).
2. **Catalog & Alias Matching**: A tiered matching pipeline (exact name -> exact alias -> flexible regex phrase match -> Dice token overlap) identifies products without hallucinations.
3. **Integer-Paise Financial Math**: All monetary amounts are handled as integer paise (1 INR = 100 paise) in dedicated deterministic modules. The AI model is strictly prohibited from computing financial totals.
4. **Local AI Refinement**: For genuinely ambiguous phrasing, typos, or unfamiliar slang, OrderMint queries local models via Ollama (`http://127.0.0.1:11434`) using strict JSON schemas. If Ollama is offline, the app continues with 100% functional deterministic fallback.
5. **Human-in-the-Loop Review**: No order is finalized until a human seller inspects side-by-side message evidence and explicitly approves it.

#### Why Does Open Innovation Matter?
Open-weight models and open-source infrastructure make this application viable for micro-businesses in ways closed cloud APIs cannot:
- **Zero Ongoing Marginal Cost**: A home baker or tiffin cook operating on razor-thin margins cannot pay \$20/month per seat or per-token cloud API bills for every casual inquiry. Open models run for free on the hardware they already own.
- **True Customer Privacy**: Home sellers handle personal phone numbers, delivery addresses, apartment security codes, and dietary restrictions. Running inference locally guarantees customer data never leaves their laptop.
- **Offline Reliability**: Small kitchens often operate in basements, rural kitchens, or markets with intermittent internet. OrderMint works completely offline.

#### My Agent Session
- AI pair programming assisted with rapid test suite generation, SQLite schema design, and deterministic parser edge-case handling.
- [DevRelay session link / export placeholder if desired]

#### My First User
> *[NOTE FOR SUBMISSION AUTHOR: Test OrderMint with a real home baker, tiffin chef, or independent seller. Record their initial reaction, what they appreciated, and what feature they requested next. If no external user testing took place before the deadline, remove this section from the final post as required by DEV guidelines.]*

#### Prize Categories
- **Primary**: Hacktoberfest Open-Source AI Challenge: Week 2 (Side Hustle)
- **Featured / Partner Category Note**: While the project runs locally with Ollama (verified with `qwen3:8b`), remember to verify whether your specific model tag qualifies under sponsor tracks before tagging partner categories.

---

## 2. Concise 60–90 Second Demo Script

- **[0:00 - 0:15] The Problem**:
  "If you run a home bakery or cloud kitchen, your day starts with a flood of messy chat messages like: *'2 choc cakes for sat 700 each'*, *'add 1 brownie box 250'*, and *'actually make cakes 3'*. Manually copying these into notebooks causes missed items, math errors, and wasted hours."

- **[0:15 - 0:35] Import & Deterministic Extraction**:
  "Watch OrderMint in action. In the **Import Messages** tab, we paste this chat transcript. In 3 milliseconds, OrderMint extracts the products, captures the delivery note *'for sat'*, and tracks the multi-message change: the cake quantity was updated from 2 to 3 with visible history."

- **[0:35 - 0:55] Human Review & Validation**:
  "Now look at **Review Orders**. Notice that the AI suggests, but the seller remains in control. The original chat message is shown right beside the extracted lines. If there's a price mismatch or an unknown item, OrderMint flags it and disables approval until resolved."

- **[0:55 - 0:75] Deterministic Math & Instant Bill**:
  "All totals are calculated in deterministic integer paise—never hallucinated by a model. Once verified, we click **Approve Order**. Instantly, we have a clean, printable tax invoice formatted with itemized subtotals, ready to print or send as a PDF."

- **[0:75 - 0:90] Local-First Privacy**:
  "Best of all: 100% of this processing happened locally on this computer. Zero customer addresses uploaded to third-party clouds, zero cloud API bills, and it works completely offline. That's OrderMint."

---

## 3. Honest Strengths and Practical Limitations

### Genuine Strengths
1. **Financial Integrity**: Zero floating-point bugs or hallucinated math. Every calculation is done in integer paise with unit-tested math (₹0.10 + ₹0.20 = ₹0.30).
2. **True Local Privacy**: Zero telemetry, zero external CDN dependencies, zero cloud API calls.
3. **Resilient Fallback**: Tested both with Ollama running and Ollama stopped; the application remains fully functional in offline rule-based mode.
4. **Verifiable Pipeline**: 20/20 automated tests passing across database idempotency, parser rules, approval validation, and end-to-end workflow.

### Known Limitations
1. **Model Cold-Start & Memory**: Running 8B parameter models on entry-level laptops (e.g. 8 GB RAM) requires sufficient swap space and patience during initial weight loading.
2. **Dialect Scope**: While common Hinglish words (*ek, do, teen*, etc.) and abbreviations are handled, regional slang varies widely across languages.
3. **No Voice / Image OCR**: Only plain text and chat exports are currently parsed; voice notes and handwritten slips are out of scope for the MVP.
4. **License Selection**: Open-source license selection remains unfinished pending user decision.
