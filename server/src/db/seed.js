import { getDb } from './index.js';

export const DEMO_CATALOG = [
  {
    name: 'Chocolate Cake',
    unitPricePaise: 70000,
    unit: 'piece',
    aliases: ['choc cake', 'chocolate cake', 'cocoa cake', 'dark chocolate cake']
  },
  {
    name: 'Vanilla Cake',
    unitPricePaise: 60000,
    unit: 'piece',
    aliases: ['van cake', 'vanilla cake', 'plain cake']
  },
  {
    name: 'Brownie Box',
    unitPricePaise: 25000,
    unit: 'box',
    aliases: ['brownies', 'brownie', 'brownie box', 'fudge brownies']
  },
  {
    name: 'Cupcakes (6)',
    unitPricePaise: 30000,
    unit: 'box',
    aliases: ['cupcake', 'cupcakes', 'cupcake box']
  },
  {
    name: 'Cookie Jar',
    unitPricePaise: 20000,
    unit: 'jar',
    aliases: ['cookies', 'cookie', 'cookie jar', 'choco cookies']
  },
  {
    name: 'Veg Thali',
    unitPricePaise: 15000,
    unit: 'meal',
    aliases: ['thali', 'veg thali', 'deluxe thali']
  },
  {
    name: 'Paneer Roll',
    unitPricePaise: 12000,
    unit: 'piece',
    aliases: ['paneer roll', 'panner roll', 'paneer wrap']
  },
  {
    name: 'Samosa Box',
    unitPricePaise: 10000,
    unit: 'box',
    aliases: ['samosa', 'samosas', 'samosa box', 'mini samosas']
  },
  {
    name: 'Mango Cheesecake',
    unitPricePaise: 85000,
    unit: 'piece',
    aliases: ['cheesecake', 'mango cake', 'mango cheesecake']
  },
  {
    name: 'Garlic Bread',
    unitPricePaise: 14000,
    unit: 'piece',
    aliases: ['cheesy garlic bread', 'garlic bread', 'garlic toast']
  }
];

export function seedCatalog(db) {
  const insertItem = db.prepare(`
    INSERT INTO catalog_items (name, unit_price_paise, unit, active)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(name) DO UPDATE SET
      unit_price_paise = excluded.unit_price_paise,
      unit = excluded.unit
  `);

  const insertAlias = db.prepare(`
    INSERT OR IGNORE INTO catalog_aliases (item_id, alias)
    VALUES (?, ?)
  `);

  const getItemId = db.prepare(`SELECT id FROM catalog_items WHERE name = ? COLLATE NOCASE`);

  const transaction = db.transaction(() => {
    for (const item of DEMO_CATALOG) {
      insertItem.run(item.name, item.unitPricePaise, item.unit);
      const row = getItemId.get(item.name);
      if (row) {
        for (const alias of item.aliases) {
          insertAlias.run(row.id, alias.toLowerCase().trim());
        }
      }
    }
  });

  transaction();
  return DEMO_CATALOG.length;
}

export function resetDemoData(db) {
  const transaction = db.transaction(() => {
    // Only delete orders where is_demo = 1
    db.prepare(`DELETE FROM orders WHERE is_demo = 1`).run();
  });
  transaction();
}

export function seedDemoOrders(db) {
  seedCatalog(db);

  const getItem = db.prepare(`SELECT id, unit_price_paise FROM catalog_items WHERE name = ?`);
  const chocCake = getItem.get('Chocolate Cake');
  const brownie = getItem.get('Brownie Box');
  const vanCake = getItem.get('Vanilla Cake');
  const samosa = getItem.get('Samosa Box');

  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // 1. Approved Demo Order for Priya Sharma
    const insOrder = db.prepare(`
      INSERT INTO orders (customer_label, delivery_note, status, is_demo, created_at, approved_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `);

    const order1 = insOrder.run(
      'Priya Sharma',
      'Deliver by Saturday 5 PM, eggless preferred',
      'approved',
      now,
      now
    );

    const insLine = db.prepare(`
      INSERT INTO order_lines (
        order_id, raw_text, item_id, quantity, unit_price_paise, status, flags, origin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (chocCake) {
      insLine.run(order1.lastInsertRowid, '2 choc cakes for sat 700 each', chocCake.id, 2, chocCake.unit_price_paise, 'resolved', '[]', 'rule');
    }
    if (brownie) {
      insLine.run(order1.lastInsertRowid, '1 brownie box 250', brownie.id, 1, brownie.unit_price_paise, 'resolved', '[]', 'rule');
    }

    // 2. Draft Demo Order for Rahul Mehta
    const order2 = insOrder.run(
      'Rahul Mehta',
      'Tomorrow lunch delivery',
      'draft',
      now,
      null
    );

    if (vanCake) {
      insLine.run(order2.lastInsertRowid, '2 vanilla cakes for tmrw', vanCake.id, 2, vanCake.unit_price_paise, 'pending', '[]', 'rule');
    }
    if (samosa) {
      insLine.run(order2.lastInsertRowid, '1 samosa box @100', samosa.id, 1, samosa.unit_price_paise, 'pending', '[]', 'rule');
    }
  });

  transaction();
}

// CLI runner if invoked directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const db = getDb();
  console.log('[OrderMint] Seeding demo catalog and orders...');
  seedCatalog(db);
  seedDemoOrders(db);
  console.log('[OrderMint] Seed complete.');
}
