-- SET search_path TO tlk01, public;

-- ============================================================
-- УДАЛЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ (ЕСЛИ ЕСТЬ)
-- ============================================================

DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS statuses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- СОЗДАНИЕ ТАБЛИЦ
-- ============================================================

-- 1. Пользователи (все роли)
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('client', 'manager', 'driver')),
    phone         VARCHAR(20),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Статусы (справочник)
CREATE TABLE statuses (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT
);

-- 3. Заявки (добавлены поля для адресов)
CREATE TABLE orders (
    id                SERIAL PRIMARY KEY,
    client_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manager_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    weight            NUMERIC(10,2) NOT NULL CHECK (weight > 0),
    status_id         INTEGER NOT NULL REFERENCES statuses(id) ON DELETE RESTRICT,
    pickup_address    TEXT NOT NULL,
    delivery_address  TEXT NOT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Документы (акты, ТТН)
CREATE TABLE documents (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL CHECK (type IN ('act', 'ttn')),
    file_path   VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ИНДЕКСЫ
-- ============================================================

CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_manager_id ON orders(manager_id);
CREATE INDEX idx_orders_driver_id ON orders(driver_id);
CREATE INDEX idx_orders_status_id ON orders(status_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_documents_order_id ON documents(order_id);