-- ============================================================
-- ПАРАМЕТРИЧЕСКИЙ СКРИПТ ДЛЯ ОДНОГО СТУДЕНТА
-- Измените номер студента в строке ниже (сейчас '01')
-- ============================================================

DO $$
DECLARE
    student_id  text := '01';
    schema_name text := 'tlk' || student_id;
    seed_val    int := student_id::int;
    client_names text[] := ARRAY[
        'ООО "Ромашка"', 'ЗАО "Берёзка"', 'ИП Иванов', 'ООО "Лотос"',
        'ООО "ТрансГруз"', 'ЗАО "Север"', 'ООО "Юг"', 'ИП Петров',
        'ООО "Восток"', 'ЗАО "Запад"', 'ООО "Газпром"', 'ООО "Лукойл"',
        'ООО "Роснефть"', 'ООО "Сургутнефтегаз"', 'ООО "Татарстан"',
        'ООО "Башкортостан"', 'ООО "Алтай"', 'ООО "Сибирь"',
        'ООО "Урал"', 'ООО "Дальний Восток"'
    ];
    manager_names text[] := ARRAY[
        'Иван Смирнов', 'Ольга Кузнецова', 'Пётр Орлов',
        'Анна Соколова', 'Дмитрий Иванов', 'Елена Петрова',
        'Сергей Васильев', 'Мария Фёдорова', 'Алексей Морозов',
        'Наталья Павлова', 'Владимир Семёнов', 'Татьяна Егорова'
    ];
    driver_names text[] := ARRAY[
        'Сергей Волков', 'Алексей Кузнецов', 'Дмитрий Соколов',
        'Иван Морозов', 'Пётр Лебедев', 'Андрей Попов',
        'Максим Зайцев', 'Евгений Соловьёв', 'Владимир Козлов',
        'Николай Новиков'
    ];
    shuffled_clients text[];
    shuffled_managers text[];
    shuffled_drivers text[];
    client_ids  int[];
    manager_ids int[];
    driver_ids  int[];
    addresses   text[];
    i           int;
    r_client    int;
    r_manager   int;
    r_driver    int;
    r_status    int;
    r_weight    numeric;
    r_pickup    text;
    r_delivery  text;
    cnt         int;
BEGIN
    -- 1. Очистка и сброс последовательностей
    EXECUTE format('TRUNCATE TABLE %I.documents CASCADE', schema_name);
    EXECUTE format('TRUNCATE TABLE %I.orders CASCADE', schema_name);
    EXECUTE format('TRUNCATE TABLE %I.users CASCADE', schema_name);
    EXECUTE format('TRUNCATE TABLE %I.statuses CASCADE', schema_name);
    
    EXECUTE format('ALTER SEQUENCE %I.statuses_id_seq RESTART WITH 1', schema_name);
    EXECUTE format('ALTER SEQUENCE %I.users_id_seq RESTART WITH 1', schema_name);
    EXECUTE format('ALTER SEQUENCE %I.orders_id_seq RESTART WITH 1', schema_name);
    EXECUTE format('ALTER SEQUENCE %I.documents_id_seq RESTART WITH 1', schema_name);
    RAISE NOTICE 'Очистка и сброс последовательностей выполнены.';

    -- 2. Вставка статусов с ID 1..6
    EXECUTE format('
        INSERT INTO %I.statuses (id, name, description) VALUES
            (1, ''Создана'', ''Заявка создана, ожидает обработки''),
            (2, ''Назначена'', ''Водитель назначен''),
            (3, ''В пути'', ''Груз в пути''),
            (4, ''Доставлена'', ''Груз доставлен''),
            (5, ''Отменена'', ''Заявка отменена''),
            (6, ''Получена'', ''Заявка получена клиентом'')
        ON CONFLICT (id) DO NOTHING
    ', schema_name);

    EXECUTE format('SELECT COUNT(*) FROM %I.statuses', schema_name) INTO cnt;
    RAISE NOTICE 'Вставлено статусов: %', cnt;

    -- 3. Перемешиваем имена с использованием seed
    PERFORM setseed(seed_val / 100.0);
    
    SELECT array_agg(name ORDER BY random()) INTO shuffled_clients FROM unnest(client_names) AS name;
    SELECT array_agg(name ORDER BY random()) INTO shuffled_managers FROM unnest(manager_names) AS name;
    SELECT array_agg(name ORDER BY random()) INTO shuffled_drivers FROM unnest(driver_names) AS name;

    -- 4. Вставка клиентов с ID 1..10
    FOR i IN 1..10 LOOP
        EXECUTE format('
            INSERT INTO %I.users (id, username, password_hash, full_name, role, phone)
            VALUES ($1, $2, ''123'', $3, ''client'', $4)
        ', schema_name) USING i, 'client' || i, shuffled_clients[i], '+7(495)111-22-' || LPAD(i::text, 2, '0');
    END LOOP;

    -- 5. Вставка менеджеров с ID 11..13
    FOR i IN 1..3 LOOP
        EXECUTE format('
            INSERT INTO %I.users (id, username, password_hash, full_name, role, phone)
            VALUES ($1, $2, ''123'', $3, ''manager'', $4)
        ', schema_name) USING 10 + i, 'manager' || i, shuffled_managers[i], '+7(910)123-45-' || LPAD(i::text, 2, '0');
    END LOOP;

    -- 6. Вставка водителей с ID 14..18
    FOR i IN 1..5 LOOP
        EXECUTE format('
            INSERT INTO %I.users (id, username, password_hash, full_name, role, phone)
            VALUES ($1, $2, ''123'', $3, ''driver'', $4)
        ', schema_name) USING 13 + i, 'driver' || i, shuffled_drivers[i], '+7(912)345-67-' || LPAD(i::text, 2, '0');
    END LOOP;

    -- Проверка количества пользователей
    EXECUTE format('SELECT COUNT(*) FROM %I.users', schema_name) INTO cnt;
    RAISE NOTICE 'Вставлено пользователей: %', cnt;

    -- Получаем массивы ID
    EXECUTE format('SELECT array_agg(id) FROM %I.users WHERE role = ''client''', schema_name) INTO client_ids;
    EXECUTE format('SELECT array_agg(id) FROM %I.users WHERE role = ''manager''', schema_name) INTO manager_ids;
    EXECUTE format('SELECT array_agg(id) FROM %I.users WHERE role = ''driver''', schema_name) INTO driver_ids;

    RAISE NOTICE 'ID клиентов: %', client_ids;
    RAISE NOTICE 'ID менеджеров: %', manager_ids;
    RAISE NOTICE 'ID водителей: %', driver_ids;

    addresses := ARRAY[
        'Москва, Тверская, 1', 'Москва, Арбат, 15',
        'Москва, Ленинградский проспект, 33', 'Москва, Кутузовский проспект, 12',
        'Москва, Новый Арбат, 8', 'Санкт-Петербург, Невский проспект, 10',
        'Санкт-Петербург, Лиговский проспект, 44', 'Казань, Кремлёвская, 6',
        'Екатеринбург, Ленина, 22', 'Новосибирск, Красный проспект, 50'
    ];

    -- 7. Генерация 100 заявок
    FOR i IN 1..100 LOOP
        r_client := client_ids[floor(random() * array_length(client_ids, 1) + 1)];
        r_manager := manager_ids[floor(random() * array_length(manager_ids, 1) + 1)];
        r_status := floor(random() * 6 + 1)::int;

        IF r_status = 1 THEN
            r_driver := NULL;
        ELSE
            r_driver := driver_ids[floor(random() * array_length(driver_ids, 1) + 1)];
        END IF;

        r_weight := (random() * 5000 + 100)::numeric(10,2);
        r_pickup   := addresses[floor(random() * array_length(addresses, 1) + 1)];
        r_delivery := addresses[floor(random() * array_length(addresses, 1) + 1)];

        EXECUTE format('
            INSERT INTO %I.orders (client_id, manager_id, driver_id, weight, status_id, pickup_address, delivery_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        ', schema_name) USING r_client, r_manager, r_driver, r_weight, r_status, r_pickup, r_delivery;
    END LOOP;

    EXECUTE format('SELECT COUNT(*) FROM %I.orders', schema_name) INTO cnt;
    RAISE NOTICE 'Вставлено заявок: %', cnt;

    -- 8. Документы для доставленных
    EXECUTE format('
        INSERT INTO %I.documents (order_id, type, file_path)
        SELECT id,
               (ARRAY[''act'', ''ttn''])[floor(random() * 2 + 1)],
               ''/documents/'' || id || ''_'' || (ARRAY[''act'', ''ttn''])[floor(random() * 2 + 1)] || ''.pdf''
        FROM %I.orders
        WHERE status_id = 4
    ', schema_name, schema_name);

    EXECUTE format('SELECT COUNT(*) FROM %I.documents', schema_name) INTO cnt;
    RAISE NOTICE 'Вставлено документов: %', cnt;

    RAISE NOTICE 'Все данные успешно загружены в схему %.', schema_name;
END $$;