/**
 * Synthetic evaluation dataset for OrderMint.
 * 25 realistic micro-business chat messages labeled across 5 categories:
 * - Clean English
 * - Abbreviations & Typo variants
 * - Hinglish & Number words
 * - Multi-message corrections
 * - Edge cases & Intentionally Ambiguous inputs
 */

export const EVAL_DATASET = [
  // 1. Clean English
  {
    id: 'E01',
    category: 'Clean English',
    text: '2 choc cakes for sat 700 each',
    expectedItem: 'Chocolate Cake',
    expectedQty: 2,
    expectedPricePaise: 70000,
    expectedFlags: []
  },
  {
    id: 'E02',
    category: 'Clean English',
    text: '1 brownie box @250',
    expectedItem: 'Brownie Box',
    expectedQty: 1,
    expectedPricePaise: 25000,
    expectedFlags: []
  },
  {
    id: 'E03',
    category: 'Clean English',
    text: '3 vanilla cake',
    expectedItem: 'Vanilla Cake',
    expectedQty: 3,
    expectedPricePaise: 60000,
    expectedFlags: []
  },
  {
    id: 'E04',
    category: 'Clean English',
    text: 'a dozen cookies',
    expectedItem: 'Cookie Jar',
    expectedQty: 12,
    expectedPricePaise: 20000,
    expectedFlags: []
  },
  {
    id: 'E05',
    category: 'Clean English',
    text: 'half dozen cupcakes',
    expectedItem: 'Cupcakes (6)',
    expectedQty: 6,
    expectedPricePaise: 30000,
    expectedFlags: []
  },

  // 2. Abbreviations & Aliases
  {
    id: 'A01',
    category: 'Abbreviations',
    text: '2 van cakes tomorrow',
    expectedItem: 'Vanilla Cake',
    expectedQty: 2,
    expectedPricePaise: 60000,
    expectedFlags: []
  },
  {
    id: 'A02',
    category: 'Abbreviations',
    text: '1 pkt brownies',
    expectedItem: 'Brownie Box',
    expectedQty: 1,
    expectedPricePaise: 25000,
    expectedFlags: []
  },
  {
    id: 'A03',
    category: 'Abbreviations',
    text: 'dark chocolate cake x2',
    expectedItem: 'Chocolate Cake',
    expectedQty: 2,
    expectedPricePaise: 70000,
    expectedFlags: []
  },
  {
    id: 'A04',
    category: 'Abbreviations',
    text: 'cheesy garlic bread 3',
    expectedItem: 'Garlic Bread',
    expectedQty: 3,
    expectedPricePaise: 14000,
    expectedFlags: []
  },
  {
    id: 'A05',
    category: 'Abbreviations',
    text: 'deluxe thali x2 for lunch',
    expectedItem: 'Veg Thali',
    expectedQty: 2,
    expectedPricePaise: 15000,
    expectedFlags: []
  },

  // 3. Hinglish & Number Words
  {
    id: 'H01',
    category: 'Hinglish',
    text: 'do choc cakes for Sunday',
    expectedItem: 'Chocolate Cake',
    expectedQty: 2,
    expectedPricePaise: 70000,
    expectedFlags: []
  },
  {
    id: 'H02',
    category: 'Hinglish',
    text: 'teen veg thali deliver by 2pm',
    expectedItem: 'Veg Thali',
    expectedQty: 3,
    expectedPricePaise: 15000,
    expectedFlags: []
  },
  {
    id: 'H03',
    category: 'Hinglish',
    text: 'ek mango cheesecake eggless',
    expectedItem: 'Mango Cheesecake',
    expectedQty: 1,
    expectedPricePaise: 85000,
    expectedFlags: []
  },
  {
    id: 'H04',
    category: 'Hinglish',
    text: 'char paneer roll',
    expectedItem: 'Paneer Roll',
    expectedQty: 4,
    expectedPricePaise: 12000,
    expectedFlags: []
  },
  {
    id: 'H05',
    category: 'Hinglish',
    text: 'paanch samosa box',
    expectedItem: 'Samosa Box',
    expectedQty: 5,
    expectedPricePaise: 10000,
    expectedFlags: []
  },

  // 4. Corrections & Price Overrides
  {
    id: 'C01',
    category: 'Price Mismatch',
    text: 'chocolate cake 650 each',
    expectedItem: 'Chocolate Cake',
    expectedQty: 1,
    expectedPricePaise: 70000, // catalog is 70000
    expectedFlags: ['price_mismatch']
  },
  {
    id: 'C02',
    category: 'Price Quoted',
    text: 'samosa box @100',
    expectedItem: 'Samosa Box',
    expectedQty: 1,
    expectedPricePaise: 10000,
    expectedFlags: []
  },

  // 5. Unknowns, Ambiguities & Edge Cases
  {
    id: 'U01',
    category: 'Unknown Item',
    text: '1 mystery pistachio pastry 300',
    expectedItem: null,
    expectedQty: 1,
    expectedFlags: ['unknown_item']
  },
  {
    id: 'U02',
    category: 'Ambiguous Item',
    text: '2 cakes for saturday',
    expectedItem: null, // Plausibly Chocolate Cake or Vanilla Cake
    expectedQty: 2,
    expectedFlags: ['ambiguous_item']
  },
  {
    id: 'U03',
    category: 'Missing Quantity',
    text: 'choc cake for sat',
    expectedItem: 'Chocolate Cake',
    expectedQty: null,
    expectedFlags: ['missing_quantity']
  },
  {
    id: 'U04',
    category: 'Excessive Quantity',
    text: '1500 choc cakes',
    expectedItem: 'Chocolate Cake',
    expectedQty: null,
    expectedFlags: ['excessive_quantity']
  },
  {
    id: 'U05',
    category: 'Unsupported Fraction',
    text: '1/2 kg cake',
    expectedFlags: ['unsupported_fraction']
  },
  {
    id: 'U06',
    category: 'Zero Quantity',
    text: '0 brownie box',
    expectedFlags: ['zero_quantity']
  },
  {
    id: 'U07',
    category: 'Cancel Action',
    text: 'cancel the brownies',
    expectedItem: 'Brownie Box',
    expectedQty: 0,
    action: 'remove'
  },
  {
    id: 'U08',
    category: 'Negative Quantity',
    text: '-5 cookies',
    expectedFlags: ['negative_quantity']
  }
];
