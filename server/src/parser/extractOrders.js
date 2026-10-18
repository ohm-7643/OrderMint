import { normalizeText, cleanText } from './normalize.js';
import { extractQuantityAndAction } from './quantities.js';
import { extractQuotedPrice, reconcilePrice } from './prices.js';
import { extractDeliveryAndNotes } from './deliveryNotes.js';
import { matchCatalogItem } from './catalogMatch.js';
import { applyCorrections } from './corrections.js';

const MAX_INPUT_SIZE_BYTES = 512 * 1024; // 512 KB limit

export function parseRawInput(rawText) {
  if (typeof rawText !== 'string') {
    throw new Error('Input must be a string');
  }
  if (Buffer.byteLength(rawText, 'utf8') > MAX_INPUT_SIZE_BYTES) {
    throw new Error('Input exceeds maximum allowed size of 512 KB');
  }
  if (/\0/.test(rawText)) {
    throw new Error('Binary content detected; only plain text is allowed');
  }

  const lines = rawText.split(/\r?\n/);
  const messages = [];

  // Patterns
  // 1. WhatsApp bracket: [12/10/26, 14:32:10] Priya Sharma: message
  const waBracketRegex = /^\[(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s+([^:]+):\s+(.*)$/;
  // 2. WhatsApp dash: 12/10/26, 2:32 pm - Rahul: message
  const waDashRegex = /^(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s+-\s+([^:]+):\s+(.*)$/;
  // 3. Standalone header: "Customer 1:" or "Priya Sharma:"
  const headerOnlyRegex = /^([A-Za-z0-9\s_-]+):\s*$/;
  // 4. Simple prefix: "Priya Sharma: 2 choc cakes"
  const simplePrefixRegex = /^([A-Za-z0-9\s_-]{2,30}):\s+(.*)$/;

  let currentCustomer = null;
  let currentBlock = [];
  let blockIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (currentBlock.length > 0) {
        messages.push({
          customer: currentCustomer || `Customer ${blockIndex++}`,
          lines: currentBlock
        });
        currentBlock = [];
        currentCustomer = null;
      }
      continue;
    }

    const bracketMatch = trimmed.match(waBracketRegex);
    const dashMatch = trimmed.match(waDashRegex);
    const headerMatch = trimmed.match(headerOnlyRegex);
    const simpleMatch = trimmed.match(simplePrefixRegex);

    if (bracketMatch) {
      if (currentBlock.length > 0) {
        messages.push({ customer: currentCustomer || `Customer ${blockIndex++}`, lines: currentBlock });
        currentBlock = [];
        currentCustomer = null;
      }
      messages.push({
        customer: bracketMatch[2].trim(),
        sent_at: bracketMatch[1].trim(),
        lines: [bracketMatch[3].trim()]
      });
    } else if (dashMatch) {
      if (currentBlock.length > 0) {
        messages.push({ customer: currentCustomer || `Customer ${blockIndex++}`, lines: currentBlock });
        currentBlock = [];
        currentCustomer = null;
      }
      messages.push({
        customer: dashMatch[2].trim(),
        sent_at: dashMatch[1].trim(),
        lines: [dashMatch[3].trim()]
      });
    } else if (headerMatch) {
      // Standalone header on its own line: set customer for subsequent lines
      if (currentBlock.length > 0) {
        messages.push({ customer: currentCustomer || `Customer ${blockIndex++}`, lines: currentBlock });
        currentBlock = [];
      }
      currentCustomer = headerMatch[1].trim();
    } else if (simpleMatch && !/^\d+/.test(trimmed)) {
      // e.g. "Rahul: 2 cakes" (guard against lines like "1: 2 cakes" or "200: cake")
      if (currentBlock.length > 0) {
        messages.push({ customer: currentCustomer || `Customer ${blockIndex++}`, lines: currentBlock });
        currentBlock = [];
        currentCustomer = null;
      }
      messages.push({
        customer: simpleMatch[1].trim(),
        lines: [simpleMatch[2].trim()]
      });
    } else {
      currentBlock.push(trimmed);
    }
  }

  if (currentBlock.length > 0) {
    messages.push({
      customer: currentCustomer || `Customer ${blockIndex++}`,
      lines: currentBlock
    });
  }

  // Group messages by customer
  const grouped = new Map();
  for (const msg of messages) {
    if (!grouped.has(msg.customer)) {
      grouped.set(msg.customer, {
        customer: msg.customer,
        sent_at: msg.sent_at || null,
        rawMessages: []
      });
    }
    const grp = grouped.get(msg.customer);
    grp.rawMessages.push(...msg.lines);
    if (!grp.sent_at && msg.sent_at) grp.sent_at = msg.sent_at;
  }

  return Array.from(grouped.values());
}

export function extractOrdersFromGroups(groups, catalogItems, aliasesByItemId = {}) {
  const extractedOrders = [];

  for (const group of groups) {
    const extractedLines = [];
    const customerDeliveryNotes = [];

    group.rawMessages.forEach((rawMsg, msgIdx) => {
      // Split on newlines, commas or "and" if they separate items
      const parts = rawMsg
        .split(/\b(?:and|,)\b/i)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      for (const part of parts) {
        const norm = normalizeText(part);
        const qtyAction = extractQuantityAndAction(part, norm);
        const quotedPrice = extractQuotedPrice(part);
        const deliveryNotes = extractDeliveryAndNotes(part);

        if (deliveryNotes.deliveryNote) {
          customerDeliveryNotes.push(deliveryNotes.deliveryNote);
        }

        const matchResult = matchCatalogItem(norm, catalogItems, aliasesByItemId);
        const priceResult = reconcilePrice({
          quotedPriceInfo: quotedPrice,
          catalogItem: matchResult.match
        });

        const lineFlags = [
          ...qtyAction.flags,
          ...matchResult.flags,
          ...priceResult.flags
        ];

        extractedLines.push({
          raw_text: part,
          messageIndex: msgIdx,
          action: qtyAction.action,
          item_id: matchResult.match ? matchResult.match.id : null,
          item_name: matchResult.match ? matchResult.match.name : null,
          custom_item_name: !matchResult.match ? cleanText(part) : null,
          quantity: qtyAction.quantity !== null ? qtyAction.quantity : 1,
          unit_price_paise: priceResult.unitPricePaise,
          unit_price_override_paise: priceResult.unitPriceOverridePaise,
          note: deliveryNotes.itemNote,
          status: lineFlags.length > 0 ? 'flagged' : 'pending',
          flags: lineFlags,
          candidates: matchResult.candidates || [],
          origin: 'rule'
        });
      }
    });

    const { consolidated, history } = applyCorrections(extractedLines);
    const finalLines = consolidated.filter(l => l.quantity > 0 || l.flags.includes('cancelled_item'));

    extractedOrders.push({
      customer_label: group.customer,
      delivery_note: customerDeliveryNotes.join(', ') || null,
      history,
      rawMessages: group.rawMessages,
      lines: finalLines
    });
  }

  return extractedOrders;
}
