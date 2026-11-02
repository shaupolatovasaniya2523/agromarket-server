import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [requireAuth, requireRole('admin')]; // цепочка из двух middleware

function validateProduct(body) {
  const { name, price } = body;
  if (!name || !String(name).trim()) return 'Поле name обязательно';
  const n = Number(price);
  if (price === undefined || price === '' || !Number.isInteger(n) || n < 0) {
    return 'Поле price должно быть целым числом ≥ 0';
  }
  return null;
}

// GET /api/products?search=мол — доступно всем
router.get('/', async (req, res) => {
  const search = req.query.search || '';
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE name ILIKE $1 ORDER BY id',
    [`%${search}%`]
  );
  res.json(rows);
});

// GET /api/products/2 — доступно всем
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE id = $1',
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// POST /api/products — только для администратора
router.post('/', adminOnly, async (req, res) => {
  const body = req.body || {};
  const error = validateProduct(body);
  if (error) return res.status(400).json({ error });

  const { name, category, price, unit, image } = body;
  const { rows } = await pool.query(
    `INSERT INTO products (name, category, price, unit, image)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, category ?? null, Number(price), unit ?? 'кг', image ?? null]
  );
  res.status(201).json(rows[0]);
});

// PUT /api/products/5 — заменить товар целиком (только для администратора)
router.put('/:id', adminOnly, async (req, res) => {
  const body = req.body || {};
  const error = validateProduct(body);
  if (error) return res.status(400).json({ error });

  const { name, category, price, unit, image } = body;
  const { rows } = await pool.query(
    `UPDATE products
     SET name = $1, category = $2, price = $3, unit = $4, image = $5
     WHERE id = $6
     RETURNING *`,
    [name, category ?? null, Number(price), unit ?? 'кг', image ?? null, req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// DELETE /api/products/5 — только для администратора
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM products WHERE id = $1',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    return res.status(204).end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;