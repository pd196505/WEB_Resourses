// ============================================================
// ЛИЧНЫЙ КАБИНЕТ КЛИЕНТА (LKK) — КЛИК ПО НОМЕРУ ЗАЯВКИ
// ============================================================

function renderLKK() {
    console.log('🔥 renderLKK() вызвана');

    const orders = state.filteredOrders.length > 0 ? state.filteredOrders : state.orders;
    const statusHeader = state.statusFilter 
        ? `Статус ↓ (${state.statusFilter})` 
        : 'Статус';

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
                        <th onclick="filterOrdersByStatus(null)" style="cursor:pointer; user-select:none;">${statusHeader}</th>
                        <th>Адрес отправления</th>
                        <th>Адрес доставки</th>
                        <th>Менеджер</th>
                    </tr>
                </thead>
            </table>
        </div>
    `;

    const table = document.querySelector('#app table');
    if (!table) {
        console.error('❌ Таблица не найдена!');
        return;
    }

    const oldTbody = table.querySelector('tbody');
    if (oldTbody) oldTbody.remove();

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    orders.forEach(o => {
        const date = new Date(o.created_at);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';

        tr.innerHTML = `
            <td 
                class="order-id-cell" 
                data-order-id="${o.id}"
                data-status="${o.status}"
            >
                ${o.id}
            </td>
            <td>${formattedDate}</td>
            <td>${o.weight}</td>
            <td 
                class="status-cell" 
                data-status="${o.status}"
                onclick="event.stopPropagation(); filterOrdersByStatus('${o.status}')"
                oncontextmenu="event.stopPropagation(); showContextMenu(event, '${o.status}')"
                style="cursor:pointer; user-select:none;"
            >
                <span class="status status-${o.status}">${o.status}</span>
            </td>
            <td>${o.pickup_address || 'Не указан'}</td>
            <td>${o.delivery_address || 'Не указан'}</td>
            <td>${o.manager_name || 'Не назначен'}</td>
        `;
        tbody.appendChild(tr);
    });

    console.log('✅ Таблица перерисована!');

    // ============================================================
    // КЛИК ПО НОМЕРУ ЗАЯВКИ
    // ============================================================
    document.querySelectorAll('.order-id-cell').forEach(el => {
        el.removeEventListener('click', el._clickHandler);
        el._clickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const orderId = parseInt(this.dataset.orderId);
            const status = this.dataset.status;
            console.log('🖱️ Клик по №:', { orderId, status });
            if (status === 'Доставлена') {
                confirmReceive(orderId);
            }
        };
        el.addEventListener('click', el._clickHandler);
    });

    // ============================================================
    // СТАТУС
    // ============================================================
    document.querySelectorAll('.status-cell').forEach(el => {
        el.removeEventListener('click', el._statusClick);
        el.removeEventListener('contextmenu', el._statusContext);

        el._statusClick = function(e) {
            e.stopPropagation();
            const status = this.dataset.status;
            console.log('🔵 Клик по статусу:', status);
            if (status) {
                filterOrdersByStatus(status);
            }
        };
        el.addEventListener('click', el._statusClick);

        el._statusContext = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const status = this.dataset.status;
            console.log('🟣 Правый клик по статусу:', status);
            if (status) {
                showContextMenu(e, status);
            }
        };
        el.addEventListener('contextmenu', el._statusContext);
    });

    // ============================================================
    // ЗАГОЛОВОК СТАТУСА
    // ============================================================
    const headerStatus = document.querySelector('th:nth-child(4)');
    if (headerStatus) {
        headerStatus.removeEventListener('click', headerStatus._resetHandler);
        headerStatus._resetHandler = function(e) {
            console.log('🔄 Сброс фильтра по статусу');
            filterOrdersByStatus(null);
        };
        headerStatus.addEventListener('click', headerStatus._resetHandler);
    }
}

// ============================================================
// ФУНКЦИЯ ПОДТВЕРЖДЕНИЯ ПОЛУЧЕНИЯ
// ============================================================

async function confirmReceive(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        alert('Заявка не найдена');
        return;
    }

    if (order.status !== 'Доставлена') {
        alert('Подтверждение получения доступно только для заявок со статусом "Доставлена".');
        return;
    }

    const confirmed = confirm('✅ Вы подтверждаете получение заявки №' + orderId + '?');
    if (!confirmed) return;

    try {
        const receivedStatus = state.statuses.find(s => s.name === 'Получена');
        if (!receivedStatus) {
            alert('Статус "Получена" не найден в системе');
            return;
        }

        await apiFetch(`/order/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status_id: receivedStatus.id }),
        });

        alert('✅ Заявка №' + orderId + ' отмечена как полученная!');
        await loadOrders();
        resetFilters();
        renderCurrentPage();
    } catch (error) {
        console.error('Ошибка подтверждения получения:', error);
        alert('❌ Ошибка подтверждения получения: ' + error.message);
    }
}