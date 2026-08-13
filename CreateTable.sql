-- ============================================================
-- 1. УДАЛЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ (CASCADE)
-- ============================================================

DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS statuses CASCADE;

-- ============================================================
-- 2. СОЗДАНИЕ ТАБЛИЦ
-- ============================================================

CREATE TABLE clients (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    inn         VARCHAR(12),
    email       VARCHAR(255),
    phone       VARCHAR(20),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drivers (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    license_number  VARCHAR(50) UNIQUE,
    status          VARCHAR(50) DEFAULT 'свободен'
);

CREATE TABLE statuses (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    driver_id   INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    weight      NUMERIC(10,2) NOT NULL CHECK (weight > 0),
    status      VARCHAR(50) DEFAULT 'создана',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    file_path   VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. ИНДЕКСЫ
-- ============================================================

CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_driver_id ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_documents_order_id ON documents(order_id);

-- ============================================================
-- 4. ТЕСТОВЫЕ ДАННЫЕ
-- ============================================================

-- 4.1. Статусы
INSERT INTO statuses (code, name, description) VALUES
    ('created',   'Создана',       'Заявка создана, ожидает обработки'),
    ('assigned',  'Назначена',     'Водитель назначен'),
    ('in_transit','В пути',        'Груз в пути'),
    ('delivered', 'Доставлена',    'Груз доставлен'),
    ('cancelled', 'Отменена',      'Заявка отменена');

-- 4.2. Клиенты (10 штук)
INSERT INTO clients (name, inn, email, phone) VALUES
    ('ООО "Ромашка"', '123456789012', 'info@romashka.ru', '+7(495)111-22-33'),
    ('ЗАО "Берёзка"', '987654321098', 'info@berezka.ru', '+7(495)444-55-66'),
    ('ИП Иванов', '123456789012', 'ivanov@mail.ru', '+7(903)123-45-67'),
    ('ООО "Лотос"', '123456789013', 'info@lotos.ru', '+7(495)111-22-44'),
    ('ООО "ТрансГруз"', '123456789014', 'info@transgruz.ru', '+7(495)111-22-55'),
    ('ЗАО "Север"', '123456789015', 'info@sever.ru', '+7(495)111-22-66'),
    ('ООО "Юг"', '123456789016', 'info@ug.ru', '+7(495)111-22-77'),
    ('ИП Петров', '123456789017', 'petrov@mail.ru', '+7(903)123-45-78'),
    ('ООО "Восток"', '123456789018', 'info@vostok.ru', '+7(495)111-22-88'),
    ('ЗАО "Запад"', '123456789019', 'info@zapad.ru', '+7(495)111-22-99');

-- 4.3. Водители (5 штук)
INSERT INTO drivers (full_name, phone, license_number, status) VALUES
    ('Сергей Волков', '+7(912)345-67-89', 'AB123456', 'свободен'),
    ('Алексей Кузнецов', '+7(922)345-67-89', 'CD789012', 'свободен'),
    ('Дмитрий Соколов', '+7(932)345-67-89', 'EF345678', 'свободен'),
    ('Иван Морозов', '+7(942)345-67-89', 'GH901234', 'свободен'),
    ('Пётр Лебедев', '+7(952)345-67-89', 'IJ567890', 'свободен');

-- 4.4. Заказы (50 штук)
INSERT INTO orders (client_id, driver_id, weight, status)
SELECT
    (random() * 9 + 1)::int AS client_id,           -- случайный клиент от 1 до 10
    CASE WHEN random() > 0.3 THEN (random() * 4 + 1)::int ELSE NULL END AS driver_id, -- 70% с водителем
    (random() * 5000 + 100)::numeric(10,2) AS weight, -- вес от 100 до 5100 кг
    (ARRAY['created', 'assigned', 'in_transit', 'delivered', 'cancelled'])[(random() * 4 + 1)::int] AS status
FROM generate_series(1, 50);
-- ============================================================
-- 5. ДОКУМЕНТЫ ДЛЯ ДОСТАВЛЕННЫХ ЗАКАЗОВ
-- ============================================================

INSERT INTO documents (order_id, type, file_path)
SELECT 
    id,
    (ARRAY['act', 'ttn'])[(random() * 1 + 1)::int] AS type,
    '/documents/' || id || '_' || 
    (ARRAY['act', 'ttn'])[(random() * 1 + 1)::int] || '.pdf' AS file_path
FROM orders
WHERE status = 'delivered'
ON CONFLICT DO NOTHING;