
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/categories', () => {

  it('возвращает массив категорий с количеством', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(typeof res.body[0].count).toBe('number');
    // ::int — число, а не строка
  });

  it('сумма count по всем категориям равна количеству товаров', async () => {
    // Получаем категории
    const categoriesRes = await request(app)
      .get('/api/categories');

    // Получаем все товары
    const productsRes = await request(app)
      .get('/api/products');

    // Считаем общее количество товаров по категориям
    const totalCategories = categoriesRes.body.reduce(
      (sum, c) => sum + c.count,
      0
    );

    // Проверяем успешность запросов
    expect(categoriesRes.status).toBe(200);
    expect(productsRes.status).toBe(200);

    // Сравниваем количество товаров
    expect(totalCategories).toBe(productsRes.body.length);
  });

});
