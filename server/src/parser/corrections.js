/**
 * Multi-message correction and conflict handler for OrderMint.
 * Ensures all modifications are transparently tracked with visible history,
 * and ambiguous corrections are flagged for seller review.
 */

function findTargetMatches(line, consolidated) {
  // 1. Direct item_id match
  if (line.item_id) {
    const direct = consolidated.filter(l => l.item_id === line.item_id);
    if (direct.length > 0) return direct;
  }

  // 2. Exact custom item name match
  if (line.custom_item_name) {
    const nameMatch = consolidated.filter(l =>
      l.custom_item_name &&
      l.custom_item_name.toLowerCase() === line.custom_item_name.toLowerCase()
    );
    if (nameMatch.length > 0) return nameMatch;
  }

  // 3. Keyword / token reference in the correction text (e.g., "actually make cakes 3")
  const normRaw = (line.raw_text || '').toLowerCase();
  const keywordMatches = consolidated.filter(l => {
    const candidateNames = [
      l.item_name,
      l.custom_item_name,
      l.raw_text
    ].filter(Boolean).map(s => s.toLowerCase());

    for (const name of candidateNames) {
      const words = name.split(/\s+/).filter(w => w.length > 2);
      for (const w of words) {
        // e.g. "cake" or "cakes"
        const singular = w.replace(/s$/, '');
        if (new RegExp(`\\b${singular}s?\\b`, 'i').test(normRaw)) {
          return true;
        }
      }
    }
    return false;
  });

  return keywordMatches;
}

export function applyCorrections(lines) {
  const consolidated = [];
  const history = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const msgNum = line.messageIndex ? line.messageIndex + 1 : (i + 1);

    if (line.action === 'remove') {
      const matches = findTargetMatches(line, consolidated);

      if (matches.length === 1) {
        const target = matches[0];
        const oldQty = target.quantity;
        target.quantity = 0;
        target.status = 'flagged';
        target.flags.push('cancelled_item');
        const note = `Cancelled (quantity ${oldQty} → 0, based on message #${msgNum})`;
        target.history = target.history || [];
        target.history.push(note);
        history.push(note);
      } else if (matches.length > 1) {
        line.flags.push('conflicting_correction');
        line.correctionError = `Multiple items match cancellation in message #${msgNum}`;
        consolidated.push(line);
      } else {
        line.flags.push('conflicting_correction');
        line.correctionError = `No matching item found to cancel in message #${msgNum}`;
        consolidated.push(line);
      }
      continue;
    }

    if (line.action === 'set') {
      const matches = findTargetMatches(line, consolidated);

      if (matches.length === 1) {
        const target = matches[0];
        const oldQty = target.quantity;
        target.quantity = line.quantity;
        const note = `Quantity modified (${oldQty} → ${line.quantity}, based on message #${msgNum})`;
        target.history = target.history || [];
        target.history.push(note);
        history.push(note);

        if (line.unit_price_override_paise) {
          target.unit_price_override_paise = line.unit_price_override_paise;
        }
        if (line.note) {
          target.note = target.note ? `${target.note}; ${line.note}` : line.note;
        }
      } else if (matches.length > 1) {
        line.flags.push('conflicting_correction');
        line.correctionError = `Ambiguous target: multiple items match correction in message #${msgNum}`;
        consolidated.push(line);
      } else {
        line.flags.push('conflicting_correction');
        line.correctionError = `Correction refers to an item not found in earlier messages (#${msgNum})`;
        consolidated.push(line);
      }
      continue;
    }

    // Default action: 'add'
    const existing = consolidated.find(l =>
      line.item_id && l.item_id === line.item_id && l.action === 'add'
    );

    if (existing && line.origin !== 'manual') {
      const oldQty = existing.quantity;
      existing.quantity += line.quantity;
      const note = `Quantity increased (${oldQty} + ${line.quantity} → ${existing.quantity}, based on message #${msgNum})`;
      existing.history = existing.history || [];
      existing.history.push(note);
      history.push(note);
    } else {
      line.history = line.history || [];
      consolidated.push(line);
    }
  }

  return { consolidated, history };
}
