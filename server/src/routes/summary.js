import { Router } from 'express';
import { getDb } from '../db/index.js';
import { paiseToINR, multiplyPaise } from '../utils/money.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const db = getDb();

    // Query approved orders for the date (checking either approved_at or created_at matching date)
    const approvedOrders = db.prepare(`
      SELECT id, customer_label, approved_at, created_at
      FROM orders
      WHERE status = 'approved' AND (date(approved_at) = date(?) OR (approved_at IS NULL AND date(created_at) = date(?)))
      ORDER BY id ASC
    `).all(targetDate, targetDate);

    const orderIds = approvedOrders.map(o => o.id);
    if (orderIds.length === 0) {
      return res.json({
        date: targetDate,
        approved_orders_count: 0,
        total_sales_paise: 0,
        total_sales_inr: paiseToINR(0),
        items_breakdown: []
      });
    }

    // Query lines for these approved orders
    const placeholders = orderIds.map(() => '?').join(',');
    const lines = db.prepare(`
      SELECT l.*, c.name as catalog_name
      FROM order_lines l
      LEFT JOIN catalog_items c ON l.item_id = c.id
      WHERE l.order_id IN (${placeholders})
    `).all(...orderIds);

    let totalSalesPaise = 0;
    const itemMap = new Map();

    for (const line of lines) {
      const price = line.unit_price_override_paise !== null && line.unit_price_override_paise !== undefined
        ? line.unit_price_override_paise
        : line.unit_price_paise;

      const lineTotal = multiplyPaise(price, line.quantity);
      totalSalesPaise += lineTotal;

      const itemName = line.catalog_name || line.custom_item_name || 'Custom Item';
      const key = line.item_id ? `cat_${line.item_id}` : `custom_${itemName}`;

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item_id: line.item_id || null,
          item_name: itemName,
          quantity_sold: 0,
          revenue_paise: 0
        });
      }

      const itemStats = itemMap.get(key);
      itemStats.quantity_sold += line.quantity;
      itemStats.revenue_paise += lineTotal;
    }

    const itemsBreakdown = Array.from(itemMap.values()).map(item => ({
      ...item,
      revenue_inr: paiseToINR(item.revenue_paise)
    })).sort((a, b) => b.revenue_paise - a.revenue_paise);

    res.json({
      date: targetDate,
      approved_orders_count: approvedOrders.length,
      total_sales_paise: totalSalesPaise,
      total_sales_inr: paiseToINR(totalSalesPaise),
      items_breakdown: itemsBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
