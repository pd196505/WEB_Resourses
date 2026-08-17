-- ============================================================
-- ПАРАМЕТРИЧЕСКИЙ СКРИПТ ДЛЯ ОДНОГО СТУДЕНТА
-- Измените номер студента в строке ниже (сейчас '01')
-- ============================================================

DO $$
DECLARE
    student_id  text := '01';   -- ← здесь меняем номер
    role_name   text := 'stud' || student_id;
    schema_name text := 'tlk' || student_id;
BEGIN
    -- 1. Удаляем схему (каскадно) – она удалит все объекты и перестанет быть зависимостью для роли
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);

    -- 2. Удаляем роль, если существует
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        -- Отзываем привилегии (на случай, если они остались)
        EXECUTE format('REVOKE CONNECT ON DATABASE postgres FROM %I', role_name);
        -- Теперь можно удалить роль
        EXECUTE format('DROP ROLE %I', role_name);
    END IF;

    -- 3. Создаём роль
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD ''123''', role_name);
    EXECUTE format('GRANT CONNECT ON DATABASE postgres TO %I', role_name);

    -- 4. Создаём схему
    EXECUTE format('CREATE SCHEMA %I', schema_name);
    EXECUTE format('ALTER SCHEMA %I OWNER TO %I', schema_name, role_name);

    -- 5. Права на схему
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', schema_name, role_name);
    EXECUTE format('GRANT CREATE ON SCHEMA %I TO %I', schema_name, role_name);

    -- 6. Настройка search_path для роли
    EXECUTE format('ALTER ROLE %I SET search_path = %I, public', role_name, schema_name);

    -- 7. Защита public
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;

    RAISE NOTICE 'Схема % и роль % созданы успешно.', schema_name, role_name;
END $$;