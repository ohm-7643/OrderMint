# OrderMint 🌱

> **Local-First AI Order Management for Home Kitchens, Bakers & Independent Social Sellers**  
> *Transform messy WhatsApp chats and customer DMs into verified orders and printable tax invoices—100% locally on your machine.*

Built for the **Hacktoberfest 2026 Open-Source AI Challenge: Week 2 (Side Hustle)** (`#hf26challenge`).

---

## 📋 Table of Contents
1. [The Problem & Target Audience](#the-problem--target-audience)
2. [Core Product Principle](#core-product-principle)
3. [Key Features](#key-features)
4. [Architecture & Tech Stack](#architecture--tech-stack)
5. [How the Extraction Pipeline Works](#how-the-extraction-pipeline-works)
6. [Why Open-Weight / Local AI Matters](#why-open-weight--local-ai-matters)
7. [Getting Started & Local Setup](#getting-started--local-setup)
8. [Running Tests & Evaluation](#running-tests--evaluation)
9. [Evaluation Benchmark Results](#evaluation-benchmark-results)
10. [Supported Import Formats](#supported-import-formats)
11. [Privacy & Safety Guarantees](#privacy--safety-guarantees)
12. [Known Limitations & Project Status](#known-limitations--project-status)
13. [License & Credits](#license--credits)

---

## The Problem & Target Audience

Millions of micro-entrepreneurs run thriving side hustles and small food businesses directly over chat messages:
- **Home Bakers** managing custom cakes, brownies, and festive hampers.
- **Tiffin & Dabba Services** delivering daily home-cooked lunch and dinner meals.
- **Cloud Kitchens & Caterers** handling weekend party platters and bulk snacks.
- **Instagram & Social Sellers** selling handcrafted goods, candles, and gourmet foods.

### The Daily Pain
Orders arrive as unstructured, fragmented chat messages:
> *"2 choc cakes for sat 700 each"*  
> *"add 1 brownie box 250"*  
> *"actually make cakes 3"*

Sellers spend hours manually copying details into spreadsheets or paper notebooks. Common consequences:
- ❌ Missed item quantity modifications or cancellations.
- ❌ Arithmetic errors in manual bill preparation.
- ❌ Customer disputes over quoted prices vs catalog prices.
- ❌ Heavy monthly subscription fees for overly complex restaurant POS systems that demand cloud connectivity.

**OrderMint** solves this by turning messy chat streams into structured draft orders, validating items against the seller's catalog, computing totals with deterministic integer math, and producing printable invoices—in seconds, offline, and privately.

---

## Core Product Principle

> **AI suggests; application code validates; the seller approves.**

The AI model is never the source of truth for business logic or financial calculations.
- **Deterministic Math**: Totals are calculated strictly in integer paise in application code.
- **Catalog Validation**: Product names and aliases must resolve against catalog records or be flagged as custom items.
- **Transparent Reconciliation**: Price differences, unknown items, ambiguous quantities, and multi-message cancellations are flagged with visible warnings.
- **Seller in the Loop**: An order is finalized only after human inspection and explicit approval.

---

## Key Features

1. **Product Catalog Manager**
   - Manage items, units, and base prices in INR.
   - Configure aliases for matching common abbreviations (e.g. `choc cake` -> `Chocolate Cake`).
   - One-click "Load Demo Catalog" with 10 pre-configured bakery and kitchen items.

2. **Smart Chat Importer**
   - Paste chat transcripts or upload plain-text `.txt` WhatsApp exports.
   - Handles multi-message modifications (additions, quantity updates, cancellations).
   - Real-time indicator showing local AI availability vs offline rule-based fallback.

3. **Side-by-Side Review & Correction (Core MVP Screen)**
   - View original customer messages directly beside extracted order lines.
   - Track visible change history (e.g. `cakes: quantity 2 → 3, based on message #3`).
   - One-click resolution for price mismatches, ambiguous items, and custom requests.
   - Backend-enforced approval guard: disabled with explicit blocker hints until all issues are resolved.

4. **Printable Tax Invoices & Daily Sales Summary**
   - Clean, professional invoice view with customizable business name, address, and bill prefix.
   - Built-in `window.print()` stylesheet formatted for paper printing or PDF export (hides navigation and UI buttons).
   - Real-time daily summary computing approved order counts, total revenue, and quantity sold per product.

---

## Architecture & Tech Stack

OrderMint is structured as a clean, lightweight monorepo with zero unnecessary dependencies.

```
ordermint/
├── client/                 # Frontend: React 19 + Vite (binds to 127.0.0.1:5173)
│   ├── src/
│   │   ├── components/     # ReviewOrders, ImportMessages, Catalog, BillView, Summary
│   │   ├── api.js          # REST client wrapper
│   │   ├── App.jsx         # Main application coordinator
│   │   └── index.css       # Responsive design + print stylesheet
│   └── vite.config.js      # Proxies /api to Express backend
├── server/                 # Backend: Node.js (ES modules) + Express (127.0.0.1:3001)
│   ├── src/
│   │   ├── db/             # SQLite connection (better-sqlite3) & schema migrations
│   │   ├── parser/         # Normalization, quantities, prices, matching, corrections
│   │   ├── ai/             # Ollama local HTTP client & strict JSON validator
│   │   ├── routes/         # REST API endpoints (/catalog, /orders, /import, /summary)
│   │   ├── utils/          # Integer-paise money arithmetic module
│   │   └── eval/           # 25-case synthetic evaluation benchmark harness
│   └── tests/              # Node.js built-in test runner suite (20 automated tests)
├── docs/                   # Submission materials & demo walkthrough notes
├── scripts/                # Zero-dependency concurrently dev runner
└── package.json            # Unified scripts (setup, dev, build, test, eval, seed)
```

- **Frontend**: React 19, Vite 8, Plain CSS with CSS Custom Properties. Local fonts only (no CDNs).
- **Backend**: Node.js 24 (ES modules), Express 5, `better-sqlite3` 13.
- **Local AI**: Ollama local HTTP API (`http://127.0.0.1:11434`), default model: `qwen3:8b`.
- **Database**: Local SQLite with Write-Ahead Logging (`WAL`), strict foreign keys, and idempotent schema initialization.

---

## How the Extraction Pipeline Works

```
Raw Chat Text
      │
      ▼
1. Raw Text Parsing (extract sender, timestamps, message blocks)
      │
      ▼
2. Normalization (clean emojis, expand abbreviations, map English & Hinglish number words)
      │
      ▼
3. Deterministic Extraction (quantity regex, price detection, delivery note extraction)
      │
      ▼
4. Catalog Matching (Exact Name -> Exact Alias -> Phrase Regex -> Dice Token Overlap)
      │
      ├─► Clean Match: Assigned item & catalog price
      └─► Uncertain/Ambiguous/Unknown: Raised flag for review
      │
      ▼
5. Multi-Message Correction Engine (reconciles quantity changes and cancellations)
      │
      ▼
6. Local AI Refinement (Optional & Sandboxed: queries Ollama on unresolved lines only)
      │
      ▼
7. SQLite Draft Order Storage (persisted for human review)
      │
      ▼
8. Human Seller Review & Explicit Approval
```

---

## Why Open-Weight / Local AI Matters

For micro-businesses, open-source AI is not just a technical preference—it is the difference between an economically viable tool and an unusable one:

1. **Zero Marginal Cost**: Cloud APIs charge per token. A casual chat with 15 back-and-forth messages would eat away at a home baker's profit margin. Running a local open-weight model costs \$0.00 in API fees.
2. **Absolute Customer Privacy**: Home sellers manage customer phone numbers, home delivery addresses, gate codes, and dietary allergies. Storing this on random cloud servers introduces severe liability. With OrderMint, data stays strictly on the seller's computer.
3. **Offline Independence**: Small kitchens and farmers' market stalls often suffer from poor cellular reception. OrderMint runs without internet access.

---

## Getting Started & Local Setup

### Prerequisites
- **Node.js**: v20 or higher (v24.21.0 recommended)
- **npm**: v10 or higher
- **Git**
- *(Optional)* **Ollama**: For local AI assistance ([ollama.ai](https://ollama.ai))

### 1. Installation
Clone the repository and install all dependencies:
```bash
git clone <repository-url> ordermint
cd ordermint
npm run setup
```

### 2. Seed the Database
Initialize SQLite with the demo catalog and sample orders:
```bash
npm run seed
```

### 3. Run Development Server
Start both the Express backend (`127.0.0.1:3001`) and Vite frontend (`127.0.0.1:5173`):
```bash
npm run dev
```
Open your browser and navigate to `http://127.0.0.1:5173`.

### 4. Optional: Local AI Model Setup
If using Ollama, ensure the service is running and pull a model:
```bash
ollama serve
ollama pull qwen3:8b
```
*Note: If Ollama is not running, OrderMint automatically falls back to 100% functional deterministic matching with an offline badge.*

---

## Running Tests & Evaluation

### Run Test Suite
OrderMint uses Node's built-in native test runner (`node --test`). Tests run in memory without requiring a running Ollama daemon:
```bash
npm test
```
**Results observed**: 20 passing tests across:
- Money arithmetic (integer paise conversion, ₹0.10 + ₹0.20 = ₹0.30 precision)
- Database schema initialization, idempotency, cascading deletes, and safe demo resets
- Chat text normalization (English & Hinglish number words, abbreviations)
- Multi-message correction and cancellation reconciliation
- Catalog matching and ambiguous candidate detection
- Server-side approval validation rules and blockers
- End-to-end full order workflow

### Run Evaluation Benchmark
Run the built-in benchmark harness on 25 synthetic order messages across 5 categories:
```bash
npm run eval
```

---

## Evaluation Benchmark Results

The evaluation harness was executed directly against the 25 labeled synthetic benchmark cases.

```
======================================================================
 ORDERMINT EVALUATION HARNESS — 25 Synthetic Test Cases
======================================================================
Local AI Status: ONLINE (qwen3:8b)
Dataset: 25 synthetic micro-business order messages across 5 categories

| ID  | Category           | Input Text                            | Predicted Item       | Qty | Flags Match | Latency |
|-----|--------------------|---------------------------------------|----------------------|-----|-------------|---------|
| E01 | Clean English      | 2 choc cakes for sat 700 each         | Chocolate Cake       | 2   | PASS        | 3.82ms |
| E02 | Clean English      | 1 brownie box @250                    | Brownie Box          | 1   | PASS        | 1.66ms |
| E03 | Clean English      | 3 vanilla cake                        | Vanilla Cake         | 3   | PASS        | 0.54ms |
| E04 | Clean English      | a dozen cookies                       | Cookie Jar           | 12  | PASS        | 0.18ms |
| E05 | Clean English      | half dozen cupcakes                   | Cupcakes (6)         | 6   | PASS        | 0.14ms |
| A01 | Abbreviations      | 2 van cakes tomorrow                  | Vanilla Cake         | 2   | PASS        | 0.12ms |
| A02 | Abbreviations      | 1 pkt brownies                        | Brownie Box          | 1   | PASS        | 0.16ms |
| A03 | Abbreviations      | dark chocolate cake x2                | Chocolate Cake       | 2   | PASS        | 0.11ms |
| A04 | Abbreviations      | cheesy garlic bread 3                 | Garlic Bread         | 3   | PASS        | 0.14ms |
| A05 | Abbreviations      | deluxe thali x2 for lunch             | Veg Thali            | 2   | PASS        | 0.14ms |
| H01 | Hinglish           | do choc cakes for Sunday              | Chocolate Cake       | 2   | PASS        | 0.12ms |
| H02 | Hinglish           | teen veg thali deliver by 2pm         | Veg Thali            | 3   | PASS        | 0.13ms |
| H03 | Hinglish           | ek mango cheesecake eggless           | Mango Cheesecake     | 1   | PASS        | 0.13ms |
| H04 | Hinglish           | char paneer roll                      | Paneer Roll          | 4   | PASS        | 0.12ms |
| H05 | Hinglish           | paanch samosa box                     | Samosa Box           | 5   | PASS        | 0.10ms |
| C01 | Price Mismatch     | chocolate cake 650 each               | Chocolate Cake       | -   | PASS        | 0.18ms |
| C02 | Price Quoted       | samosa box @100                       | Samosa Box           | -   | PASS        | 0.14ms |
| U01 | Unknown Item       | 1 mystery pistachio pastry 300        | (None)               | 1   | PASS        | 0.82ms |
| U02 | Ambiguous Item     | 2 cakes for saturday                  | (None)               | 2   | PASS        | 0.20ms |
| U03 | Missing Quantity   | choc cake for sat                     | Chocolate Cake       | -   | PASS        | 0.09ms |
| U04 | Excessive Quantity | 1500 choc cakes                       | Chocolate Cake       | 1500 | PASS        | 0.09ms |
| U05 | Unsupported Fraction | 1/2 kg cake                         | (None)               | 1   | PASS        | 0.14ms |
| U06 | Zero Quantity      | 0 brownie box                         | Brownie Box          | 0   | PASS        | 0.09ms |
| U07 | Cancel Action      | cancel the brownies                   | Brownie Box          | 0   | PASS        | 0.09ms |
| U08 | Negative Quantity  | -5 cookies                            | Cookie Jar           | -5  | PASS        | 0.09ms |

======================================================================
 DETERMINISTIC RULES EVALUATION METRICS:
======================================================================
 Product Extraction Accuracy : 100.0% (22/22)
 Quantity Extraction Accuracy: 86.4% (19/22)
 Expected Uncertainty Flags  : 100.0% (8/8)
 Average Processing Latency  : 0.38 ms/message
======================================================================
```

---

## Supported Import Formats

OrderMint supports standard plain text pastes and `.txt` files up to 512 KB:

1. **WhatsApp Exports with Timestamps & Sender**:
   ```
   [12/10/26, 14:00:01] Priya Sharma: 2 choc cakes for sat 700 each
   12/10/26, 2:02 pm - Rahul: 1 brownie box 250
   ```
2. **Simple Sender Prefixes**:
   ```
   Anita Rao: 3 mango cheesecake eggless
   ```
3. **Blank-Line Separated Blocks**:
   ```
   Customer 1:
   2 veg thali for lunch tomorrow

   Customer 2:
   3 paneer roll and 1 samosa box
   ```
4. **Multi-Message Modification Threads**:
   ```
   [12/10/26, 14:00:01] Priya: 2 choc cakes 700 each
   [12/10/26, 14:02:15] Priya: add 1 brownie box 250
   [12/10/26, 14:05:00] Priya: actually make cakes 3
   ```

---

## Privacy & Safety Guarantees

- **No Remote Telemetry**: OrderMint contains zero analytics, tracking beacons, or cloud phone-home scripts.
- **Local Assets Only**: All fonts, CSS, and icons are bundled locally in the client build. No Google Fonts or runtime CDNs.
- **No WhatsApp Scraping**: OrderMint processes plain text provided directly by the seller. It never interacts with WhatsApp accounts, web sessions, or unofficial APIs.
- **Strict Input Validation**: Rejects binary data, null bytes, and inputs over 512 KB. Parameterized SQLite queries prevent SQL injection.

---

## Known Limitations & Project Status

### Project Status
- **Development Start Date**: October 17, 2026.
- **Core Workflow**: 100% implemented and verified end-to-end.
- **Test Suite**: 20/20 automated tests passing.
- **License**: Unfinished. As per developer instructions, no software license has been selected yet.

### Limitations
- **Text Only**: Audio voice notes and photo receipts are not supported in the MVP.
- **Vocabulary Scope**: The normalizer supports common Hinglish numbers (*ek, do, teen*, etc.) and food abbreviations; regional colloquialisms outside the catalog aliases must be confirmed by the seller.
- **Model Warmup**: Initial inference for large models on 8 GB RAM machines may experience a cold-start delay during model loading.

---

## License & Credits

- **License Selection**: Unfinished. (To be designated by the repository owner).
- **Third-Party Open-Source Credits**:
  - [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) by Joshua Wise
  - [Express](https://expressjs.com/)
  - [Vite](https://vitejs.dev/) & [React](https://react.dev/)
  - [Ollama](https://ollama.ai)
