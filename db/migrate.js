
import 'dotenv/config';

import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

// Миграция НЕ удаляет данные.
// Создаёт только те таблицы, которых ещё нет.
// Её можно запускать несколько раз.

const statements = [

  // 1. Таблица пользователей
  `CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // 2. Таблица товаров
  `CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category    TEXT,
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // 3. Таблица заказов
  // REFERENCES users: пользователь должен существовать
  `CREATE TABLE IF NOT EXISTS orders (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total      NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    status     TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // 4. Таблица товаров внутри заказов
  // Создаётся после products и orders,
  // так как содержит ссылки на обе таблицы.
  `CREATE TABLE IF NOT EXISTS order_items (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    price      NUMERIC(10, 2) NOT NULL CHECK (price >= 0)
  )`,

  // 5. Индексы для ускорения поиска
  `CREATE INDEX IF NOT EXISTS idx_orders_user_id
   ON orders(user_id)`,

  `CREATE INDEX IF NOT EXISTS idx_order_items_order_id
   ON order_items(order_id)`,

  `CREATE INDEX IF NOT EXISTS idx_order_items_product_id
   ON order_items(product_id)`
];


async function migrate() {

  // Выполняем создание таблиц по очереди
  for (const sql of statements) {
    await pool.query(sql);
  }

  // Создание администратора
  // Только если заданы ADMIN_EMAIL и ADMIN_PASSWORD
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Администратор', $1, $2, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [ADMIN_EMAIL.toLowerCase(), hash]
    );

    console.log('Администратор проверен или создан');
  }

  console.log(
    `Миграция выполнена (инструкций: ${statements.length})`
  );
}


// Запуск миграции
migrate()
  .catch((err) => {
    console.error('Миграция не удалась:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
