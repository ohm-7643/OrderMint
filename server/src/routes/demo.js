import { Router } from 'express';
import { getDb } from '../db/index.js';
import { seedCatalog, seedDemoOrders, resetDemoData } from '../db/seed.js';

const router = Router();

router.post('/load', (req, res) => {
  try {
    const db = getDb();
    seedCatalog(db);
    seedDemoOrders(db);
    res.json({ message: 'Demo catalog and sample orders loaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset', (req, res) => {
  try {
    const db = getDb();
    resetDemoData(db);
    res.json({ message: 'Demo data removed. Real business orders were preserved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
