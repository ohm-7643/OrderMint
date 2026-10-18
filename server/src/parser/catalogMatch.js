/**
 * Catalog matching engine for OrderMint.
 * Follows strict priority:
 * 1. Exact normalized product name
 * 2. Exact normalized alias
 * 3. Phrase match of alias/name with singular/plural support
 * 4. Conservative token-based match (Dice coefficient >= 0.60)
 *
 * Flags ambiguous matches or unknown items. Never guesses wildly.
 */

function stem(word) {
  if (/(?:[sxz]|ch|sh)es$/i.test(word)) return word.slice(0, -2);
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.slice(0, -1);
  return word;
}

function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(t => stem(t))
    .filter(t => t.length > 1 && !['for', 'the', 'and', 'with', 'pcs', 'piece', 'box', 'pkts', 'each', 'sat', 'saturday', 'sun', 'sunday', 'lunch', 'dinner', 'deliver', 'pickup', 'price'].includes(t));
}

function diceCoefficient(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of tokensA) {
    if (setB.has(t)) intersection++;
  }
  return (2 * intersection) / (tokensA.length + tokensB.length);
}

function makeFlexibleRegex(phrase) {
  const words = phrase.trim().split(/\s+/).map(w => {
    const escaped = w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const base = escaped.replace(/(?:es|s)$/i, '');
    return `${base}(?:es|s)?`;
  });
  return new RegExp(`\\b${words.join('\\s+')}\\b`, 'i');
}

export function matchCatalogItem(text, catalogItems, aliasesByItemId = {}) {
  const normText = text.toLowerCase().trim();
  const inputTokens = tokenize(normText);

  // 1. Exact match against product name
  for (const item of catalogItems) {
    if (normText === item.name.toLowerCase() || stem(normText) === stem(item.name.toLowerCase())) {
      return { match: item, method: 'exact_name', flags: [] };
    }
  }

  // 2. Exact match against alias
  for (const item of catalogItems) {
    const aliases = aliasesByItemId[item.id] || [];
    for (const alias of aliases) {
      if (normText === alias.toLowerCase() || stem(normText) === stem(alias.toLowerCase())) {
        return { match: item, method: 'exact_alias', flags: [] };
      }
    }
  }

  // 3. Phrase match
  const phraseMatches = [];
  for (const item of catalogItems) {
    const candidates = [item.name, ...(aliasesByItemId[item.id] || [])];
    for (const phrase of candidates) {
      const phraseRegex = makeFlexibleRegex(phrase);
      if (phraseRegex.test(normText)) {
        if (!phraseMatches.some(m => m.item.id === item.id)) {
          phraseMatches.push({ item, phrase });
        }
        break;
      }
    }
  }

  if (phraseMatches.length === 1) {
    return { match: phraseMatches[0].item, method: 'phrase_match', flags: [] };
  } else if (phraseMatches.length > 1) {
    phraseMatches.sort((a, b) => b.phrase.length - a.phrase.length);
    if (phraseMatches[0].phrase.length > phraseMatches[1].phrase.length * 1.5) {
      return { match: phraseMatches[0].item, method: 'phrase_match_longest', flags: [] };
    }
    return {
      match: null,
      method: 'ambiguous_phrase',
      flags: ['ambiguous_item'],
      candidates: phraseMatches.map(m => m.item)
    };
  }

  // 4. Token overlap match
  const tokenCandidates = [];
  for (const item of catalogItems) {
    const itemTokens = tokenize(item.name);
    let maxScore = diceCoefficient(inputTokens, itemTokens);

    const aliases = aliasesByItemId[item.id] || [];
    for (const alias of aliases) {
      const aTokens = tokenize(alias);
      const score = diceCoefficient(inputTokens, aTokens);
      if (score > maxScore) maxScore = score;
    }

    if (maxScore >= 0.60) {
      tokenCandidates.push({ item, score: maxScore });
    }
  }

  if (tokenCandidates.length === 1) {
    return { match: tokenCandidates[0].item, method: 'token_match', flags: [] };
  } else if (tokenCandidates.length > 1) {
    tokenCandidates.sort((a, b) => b.score - a.score);
    if (tokenCandidates[0].score >= 0.85 && (tokenCandidates[0].score - tokenCandidates[1].score > 0.20)) {
      return { match: tokenCandidates[0].item, method: 'token_match_dominant', flags: [] };
    }
    return {
      match: null,
      method: 'ambiguous_token',
      flags: ['ambiguous_item'],
      candidates: tokenCandidates.map(c => c.item)
    };
  }

  // No match found
  return {
    match: null,
    method: 'none',
    flags: ['unknown_item'],
    candidates: []
  };
}
