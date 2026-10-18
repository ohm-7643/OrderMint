import { EVAL_DATASET } from './dataset.js';
import { normalizeText } from '../parser/normalize.js';
import { extractQuantityAndAction } from '../parser/quantities.js';
import { extractQuotedPrice, reconcilePrice } from '../parser/prices.js';
import { matchCatalogItem } from '../parser/catalogMatch.js';
import { DEMO_CATALOG } from '../db/seed.js';
import { checkAIStatus, refineWithAI } from '../ai/orderAssistant.js';

// Prepare catalog structures
const catalogItems = DEMO_CATALOG.map((item, idx) => ({
  id: idx + 1,
  name: item.name,
  unit_price_paise: item.unitPricePaise,
  unit: item.unit
}));

const aliasesByItemId = {};
DEMO_CATALOG.forEach((item, idx) => {
  aliasesByItemId[idx + 1] = item.aliases;
});

function evaluateRules(example) {
  const t0 = performance.now();
  const norm = normalizeText(example.text);
  const qtyAction = extractQuantityAndAction(example.text, norm);
  const quoted = extractQuotedPrice(example.text);
  const matchResult = matchCatalogItem(norm, catalogItems, aliasesByItemId);
  const priceResult = reconcilePrice({
    quotedPriceInfo: quoted,
    catalogItem: matchResult.match
  });

  const flags = [
    ...qtyAction.flags,
    ...matchResult.flags,
    ...priceResult.flags
  ];

  const durationMs = performance.now() - t0;

  return {
    item: matchResult.match ? matchResult.match.name : null,
    quantity: qtyAction.quantity,
    action: qtyAction.action,
    flags,
    durationMs
  };
}

async function runEvaluation() {
  console.log('='.repeat(70));
  console.log(' ORDERMINT EVALUATION HARNESS — 25 Synthetic Test Cases');
  console.log('='.repeat(70));

  const aiStatus = await checkAIStatus();
  console.log(`Local AI Status: ${aiStatus.available ? `ONLINE (${aiStatus.activeModel})` : `OFFLINE (${aiStatus.error})`}`);
  console.log(`Dataset: 25 synthetic micro-business order messages across 5 categories\n`);

  let rulesCorrectItems = 0;
  let rulesTotalItems = 0;
  let rulesCorrectQuantities = 0;
  let rulesTotalQuantities = 0;
  let rulesCorrectFlags = 0;
  let rulesTotalFlags = 0;
  let rulesTotalLatency = 0;

  const results = [];

  for (const example of EVAL_DATASET) {
    const res = evaluateRules(example);
    rulesTotalLatency += res.durationMs;

    // Check item match
    let itemMatch = false;
    if (example.expectedItem !== undefined) {
      rulesTotalItems++;
      if (res.item === example.expectedItem) {
        rulesCorrectItems++;
        itemMatch = true;
      }
    }

    // Check quantity match
    let qtyMatch = false;
    if (example.expectedQty !== undefined) {
      rulesTotalQuantities++;
      if (res.quantity === example.expectedQty) {
        rulesCorrectQuantities++;
        qtyMatch = true;
      }
    }

    // Check flag match
    let flagsMatch = true;
    if (example.expectedFlags && example.expectedFlags.length > 0) {
      rulesTotalFlags++;
      for (const ef of example.expectedFlags) {
        if (!res.flags.includes(ef)) {
          flagsMatch = false;
          break;
        }
      }
      if (flagsMatch) rulesCorrectFlags++;
    }

    results.push({
      id: example.id,
      category: example.category,
      text: example.text,
      predictedItem: res.item,
      predictedQty: res.quantity,
      flags: res.flags,
      itemMatch,
      qtyMatch,
      flagsMatch,
      latencyMs: res.durationMs.toFixed(2)
    });
  }

  // Print Summary Table
  console.log('| ID  | Category           | Input Text                            | Predicted Item       | Qty | Flags Match | Latency |');
  console.log('|-----|--------------------|---------------------------------------|----------------------|-----|-------------|---------|');
  for (const r of results) {
    const textSnippet = r.text.length > 37 ? r.text.slice(0, 34) + '...' : r.text.padEnd(37);
    const cat = r.category.padEnd(18);
    const item = (r.predictedItem || '(None)').padEnd(20);
    const qty = String(r.predictedQty !== null ? r.predictedQty : '-').padEnd(3);
    const fm = (r.flagsMatch ? 'PASS' : 'FAIL').padEnd(11);
    console.log(`| ${r.id} | ${cat} | ${textSnippet} | ${item} | ${qty} | ${fm} | ${r.latencyMs}ms |`);
  }

  const itemAccuracy = (rulesCorrectItems / rulesTotalItems) * 100;
  const qtyAccuracy = (rulesCorrectQuantities / rulesTotalQuantities) * 100;
  const flagAccuracy = rulesTotalFlags > 0 ? (rulesCorrectFlags / rulesTotalFlags) * 100 : 100;
  const avgLatency = rulesTotalLatency / EVAL_DATASET.length;

  console.log('\n' + '='.repeat(70));
  console.log(' DETERMINISTIC RULES EVALUATION METRICS:');
  console.log('='.repeat(70));
  console.log(` Product Extraction Accuracy : ${itemAccuracy.toFixed(1)}% (${rulesCorrectItems}/${rulesTotalItems})`);
  console.log(` Quantity Extraction Accuracy: ${qtyAccuracy.toFixed(1)}% (${rulesCorrectQuantities}/${rulesTotalQuantities})`);
  console.log(` Expected Uncertainty Flags  : ${flagAccuracy.toFixed(1)}% (${rulesCorrectFlags}/${rulesTotalFlags})`);
  console.log(` Average Processing Latency  : ${avgLatency.toFixed(2)} ms/message`);
  console.log('='.repeat(70));
}

runEvaluation();
