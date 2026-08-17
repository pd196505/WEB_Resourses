// ============================================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ И ОБЩИЕ ФУНКЦИИ
// ============================================================
const state = {  
    currentPage: 'main',  
    user: null,  
    orders: [],  
    filteredOrders: [],  
    clients: [],  
    statuses: [],  
    managers: [], 
    drivers: [],
    statusFilter: null,
    driverFilter: null
};

const API_URL = 'http://localhost:8000';

function getStatusLabel(status) { return status; }

async function apiFetch(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ошибка ${response.status}: ${error}`);
    }
    return response.json();
}

async function login(username, password, role) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка входа');
    }
    const user = await response.json();
    if (user.role !== role) {
        throw new Error(`Роль не совпадает. Ожидается ${role}, получена ${user.role}`);
    }
    return user;
}

async function loadOrders() {
    if (!state.user) return;
    try {
        const url = `/orders?role=${state.user.role}&user_id=${state.user.id}`;
        state.orders = await apiFetch(url);
        if (state.user.role === 'driver') {
            const allowedStatuses = ['Назначена', 'В пути', 'Доставлена'];
            state.orders = state.orders.filter(o => allowedStatuses.includes(o.status));
        }
        state.filteredOrders = [...state.orders];
        console.log('Загруженные заявки:', state.orders);
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        state.orders = [];
        state.filteredOrders = [];
    }
}

async function loadStatuses() {
    try { state.statuses = await apiFetch('/statuses'); } catch (error) { console.error(error); state.statuses = []; }
}

async function loadManagers() {
    try {
        const response = await fetch(`${API_URL}/users?role=manager`);
        state.managers = await response.json();
        console.log('Загруженные менеджеры:', state.managers);
    } catch (error) {
        console.error('Ошибка загрузки менеджеров:', error);
        state.managers = [];
    }
}

async function loadDrivers() {
    try {
        const response = await fetch(`${API_URL}/users?role=driver`);
        state.drivers = await response.json();
        console.log('Загруженные водители:', state.drivers);
    } catch (error) {
        console.error('Ошибка загрузки водителей:', error);
        state.drivers = [];
    }
}

function getRandomManager() {
    if (!state.managers || state.managers.length === 0) return null;
    return state.managers[Math.floor(Math.random() * state.managers.length)];
}

function filterOrdersByStatus(status) {
    state.statusFilter = status;
    applyFilters();
}

function filterOrdersByDriver(driverName) {
    state.driverFilter = driverName;
    applyFilters();
}

function applyFilters() {
    let result = [...state.orders];
    if (state.statusFilter) {
        result = result.filter(o => o.status === state.statusFilter);
    }
    if (state.driverFilter) {
        result = result.filter(o => o.driver_name === state.driverFilter);
    }
    state.filteredOrders = result;
    renderCurrentPage();
}

function resetFilters() {
    state.statusFilter = null;
    state.driverFilter = null;
    state.filteredOrders = [...state.orders];
    renderCurrentPage();
}

function getUniqueStatuses() {
    const statuses = new Set();
    const orders = state.filteredOrders.length > 0 ? state.filteredOrders : state.orders;
    orders.forEach(o => statuses.add(o.status));
    return Array.from(statuses);
}

function getUniqueDrivers() {
    const drivers = new Set();
    const orders = state.filteredOrders.length > 0 ? state.filteredOrders : state.orders;
    orders.forEach(o => {
        if (o.driver_name) drivers.add(o.driver_name);
    });
    return Array.from(drivers);
}

// ============================================================
// КАРТА САЙТА
// ============================================================
function showSitemap() {
    const existingModal = document.getElementById('sitemap-modal');
    if (existingModal) {
        existingModal.remove();
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'sitemap-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: 'Inter', sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 30px 40px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        position: relative;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 12px;
        right: 16px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #5F6368;
    `;
    closeBtn.onclick = () => modal.remove();

    const title = document.createElement('h2');
    title.textContent = '🗺️ Карта сайта';
    title.style.cssText = `
        margin-top: 0;
        color: #202124;
        font-weight: 700;
        font-size: 24px;
    `;

    const tree = document.createElement('ul');
    tree.style.cssText = `
        list-style: none;
        padding-left: 0;
        font-size: 16px;
        line-height: 2;
    `;

    // Структура страниц с указанием роли для перехода
    const pages = [
        { name: 'Главная', link: 'main' },
        { name: 'Вход в систему', link: 'login' },
        { name: 'Личный кабинет клиента', link: 'lkk', role: 'client', children: [
            { name: 'Создание заявки', link: 'create-order', role: 'client' }
        ]},
        { name: 'Личный кабинет менеджера', link: 'lkm', role: 'manager' },
        { name: 'Личный кабинет водителя', link: 'lkv', role: 'driver' },
        { name: 'Контакты', link: 'contacts' },
        { name: 'О компании', link: 'about' }
    ];

    function buildTree(items, level = 0) {
        let html = '';
        items.forEach(item => {
            const indent = level * 20;
            // Определяем, какой обработчик вызывать
            let clickHandler = '';
            if (item.link === 'main') {
                clickHandler = `navigate('main'); document.getElementById('sitemap-modal').remove();`;
            } else if (item.link === 'login') {
                clickHandler = `navigate('login'); document.getElementById('sitemap-modal').remove();`;
            } else if (item.link === 'contacts' || item.link === 'about') {
                clickHandler = `navigate('${item.link}'); document.getElementById('sitemap-modal').remove();`;
            } else if (item.link === 'create-order') {
                clickHandler = `navigateCreateOrder(); document.getElementById('sitemap-modal').remove();`;
            } else {
                // Для ЛК используем функцию с проверкой роли
                const role = item.role || 'client';
                clickHandler = `navigateWithRole('${item.link}', '${role}'); document.getElementById('sitemap-modal').remove();`;
            }
            html += `<li style="padding-left:${indent}px; cursor:pointer;" onclick="${clickHandler}">
                ${item.name}
            </li>`;
            if (item.children && item.children.length) {
                html += `<ul style="list-style:none; padding-left:0;">`;
                html += buildTree(item.children, level + 1);
                html += `</ul>`;
            }
        });
        return html;
    }

    tree.innerHTML = buildTree(pages);

    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(tree);
    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ============================================================
// НАВИГАЦИЯ С ПРОВЕРКОЙ РОЛИ
// ============================================================
function navigateWithRole(target, requiredRole) {
    // Если пользователь не залогинен или его роль не совпадает
    if (!state.user || state.user.role !== requiredRole) {
        // Сбрасываем пользователя, если он есть, но роль другая
        if (state.user) {
            state.user = null;
            state.orders = [];
            state.filteredOrders = [];
        }
        // Переходим на форму входа с указанием роли
        navigate('login', requiredRole);
        return;
    }
    // Иначе переходим в нужный ЛК
    navigate(target);
}

function navigateCreateOrder() {
    if (!state.user || state.user.role !== 'client') {
        if (state.user) {
            state.user = null;
            state.orders = [];
            state.filteredOrders = [];
        }
        navigate('login', 'client');
        return;
    }
    navigate('create-order');
}

function handleLogoClick(e) {
    e.preventDefault();
    if (state.currentPage === 'main') {
        showSitemap();
    } else {
        navigate('main');
    }
}

// ============================================================
// КОНТЕКСТНОЕ МЕНЮ (СТАТУС)
// ============================================================
function showContextMenu(e, status) {
    e.preventDefault();
    const menu = document.getElementById('context-menu');
    const statuses = getUniqueStatuses();
    if (!statuses.length) {
        menu.style.display = 'none';
        return;
    }
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.style.display = 'block';
    menu.innerHTML = '';
    const resetItem = document.createElement('div');
    resetItem.className = 'context-item';
    resetItem.textContent = '🔄 Сбросить фильтр';
    resetItem.style.borderBottom = '1px solid #e0e0e0';
    resetItem.onclick = () => {
        filterOrdersByStatus(null);
        menu.style.display = 'none';
    };
    menu.appendChild(resetItem);
    statuses.forEach(s => {
        const item = document.createElement('div');
        item.className = 'context-item';
        item.textContent = s;
        if (state.statusFilter === s) {
            item.style.backgroundColor = '#e8f0fe';
            item.style.fontWeight = 'bold';
        }
        item.onclick = () => {
            filterOrdersByStatus(s);
            menu.style.display = 'none';
        };
        menu.appendChild(item);
    });
}

// ============================================================
// КОНТЕКСТНОЕ МЕНЮ (ВОДИТЕЛЬ — ФИЛЬТР)
// ============================================================
function showDriverContextMenu(e, driver) {
    e.preventDefault();
    const menu = document.getElementById('context-menu');
    const drivers = getUniqueDrivers();
    if (!drivers.length) {
        menu.style.display = 'none';
        return;
    }
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.style.display = 'block';
    menu.innerHTML = '';
    const resetItem = document.createElement('div');
    resetItem.className = 'context-item';
    resetItem.textContent = '🔄 Сбросить фильтр';
    resetItem.style.borderBottom = '1px solid #e0e0e0';
    resetItem.onclick = () => {
        filterOrdersByDriver(null);
        menu.style.display = 'none';
    };
    menu.appendChild(resetItem);
    drivers.forEach(d => {
        const item = document.createElement('div');
        item.className = 'context-item';
        item.textContent = d;
        if (state.driverFilter === d) {
            item.style.backgroundColor = '#e8f0fe';
            item.style.fontWeight = 'bold';
        }
        item.onclick = () => {
            filterOrdersByDriver(d);
            menu.style.display = 'none';
        };
        menu.appendChild(item);
    });
}

// ============================================================
// КОНТЕКСТНОЕ МЕНЮ (ВОДИТЕЛЬ — ВЫБОР)
// ============================================================
function showDriverSelectionMenu(e, orderId, currentDriver) {
    e.preventDefault();
    const menu = document.getElementById('context-menu');
    if (!state.drivers || state.drivers.length === 0) {
        alert('Список водителей не загружен');
        return;
    }
    let x = e.clientX || window.innerWidth / 2 - 100;
    let y = e.clientY || window.innerHeight / 2 - 100;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
    menu.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'context-item';
    header.textContent = '👨✈️ Выберите водителя';
    header.style.fontWeight = 'bold';
    header.style.borderBottom = '1px solid #e0e0e0';
    header.style.cursor = 'default';
    menu.appendChild(header);
    if (currentDriver && currentDriver !== '') {
        const currentItem = document.createElement('div');
        currentItem.className = 'context-item';
        currentItem.textContent = '✅ Текущий: ' + currentDriver;
        currentItem.style.backgroundColor = '#e8f0fe';
        currentItem.style.cursor = 'default';
        menu.appendChild(currentItem);
    }
    state.drivers.forEach(function(d) {
        const item = document.createElement('div');
        item.className = 'context-item';
        const isCurrent = d.full_name === currentDriver;
        item.textContent = isCurrent ? '✓ ' + d.full_name : d.full_name;
        if (isCurrent) {
            item.style.backgroundColor = '#e8f0fe';
            item.style.fontWeight = 'bold';
        }
        item.onclick = function() {
            menu.style.display = 'none';
            assignDriver(orderId, d.id);
        };
        menu.appendChild(item);
    });
    if (currentDriver && currentDriver !== '') {
        const removeItem = document.createElement('div');
        removeItem.className = 'context-item';
        removeItem.textContent = '❌ Снять водителя';
        removeItem.style.borderTop = '1px solid #e0e0e0';
        removeItem.style.color = '#EA4335';
        removeItem.onclick = function() {
            menu.style.display = 'none';
            assignDriver(orderId, null);
        };
        menu.appendChild(removeItem);
    }
}

async function assignDriver(orderId, driverId) {
    try {
        const order = state.orders.find(o => o.id === orderId);
        if (!order) {
            alert('Заявка не найдена');
            return;
        }
        const allowedStatuses = ['Создана', 'Назначена'];
        if (!allowedStatuses.includes(order.status)) {
            alert('❌ Нельзя назначить водителя. Статус заявки должен быть "Создана" или "Назначена".');
            return;
        }
        const assignedStatus = state.statuses.find(s => s.name === 'Назначена');
        if (!assignedStatus) {
            alert('Статус "Назначена" не найден');
            return;
        }
        await apiFetch(`/order/${orderId}/assign`, {
            method: 'PUT',
            body: JSON.stringify({ 
                driver_id: driverId,
                status_id: assignedStatus.id  
            }),
        });
        alert('✅ Водитель назначен!');
        await loadOrders();
        resetFilters();
        renderCurrentPage();
    } catch (error) {
        console.error('Ошибка назначения водителя:', error);
        alert('❌ Ошибка назначения водителя: ' + error.message);
    }
}

// ============================================================
// СОЗДАНИЕ ЗАЯВКИ
// ============================================================
async function createOrder(pickupAddress, deliveryAddress, weight) {
    if (!state.user) {
        alert('Пользователь не авторизован');
        return;
    }
    try {
        if (!state.managers || state.managers.length === 0) {
            await loadManagers();
        }
        const manager = getRandomManager();
        if (!manager) {
            alert('Нет доступных менеджеров в системе');
            return;
        }
        const createdStatus = state.statuses.find(s => s.name === 'Создана');
        if (!createdStatus) {
            alert('Статус "Создана" не найден');
            return;
        }
        const orderData = {
            client_id: state.user.id,
            manager_id: manager.id,
            driver_id: null,
            weight: parseFloat(weight),
            status_id: createdStatus.id,
            pickup_address: pickupAddress,
            delivery_address: deliveryAddress
        };
        console.log('📦 Данные заявки:', orderData);
        await apiFetch('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
        alert('✅ Заявка создана! Менеджер: ' + manager.full_name);
        await loadOrders();
        resetFilters();
        navigate('lkk');
    } catch (error) {
        console.error('❌ Ошибка создания заявки:', error);
        alert('❌ Ошибка создания заявки: ' + error.message);
    }
}

async function updateOrderStatus(orderId, statusId) {
    try {
        await apiFetch(`/order/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status_id: statusId }),
        });
        alert('✅ Статус обновлён');
        await loadOrders();
        resetFilters();
        renderCurrentPage();
    } catch (error) {
        alert('❌ Ошибка обновления статуса: ' + error.message);
    }
}

// ============================================================
// ОТРИСОВКА СТРАНИЦ
// ============================================================
function renderMain() {
    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="handleLogoClick(event)">ТЛК Портал</div>
            <div></div>
        </div>
        <div style="text-align:center;padding:20px 0 0 0;">
            <h1 style="font-size:32px;font-weight:700;color:#202124;">ТЛК Портал</h1>
            <p style="color:#5F6368;font-size:18px;margin-top:8px;">Личный кабинет для клиентов и партнёров</p>
        </div>
        <div class="main-grid">
            <div class="main-card" onclick="navigateWithRole('lkk', 'client')"><h3>👤 Личный кабинет клиента</h3><p>Оформляйте заявки</p></div>
            <div class="main-card" onclick="navigateWithRole('lkm', 'manager')"><h3>📋 Панель менеджера</h3><p>Управляйте всеми заявками</p></div>
            <div class="main-card" onclick="navigateWithRole('lkv', 'driver')"><h3>🚛 Личный кабинет водителя</h3><p>Отслеживайте рейсы</p></div>
            <div class="main-card" onclick="navigate('contacts')"><h3>📞 Контакты</h3><p>Свяжитесь с нами</p></div>
            <div class="main-card" onclick="navigate('about')"><h3>ℹ️ О компании</h3><p>Узнайте о нас</p></div>
        </div>
    `;
}

function renderLogin(role) {
    const roleValue = role || '';
    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="handleLogoClick(event)">ТЛК Портал</div>
            <div></div>
        </div>
        <div class="form-container" style="margin:40px auto;max-width:400px;">
            <h2 style="font-size:28px;font-weight:700;margin-bottom:8px;">Вход в систему</h2>
            <p style="color:#5F6368;margin-bottom:24px;">Введите учётные данные</p>
            <div class="form-group">
                <label>Роль</label>
                <input type="text" id="login-role" placeholder="client / manager / driver" value="${roleValue}">
            </div>
            <div class="form-group"><label>Логин</label><input type="text" id="login-username" placeholder="Введите логин" value=""></div>
            <div class="form-group"><label>Пароль</label><input type="password" id="login-password" placeholder="Введите пароль" value=""></div>
            <button class="btn-primary" style="width:100%;" onclick="handleLogin()">Войти</button>
            <div style="margin-top:16px;text-align:center;font-size:14px;color:#5F6368;">
                Примеры: client1/123, manager1/123, driver1/123
            </div>
        </div>
    `;
}

async function handleLogin() {
    const role = document.getElementById('login-role').value.trim();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!role || !username || !password) {
        alert('Заполните все поля');
        return;
    }
    try {
        const user = await login(username, password, role);
        state.user = user;
        await loadStatuses();
        await loadManagers();
        await loadDrivers();
        await loadOrders();
        resetFilters();
        if (role === 'client') navigate('lkk');
        else if (role === 'manager') navigate('lkm');
        else if (role === 'driver') navigate('lkv');
        else {
            alert('Неизвестная роль. Войдите как client, manager или driver.');
            navigate('main');
        }
    } catch (error) {
        alert('❌ Ошибка входа: ' + error.message);
    }
}

function navigate(page, param = null) {
    state.currentPage = page;
    const pages = {
        main: renderMain,
        login: () => renderLogin(param),
        lkk: renderLKK,
        lkm: renderLKM,
        lkv: renderLKV,
        'create-order': renderCreateOrder,
        contacts: renderContacts,
        about: renderAbout
    };
    (pages[page] || renderMain)();
}

function renderCurrentPage() {
    const page = state.currentPage;
    if (page === 'lkk') renderLKK();
    else if (page === 'lkm') renderLKM();
    else if (page === 'lkv') renderLKV();
}

// ============================================================
// СОЗДАНИЕ ЗАЯВКИ (страница)
// ============================================================
function renderCreateOrder() {
    if (!state.user || state.user.role !== 'client') {
        navigate('login', 'client');
        return;
    }
    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="handleLogoClick(event)">ТЛК Портал</div>
            <div class="user-info">
                <span class="name">${escapeHtml(state.user.full_name)}</span>
            </div>
        </div>
        <h1 class="page-title">Новая заявка</h1>
        <div class="form-container">
            <h3 style="margin-bottom:10px;">📍 Адрес отправления</h3>
            <div class="form-group"><label>Город</label><input type="text" id="pickup-city" placeholder="Введите город"></div>
            <div class="form-group"><label>Улица</label><input type="text" id="pickup-street" placeholder="Введите улицу"></div>
            <div class="form-group"><label>Дом</label><input type="text" id="pickup-house" placeholder="Введите дом"></div>
            <h3 style="margin:20px 0 10px 0;">📍 Адрес доставки</h3>
            <div class="form-group"><label>Город</label><input type="text" id="delivery-city" placeholder="Введите город"></div>
            <div class="form-group"><label>Улица</label><input type="text" id="delivery-street" placeholder="Введите улицу"></div>
            <div class="form-group"><label>Дом</label><input type="text" id="delivery-house" placeholder="Введите дом"></div>
            <div class="form-group"><label>Вес (кг)</label><input type="number" id="order-weight" placeholder="Введите вес"></div>
            <button class="btn-primary" onclick="handleCreateOrder()">Создать заявку</button>
        </div>
    `;
}

async function handleCreateOrder() {
    const pickupCity = document.getElementById('pickup-city').value;
    const pickupStreet = document.getElementById('pickup-street').value;
    const pickupHouse = document.getElementById('pickup-house').value;
    const deliveryCity = document.getElementById('delivery-city').value;
    const deliveryStreet = document.getElementById('delivery-street').value;
    const deliveryHouse = document.getElementById('delivery-house').value;
    const weight = document.getElementById('order-weight').value;
    if (!pickupCity || !pickupStreet || !pickupHouse || !deliveryCity || !deliveryStreet || !deliveryHouse || !weight) {
        alert('Заполните все поля');
        return;
    }
    const pickupAddress = `${pickupCity}, ${pickupStreet}, ${pickupHouse}`;
    const deliveryAddress = `${deliveryCity}, ${deliveryStreet}, ${deliveryHouse}`;
    await createOrder(pickupAddress, deliveryAddress, weight);
}

// ============================================================
// КОНТАКТЫ И О КОМПАНИИ
// ============================================================
function renderContacts() {
    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="handleLogoClick(event)">ТЛК Портал</div>
            <div></div>
        </div>
        <h1 class="page-title">Контакты</h1>
        <div style="padding:20px 40px;font-size:18px;">
            <p>📞 Телефон: +7 (495) 123-45-67</p>
            <p>✉️ Email: info@tlk.ru</p>
            <p>📍 Адрес: г. Москва, ул. Тверская, 10</p>
        </div>
    `;
}

function renderAbout() {
    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="handleLogoClick(event)">ТЛК Портал</div>
            <div></div>
        </div>
        <h1 class="page-title">О компании</h1>
        <div style="padding:20px 40px;font-size:16px;max-width:800px;line-height:1.6;">
            <p>ООО «ТрансЛогистик» — российская транспортная компания, осуществляющая грузовые автомобильные перевозки по территории Российской Федерации.</p>
            <p>Предприятие обслуживает юридических лиц — промышленные заводы, строительные организации, торговые сети, дистрибьюторские компании.</p>
            <p>Штатная структура:</p>
            <ul style="padding-left:20px;">
                <li>18 менеджеров по работе с клиентами</li>
                <li>10 диспетчеров</li>
                <li>210 водителей</li>
            </ul>
        </div>
    `;
}

// ============================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ЭКРАНИРОВАНИЯ
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#039;';
        return m;
    });
}

// ============================================================
// КОНТЕКСТНОЕ МЕНЮ (HTML)
// ============================================================
const contextMenu = document.createElement('div');
contextMenu.id = 'context-menu';
contextMenu.style.cssText = `
    position: fixed;
    display: none;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    min-width: 150px;
    z-index: 1000;
    padding: 4px 0;
    font-size: 14px;
    font-family: inherit;
`;
document.body.appendChild(contextMenu);

const style = document.createElement('style');
style.textContent = `
    .context-item {
        padding: 8px 16px;
        cursor: pointer;
        transition: background 0.15s;
    }
    .context-item:hover {
        background: #f1f3f4;
    }
`;
document.head.appendChild(style);

document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu')) {
        const menu = document.getElementById('context-menu');
        if (menu) menu.style.display = 'none';
    }
});

document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.status-cell') && !e.target.closest('.driver-cell')) {
        const menu = document.getElementById('context-menu');
        if (menu) menu.style.display = 'none';
    }
});

// ============================================================
// ДЕЛАЕМ ФУНКЦИИ ГЛОБАЛЬНЫМИ
// ============================================================
window.showDriverSelectionMenu = showDriverSelectionMenu;
window.assignDriver = assignDriver;
window.filterOrdersByStatus = filterOrdersByStatus;
window.filterOrdersByDriver = filterOrdersByDriver;
window.showContextMenu = showContextMenu;
window.showDriverContextMenu = showDriverContextMenu;
window.handleLogoClick = handleLogoClick;
window.showSitemap = showSitemap;
window.handleLogin = handleLogin;
window.navigateWithRole = navigateWithRole;
window.navigateCreateOrder = navigateCreateOrder;

// ============================================================
// ЗАПУСК
// ============================================================
navigate('main');