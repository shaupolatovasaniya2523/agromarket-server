import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
 
describe('Каталог: публичный доступ', () => {
  it('GET /api/products возвращает непустой список', async () => {
    // Act: выполняем действие — отправляем запрос
    const res = await request(app).get('/api/products');
 
    // Assert: проверяем результат
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
 
  it('у товара есть id, name и price', async () => {
    const res = await request(app).get('/api/products');
    const product = res.body[0];
 
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
  });
 
  it('несуществующий товар — 404', async () => {
    const res = await request(app).get('/api/products/999999');
    expect(res.status).toBe(404);
  });
 
  // ЗАДАНИЕ: тест «GET /api/products/:id возвращает тот же товар, что в списке»
  it('GET /api/products/:id возвращает тот же товар, что в списке', async () => {
    // 1. Получаем список товаров
    const listRes = await request(app).get('/api/products');
    const firstProduct = listRes.body[0];

    // 2. Запрашиваем конкретный товар по его id
    const singleRes = await request(app).get(`/api/products/${firstProduct.id}`);

    // 3. Проверяем статус и совпадение имени
    expect(singleRes.status).toBe(200);
    expect(singleRes.body.name).toBe(firstProduct.name);
  });
});