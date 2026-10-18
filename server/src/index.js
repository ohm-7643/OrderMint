import express from 'express';
import cors from 'cors';
import { getDb } from './db/index.js';

import catalogRouter from './routes/catalog.js';
import importRouter from './routes/import.js';
import ordersRouter from './routes/orders.js';
import summaryRouter from './routes/summary.js';
import aiRouter from './routes/ai.js';
import demoRouter from './routes/demo.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// Restrict CORS to local development origin
const allowedOrigins = [
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'OrderMint API',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// Route mounts
app.use('/api/catalog', catalogRouter);
app.use('/api/import', importRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/ai', aiRouter);
app.use('/api/demo', demoRouter);
app.use('/api/settings', settingsRouter);

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[OrderMint Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start listening if run directly
let server = null;
if (process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].includes('nodemon'))) {
  // Initialize db schema
  getDb();
  server = app.listen(PORT, HOST, () => {
    console.log(`[OrderMint API] Running at http://${HOST}:${PORT}`);
  });
}

export { app, server };
export default app;
