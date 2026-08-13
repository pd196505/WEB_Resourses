-- ============================================================
-- 1. БЕЗОПАСНОЕ УДАЛЕНИЕ СХЕМ (ЕСЛИ СУЩЕСТВУЮТ)
-- ============================================================

DROP SCHEMA IF EXISTS TLK01 CASCADE;
DROP SCHEMA IF EXISTS TLK02 CASCADE;

-- ============================================================
-- 2. БЕЗОПАСНОЕ УДАЛЕНИЕ РОЛЕЙ (С ПРОВЕРКОЙ)
-- ============================================================

DO $$
BEGIN
    -- Отзываем привилегии и удаляем stud01
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'stud01') THEN
        REVOKE CONNECT ON DATABASE postgres FROM stud01;
        REVOKE ALL PRIVILEGES ON SCHEMA public FROM stud01;
        REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM stud01;
        DROP ROLE stud01;
    END IF;

    -- Отзываем привилегии и удаляем stud02
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'stud02') THEN
        REVOKE CONNECT ON DATABASE postgres FROM stud02;
        REVOKE ALL PRIVILEGES ON SCHEMA public FROM stud02;
        REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM stud02;
        DROP ROLE stud02;
    END IF;
END $$;

-- ============================================================
-- 3. СОЗДАНИЕ РОЛЕЙ (ПОЛЬЗОВАТЕЛЕЙ)
-- ============================================================

CREATE ROLE stud01 WITH LOGIN PASSWORD '123';
CREATE ROLE stud02 WITH LOGIN PASSWORD '123';

-- ============================================================
-- 4. ПРАВО ПОДКЛЮЧЕНИЯ К БАЗЕ postgres
-- ============================================================

GRANT CONNECT ON DATABASE postgres TO stud01, stud02;

-- ============================================================
-- 5. СОЗДАНИЕ СХЕМ
-- ============================================================

CREATE SCHEMA TLK01;
CREATE SCHEMA TLK02;

-- ============================================================
-- 6. НАЗНАЧЕНИЕ ВЛАДЕЛЬЦЕВ
-- ============================================================

ALTER SCHEMA TLK01 OWNER TO stud01;
ALTER SCHEMA TLK02 OWNER TO stud02;

-- ============================================================
-- 7. ПРАВА ДЛЯ СТУДЕНТОВ (МИНИМАЛЬНЫЙ НАБОР)
-- ============================================================

-- stud01 → TLK01
GRANT USAGE ON SCHEMA TLK01 TO stud01;
GRANT CREATE ON SCHEMA TLK01 TO stud01;
GRANT ALL PRIVILEGES ON ALL TABLES     IN SCHEMA TLK01 TO stud01;
GRANT ALL PRIVILEGES ON ALL SEQUENCES  IN SCHEMA TLK01 TO stud01;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS  IN SCHEMA TLK01 TO stud01;

-- stud02 → TLK02
GRANT USAGE ON SCHEMA TLK02 TO stud02;
GRANT CREATE ON SCHEMA TLK02 TO stud02;
GRANT ALL PRIVILEGES ON ALL TABLES     IN SCHEMA TLK02 TO stud02;
GRANT ALL PRIVILEGES ON ALL SEQUENCES  IN SCHEMA TLK02 TO stud02;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS  IN SCHEMA TLK02 TO stud02;

-- ============================================================
-- 8. НАСТРОЙКА SEARCH_PATH (УДОБСТВО)
-- ============================================================

ALTER ROLE stud01 SET search_path = TLK01, public;
ALTER ROLE stud02 SET search_path = TLK02, public;

-- ============================================================
-- 9. ЗАЩИТА PUBLIC (РЕКОМЕНДУЕТСЯ)
-- ============================================================

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- ============================================================
-- 10. ИТОГОВАЯ ПРОВЕРКА (ОПЦИОНАЛЬНО)
-- ============================================================

-- SELECT usename FROM pg_user WHERE usename LIKE 'stud%';
-- SELECT nspname, nspowner::regrole FROM pg_namespace WHERE nspname LIKE 'TLK%';