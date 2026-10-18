import { inrToPaise } from '../utils/money.js';

/**
 * Extracts quoted prices from message text and reconciles with catalog prices.
 */
export function extractQuotedPrice(text) {
  if (!text) return null;

  // Patterns:
  // 1. "@ 700", "@700", "@ ₹700"
  // 2. "700 each", "700 per piece", "700/-"
  // 3. "₹700", "Rs. 700", "Rs 700", "INR 700"
  // 4. "for 700"
  const patterns = [
    /@\s*(?:[₹]|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i,
    /(?:[₹]|rs\.?|inr)\s*(\d+(?:\.\d{1,2})?)/i,
    /\b(\d+(?:\.\d{1,2})?)\s*(?:\/[-]|each|per\s+(?:piece|pkt|box|kg|item))\b/i,
    /\bfor\s+(?:[₹]|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const paise = inrToPaise(match[1]);
        return {
          quotedPaise: paise,
          rawMatch: match[0]
        };
      } catch (err) {
        // Continue searching if parsing failed
      }
    }
  }

  return null;
}

export function reconcilePrice({ quotedPriceInfo, catalogItem }) {
  const flags = [];
  let unitPricePaise = 0;
  let unitPriceOverridePaise = null;

  if (catalogItem) {
    unitPricePaise = catalogItem.unit_price_paise;
  }

  if (quotedPriceInfo) {
    const quoted = quotedPriceInfo.quotedPaise;
    if (catalogItem) {
      if (quoted !== catalogItem.unit_price_paise) {
        flags.push('price_mismatch');
        unitPriceOverridePaise = quoted;
      }
    } else {
      // No catalog item match yet, but quoted price exists
      unitPricePaise = quoted;
      unitPriceOverridePaise = quoted;
    }
  } else if (!catalogItem) {
    flags.push('missing_price');
  }

  return {
    unitPricePaise,
    unitPriceOverridePaise,
    flags
  };
}
