import 'dotenv/config';   // ← ПЕРВОЙ строкой: читает .env в process.env
import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';
import { logger } from './middleware/logger.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';   // ← к остальным import
import helmet from 'helmet';   
import categoriesRouter from './routes/categories.js';

const PORT = process.env.PORT || 3000;
const app = express();

const VERSION = (process.env.RENDER_GIT_COMMIT || 'local').slice(0, 7);

if (!process.env.JWT_SECRET) {
  console.error('Не задан JWT_SECRET в .env');
  process.exit(1);
}

app.set('trust proxy', 1);
app.use('/api/categories', categoriesRouter);   
app.use(helmet());                          // ← НОВОЕ: первым middleware
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: '10kb' }));   // ← тело запроса не больше 10 КБ
app.use(logger);
app.use('/api/auth', authRouter); 
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter); 

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));


if (process.env.NODE_ENV !== 'test') {
  app.use(logger);
}

// «Жив ли сервер и есть ли связь с базой?»
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', version: VERSION });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'unavailable', version: VERSION });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.originalUrl} не найден` });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API запущен: http://localhost:${PORT}`);
});

 export default app;      