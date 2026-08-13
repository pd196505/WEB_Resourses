-- ============================================================
-- ТЕСТОВЫЕ ДАННЫЕ
-- ============================================================

-- 1. Статусы (справочник)
INSERT INTO statuses (name, description) VALUES
    ('Создана', 'Заявка создана, ожидает обработки'),
    ('Назначена', 'Водитель назначен'),
    ('В пути', 'Груз в пути'),
    ('Доставлена', 'Груз доставлен'),
    ('Отменена', 'Заявка отменена')
ON CONFLICT (id) DO NOTHING;

-- 2. Пользователи (10 клиентов, 3 менеджера, 5 водителей)
INSERT INTO users (username, password_hash, full_name, role, phone) VALUES
    ('client1', 'hash1', 'ООО "Ромашка"', 'client', '+7(495)111-22-01'),
    ('client2', 'hash2', 'ЗАО "Берёзка"', 'client', '+7(495)111-22-02'),
    ('client3', 'hash3', 'ИП Иванов', 'client', '+7(903)123-45-01'),
    ('client4', 'hash4', 'ООО "Лотос"', 'client', '+7(495)111-22-03'),
    ('client5', 'hash5', 'ООО "ТрансГруз"', 'client', '+7(495)111-22-04'),
    ('client6', 'hash6', 'ЗАО "Север"', 'client', '+7(495)111-22-05'),
    ('client7', 'hash7', 'ООО "Юг"', 'client', '+7(495)111-22-06'),
    ('client8', 'hash8', 'ИП Петров', 'client', '+7(903)123-45-02'),
    ('client9', 'hash9', 'ООО "Восток"', 'client', '+7(495)111-22-07'),
    ('client10','hash10','ЗАО "Запад"', 'client', '+7(495)111-22-08');

INSERT INTO users (username, password_hash, full_name, role, phone) VALUES
    ('manager1', 'hash11', 'Иван Смирнов', 'manager', '+7(910)123-45-01'),
    ('manager2', 'hash12', 'Ольга Кузнецова', 'manager', '+7(910)123-45-02'),
    ('manager3', 'hash13', 'Пётр Орлов', 'manager', '+7(910)123-45-03');

INSERT INTO users (username, password_hash, full_name, role, phone) VALUES
    ('driver1', 'hash14', 'Сергей Волков', 'driver', '+7(912)345-67-01'),
    ('driver2', 'hash15', 'Алексей Кузнецов', 'driver', '+7(912)345-67-02'),
    ('driver3', 'hash16', 'Дмитрий Соколов', 'driver', '+7(912)345-67-03'),
    ('driver4', 'hash17', 'Иван Морозов', 'driver', '+7(912)345-67-04'),
    ('driver5', 'hash18', 'Пётр Лебедев', 'driver', '+7(912)345-67-05');

-- 3. Генерация 100 заявок (status_id от 1 до 5)
INSERT INTO orders (client_id, manager_id, driver_id, weight, status_id)
SELECT
    (random() * 9 + 1)::int AS client_id,
    (random() * 2 + 1)::int AS manager_id,
    CASE WHEN random() > 0.2 THEN (random() * 4 + 1)::int ELSE NULL END AS driver_id,
    (random() * 5000 + 100)::numeric(10,2) AS weight,
    (random() * 4 + 1)::int AS status_id
FROM generate_series(1, 100);

-- 4. Документы для доставленных заказов
INSERT INTO documents (order_id, type, file_path)
SELECT 
    id,
    (ARRAY['act', 'ttn'])[(random() * 1 + 1)::int] AS type,
    '/documents/' || id || '_' || 
    (ARRAY['act', 'ttn'])[(random() * 1 + 1)::int] || '.pdf' AS file_path
FROM orders
WHERE status_id = 4  -- 'Доставлена'
ON CONFLICT DO NOTHING;