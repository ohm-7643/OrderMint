import { Router } from 'express';
import { getDb } from '../db/index.js';
import { checkAIStatus, refineWithAI } from '../ai/orderAssistant.js';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const status = await checkAIStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ available: false, error: err.message });
  }
});

router.post('/refine', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Raw text is required' });
    }

    const db = getDb();
    const catalogItems = db.prepare('SELECT id, name, unit_price_paise, unit FROM catalog_items WHERE active = 1').all();

    const result = await refineWithAI(rawText, catalogItems);
    res.json(result);
  } catch (err) {
    res.status(500).json({ applied: false, fallback: true, error: err.message });
  }
});

export default router;
