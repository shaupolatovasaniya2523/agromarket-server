import { Router } from 'express';
import { pool } from '../db/pool.js';
 
const router = Router();
 
// GET /api/orders — заявки вместе с названием товара
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT o.*, p.name AS product_name
    FROM orders o
    LEFT JOIN products p ON p.id = o.product_id
    ORDER BY o.created_at DESC
  `);
  res.json(rows);
});
 
// POST /api/orders — новая заявка (форма из React)
router.post('/', async (req, res) => {
  const { product_id, name, email, phone, quantity, date, comment } =
    req.body || {};
 
  if (!name || !email || !quantity) {
    return res.status(400).json({
      error: 'Поля name, email и quantity обязательны',
    });
  }
  if (Number(quantity) < 10) {
    return res.status(400).json({ error: 'Минимальный объём заказа — 10 кг' });
  }
 
  const { rows } = await pool.query(
    `INSERT INTO orders (product_id, name, email, phone, quantity, delivery_date, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [product_id || null, name, email, phone || null,
     quantity, date || null, comment || null]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/orders/3   тело: { "status": "processing" }

router.patch('/:id', async (req, res) => {
  const { status } = req.body || {};

  // Check whether status was provided
  if (!status) {
    return res.status(400).json({
      error: 'Поле status обязательно'
    });
  }

  try {
    // Update order status in the database
    const { rows } = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    // Check whether the order exists
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Заявка не найдена'
      });
    }

    // Return the updated order
    return res.status(200).json(rows[0]);

  } catch (error) {
    console.error('Error updating order:', error);

    return res.status(500).json({
      error: 'Ошибка сервера'
    });
  }
});

 
export default router;

