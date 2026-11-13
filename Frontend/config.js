// ============================================================
// КОНФИГУРАЦИЯ ЭКЗЕМПЛЯРА ФРОНТЕНДА
// ============================================================
// Студент меняет ОДНУ строку — DEFAULT_SCHEMA на свою схему.
// Например, студент 5 ставит 'tlk05', студент 12 — 'tlk12'.
// Логины в портале остаются прежними: client1/123, manager1/123, driver1/123.
// ============================================================
(function () {
    // ─── МЕНЯЙТЕ ЗДЕСЬ НОМЕР СВОЕЙ СХЕМЫ ─────────────────────
    const DEFAULT_SCHEMA = 'tlk10';
    // ─────────────────────────────────────────────────────────

    const DEFAULT_API_URL = 'http://10.2.9.17:8000';

    // ─── НОВОЕ: адрес публичного портала Wagtail CMS ─────────
    // Пока CMS не развёрнута — оставляем localhost:8001.
    // В продакшене заменить на реальный домен/IP.
    const DEFAULT_CMS_URL = 'http://localhost:8001';
    const CMS_TITLE = 'Справочник тарифов и направлений';
    // ─────────────────────────────────────────────────────────

    // Опциональное переопределение через URL:
    //   index.html?schema=tlk12           → другая схема (для отладки)
    //   index.html?api=http://host:9000   → другой бэкенд
    //   index.html?cms=http://host:8001   → другой адрес CMS
    const params = new URLSearchParams(window.location.search);
    const schemaFromUrl = params.get('schema');
    const apiFromUrl = params.get('api');
    const cmsFromUrl = params.get('cms');

    const SCHEMA = (schemaFromUrl || DEFAULT_SCHEMA).toLowerCase();
    const API_URL = apiFromUrl || DEFAULT_API_URL;
    const CMS_URL = cmsFromUrl || DEFAULT_CMS_URL;

    if (!/^tlk\d{2}$/.test(SCHEMA)) {
        console.error('[TLK] Некорректная схема:', SCHEMA);
        alert('Ошибка конфигурации фронтенда: SCHEMA должна быть вида tlkNN (например, tlk01).');
    }

    window.TLK_CONFIG = {
        SCHEMA,
        API_URL,
        CMS_URL,     // НОВОЕ
        CMS_TITLE    // НОВОЕ
    };
    console.log('[TLK] Конфигурация фронтенда:', window.TLK_CONFIG);
})();