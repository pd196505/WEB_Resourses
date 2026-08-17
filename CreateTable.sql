-- ============================================================
-- ПАРАМЕТРИЧЕСКИЙ СКРИПТ ДЛЯ ОДНОГО СТУДЕНТА
-- Измените номер студента в строке ниже (сейчас '01')
-- ============================================================

DO $$
DECLARE
    student_id  text := '01';   -- ← здесь меняем номер
    schema_name text := 'tlk' || student_id;
    role_name   text := 'stud' || student_id;
BEGIN
    -- Устанавливаем search_path для работы в схеме студента
    EXECUTE format('SET search_path TO %I, public', schema_name);

    -- Удаляем таблицы, если они уже существуют
    EXECUTE 'DROP TABLE IF EXISTS documents CASCADE';
    EXECUTE 'DROP TABLE IF EXISTS orders CASCADE';
    EXECUTE 'DROP TABLE IF EXISTS statuses CASCADE';
    EXECUTE 'DROP TABLE IF EXISTS users CASCADE';

    -- Создаём таблицу пользователей
    EXECUTE '
        CREATE TABLE users (
            id            SERIAL PRIMARY KEY,
            username      VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name     VARCHAR(255) NOT NULL,
            role          VARCHAR(20) NOT NULL CHECK (role IN (''client'', ''manager'', ''driver'')),
            phone         VARCHAR(20),
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ';

    -- Создаём справочник статусов
    EXECUTE '
        CREATE TABLE statuses (
            id          SERIAL PRIMARY KEY,
            name        VARCHAR(100) NOT NULL,
            description TEXT
        )
    ';

    -- Создаём таблицу заявок
    EXECUTE '
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
        )
    ';

    -- Создаём таблицу документов
    EXECUTE '
        CREATE TABLE documents (
            id          SERIAL PRIMARY KEY,
            order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            type        VARCHAR(50) NOT NULL CHECK (type IN (''act'', ''ttn'')),
            file_path   VARCHAR(500),
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ';

    -- Создаём индексы для ускорения запросов
    EXECUTE 'CREATE INDEX idx_orders_client_id ON orders(client_id)';
    EXECUTE 'CREATE INDEX idx_orders_manager_id ON orders(manager_id)';
    EXECUTE 'CREATE INDEX idx_orders_driver_id ON orders(driver_id)';
    EXECUTE 'CREATE INDEX idx_orders_status_id ON orders(status_id)';
    EXECUTE 'CREATE INDEX idx_orders_created_at ON orders(created_at)';
    EXECUTE 'CREATE INDEX idx_documents_order_id ON documents(order_id)';

    -- ==== ВАЖНО: выдаём права на созданные таблицы ====
    -- Это даёт роли stud01 полный доступ ко всем объектам в схеме
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO %I', schema_name, role_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO %I', schema_name, role_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA %I TO %I', schema_name, role_name);

    RAISE NOTICE 'Таблицы созданы и права выданы в схеме %.', schema_name;
END $$;