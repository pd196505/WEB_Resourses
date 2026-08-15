const state = { currentPage: 'main', user: null, orders: [], clients: [], statuses: [], managers: [] };
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

// ============================================================
// АВТОРИЗАЦИЯ (ВХОД)
// ============================================================

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

// ============================================================
// ЗАГРУЗКА ДАННЫХ
// ============================================================

async function loadOrders() {
    if (!state.user) return;
    try {
        const url = `/orders?role=${state.user.role}&user_id=${state.user.id}`;
        state.orders = await apiFetch(url);
        console.log('Загруженные заявки:', state.orders);
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        state.orders = [];
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

function getRandomManager() {
    if (!state.managers || state.managers.length === 0) return null;
    return state.managers[Math.floor(Math.random() * state.managers.length)];
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
        navigate('lkm');
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
            <div class="logo" onclick="navigate('main')">ТЛК Портал</div>
            <div></div>
        </div>
        <div style="text-align:center;padding:20px 0 0 0;">
            <h1 style="font-size:32px;font-weight:700;color:#202124;">ТЛК Портал</h1>
            <p style="color:#5F6368;font-size:18px;margin-top:8px;">Личный кабинет для клиентов и партнёров</p>
        </div>
        <div class="main-grid">
            <div class="main-card" onclick="navigate('login','client')"><h3>👤 Личный кабинет клиента</h3><p>Оформляйте заявки</p></div>
            <div class="main-card" onclick="navigate('login','manager')"><h3>📋 Панель менеджера</h3><p>Управляйте всеми заявками</p></div>
            <div class="main-card" onclick="navigate('login','driver')"><h3>🚛 Личный кабинет водителя</h3><p>Отслеживайте рейсы</p></div>
            <div class="main-card" onclick="navigate('contacts')"><h3>📞 Контакты</h3><p>Свяжитесь с нами</p></div>
            <div class="main-card" onclick="navigate('about')"><h3>ℹ️ О компании</h3><p>Узнайте о нас</p></div>
        </div>
    `;
}

function renderLogin(role) {
    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="navigate('main')">ТЛК Портал</div>
            <div></div>
        </div>
        <div class="form-container" style="margin:40px auto;max-width:400px;">
            <h2 style="font-size:28px;font-weight:700;margin-bottom:8px;">Вход в систему</h2>
            <p style="color:#5F6368;margin-bottom:24px;">Роль: ${role}</p>
            <div class="form-group"><label>Логин</label><input type="text" id="login-username" placeholder="Введите логин" value=""></div>
            <div class="form-group"><label>Пароль</label><input type="password" id="login-password" placeholder="Введите пароль" value=""></div>
            <button class="btn-primary" style="width:100%;" onclick="handleLogin('${role}')">Войти</button>
            <div style="margin-top:16px;text-align:center;font-size:14px;color:#5F6368;">Введите логин и пароль</div>
        </div>
    `;
}

async function handleLogin(role) {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        alert('Введите логин и пароль');
        return;
    }

    try {
        const user = await login(username, password, role);
        state.user = user;
        await loadStatuses();
        await loadManagers();
        await loadOrders();

        if (role === 'client') navigate('lkk');
        else if (role === 'manager') navigate('lkm');
        else if (role === 'driver') navigate('lkv');

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
        'edit-order': () => renderEditOrder(param),
        contacts: renderContacts,
        about: renderAbout
    };
    (pages[page] || renderMain)();
}

// ============================================================
// ОТРИСОВКА ЛИЧНЫХ КАБИНЕТОВ
// ============================================================

function renderLKK() {
    let rows = state.orders.map(o => {
        const date = new Date(o.created_at);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
        <tr>
            <td>${o.id}</td>
            <td>${formattedDate}</td>
            <td>${o.weight}</td>
            <td><span class="status status-${o.status}">${o.status}</span></td>
            <td>${o.pickup_address || 'Не указан'}</td>
            <td>${o.delivery_address || 'Не указан'}</td>
            <td>${o.manager_name || 'Не назначен'}</td>
        </tr>
    `}).join('');

    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="navigate('main')">ТЛК Портал</div>
            <div class="user-info">
                <span class="name">${state.user.full_name}</span>
                <span class="back-btn" onclick="navigate('main')" style="cursor:pointer; font-size:20px; margin-left:15px;">←</span>
            </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 40px 0 40px;">
            <h1 class="page-title" style="padding:0;">Мои заявки</h1>
            <button class="btn-primary" onclick="navigate('create-order')">+ Создать заявку</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Дата</th>
                        <th>Вес (кг)</th>
                        <th>Статус</th>
                        <th>Адрес отправления</th>
                        <th>Адрес доставки</th>
                        <th>Менеджер</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="7" style="text-align:center;color:#5F6368;">Нет заявок</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function renderLKM() {
    let rows = state.orders.map(o => `
        <tr style="cursor:pointer;" onclick="navigate('edit-order', ${o.id})">
            <td>${o.id}</td>
            <td>${o.client_name}</td>
            <td>${o.weight}</td>
            <td><span class="status status-${o.status}">${o.status}</span></td>
            <td><span style="color:#1A73E8;">✏️ редактировать</span></td>
        </tr>
    `).join('');

    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="navigate('main')">ТЛК Портал</div>
            <div class="user-info">
                <span class="name">${state.user.full_name}</span>
                <span class="back-btn" onclick="navigate('main')" style="cursor:pointer; font-size:20px; margin-left:15px;">←</span>
            </div>
        </div>
        <h1 class="page-title">Все заявки</h1>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Клиент</th>
                        <th>Вес</th>
                        <th>Статус</th>
                        <th>Действие</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="5" style="text-align:center;">Нет заявок</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function renderLKV() {
    let rows = state.orders.map(o => `
        <tr>
            <td>${o.id}</td>
            <td>${o.client_name}</td>
            <td>${o.weight}</td>
            <td><span class="status status-${o.status}">${o.status}</span></td>
        </tr>
    `).join('');

    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="navigate('main')">ТЛК Портал</div>
            <div class="user-info">
                <span class="name">${state.user.full_name}</span>
                <span class="back-btn" onclick="navigate('main')" style="cursor:pointer; font-size:20px; margin-left:15px;">←</span>
            </div>
        </div>
        <h1 class="page-title">Мои рейсы</h1>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Клиент</th>
                        <th>Вес</th>
                        <th>Статус</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="4" style="text-align:center;">Нет рейсов</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================================
// СОЗДАНИЕ ЗАЯВКИ
// ============================================================

function renderCreateOrder() {
    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="navigate('main')">ТЛК Портал</div>
            <div class="user-info">
                <span class="name">${state.user.full_name}</span>
                <span class="back-btn" onclick="navigate('lkk')" style="cursor:pointer; font-size:20px; margin-left:15px;">←</span>
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
// РЕДАКТИРОВАНИЕ ЗАЯВКИ
// ============================================================

function renderEditOrder(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        document.getElementById('app').innerHTML = '<div style="padding:40px;">Заявка не найдена</div>';
        return;
    }

    let options = state.statuses.map(s =>
        `<option value="${s.id}" ${s.name === order.status ? 'selected' : ''}>${s.name}</option>`
    ).join('');

    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="navigate('main')">ТЛК Портал</div>
            <div class="user-info">
                <span class="name">${state.user.full_name}</span>
                <span class="back-btn" onclick="navigate('lkm')" style="cursor:pointer; font-size:20px; margin-left:15px;">←</span>
            </div>
        </div>
        <h1 class="page-title">Редактирование заявки №${orderId}</h1>
        <div class="form-container">
            <div class="form-group"><label>Статус</label><select id="edit-status">${options}</select></div>
            <button class="btn-primary" onclick="handleUpdateStatus(${orderId})">Сохранить статус</button>
        </div>
    `;
}

async function handleUpdateStatus(orderId) {
    const statusId = parseInt(document.getElementById('edit-status').value);
    await updateOrderStatus(orderId, statusId);
}

// ============================================================
// КОНТАКТЫ И О КОМПАНИИ
// ============================================================

function renderContacts() {
    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="navigate('main')">ТЛК Портал</div>
            <div></div>
        </div>
        <a class="back-link" onclick="navigate('main')">← На главную</a>
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
            <div class="logo" onclick="navigate('main')">ТЛК Портал</div>
            <div></div>
        </div>
        <a class="back-link" onclick="navigate('main')">← На главную</a>
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
// ЗАПУСК
// ============================================================

navigate('main');