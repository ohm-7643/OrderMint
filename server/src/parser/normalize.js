/**
 * Text normalization rules for OrderMint.
 * Normalizes case, common abbreviations, English and Hinglish number words,
 * and punctuation noise while preserving prices, quantities, and keywords.
 */

export const NUMBER_WORDS = {
  // English
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  dozen: 12,
  'half dozen': 6,
  // Hinglish
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10
};

export const COMMON_ABBREVIATIONS = [
  { regex: /\bchoc\b/gi, replacement: 'chocolate' },
  { regex: /\bchoco\b/gi, replacement: 'chocolate' },
  { regex: /\bvan\b/gi, replacement: 'vanilla' },
  { regex: /\bb'day\b|\bbday\b/gi, replacement: 'birthday' },
  { regex: /\bpkts?\b/gi, replacement: 'box' },
  { regex: /\bpcs?\b/gi, replacement: 'piece' },
  { regex: /\bqty\b/gi, replacement: '' },
  { regex: /\btmrw\b|\btmw\b/gi, replacement: 'tomorrow' },
  { regex: /\bsat\b/gi, replacement: 'saturday' },
  { regex: /\bsun\b/gi, replacement: 'sunday' }
];

export function cleanText(text) {
  if (!text) return '';
  return text
    // Remove emojis while preserving basic latin, numbers, currency, and punctuation
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeText(text) {
  if (!text) return '';
  let str = cleanText(text).toLowerCase();

  // Replace common abbreviations
  for (const { regex, replacement } of COMMON_ABBREVIATIONS) {
    str = str.replace(regex, replacement);
  }

  // Replace number words with digits when appropriate
  // Replace compound like "half dozen" first
  str = str.replace(/\bhalf\s+dozen\b/gi, '6');

  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    if (word.includes(' ')) continue; // handled above
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    str = str.replace(wordRegex, String(val));
  }

  // Normalize multipliers: "x 2", "x2", "×2"
  str = str.replace(/[×x]\s*(\d+)/gi, 'x$1');

  return str.replace(/\s+/g, ' ').trim();
}
