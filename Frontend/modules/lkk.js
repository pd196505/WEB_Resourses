// ============================================================
// ЛИЧНЫЙ КАБИНЕТ КЛИЕНТА (LKK)
// ============================================================
function renderLKK() {
    console.log('🔥 renderLKK() вызвана');
    const orders = state.filteredOrders.length > 0 ? state.filteredOrders : state.orders;
    const statusHeader = state.statusFilter 
        ? `Статус ↓ (${state.statusFilter})` 
        : 'Статус';

    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="handleLogoClick(event)">ТЛК Портал</div>
            <div class="user-info">
                <span class="name">${escapeHtml(state.user.full_name)}</span>
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
                        <th>Дата статуса</th>
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

    if (!orders || orders.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="8" style="text-align:center;color:#5F6368;">Нет заявок</td>`;
        tbody.appendChild(tr);
        return;
    }

    orders.forEach(o => {
        try {
            const date = new Date(o.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const statusDate = new Date(o.updated_at);
            const formattedStatusDate = statusDate.toLocaleDateString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const managerName = o.manager_name || 'Не назначен';
            const managerPhone = o.manager_phone || 'не указан';

            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td class="order-id-cell" data-order-id="${o.id}" data-status="${escapeHtml(o.status)}">${o.id}</td>
                <td>${formattedDate}</td>
                <td>${o.weight}</td>
                <td class="status-cell" data-status="${escapeHtml(o.status)}" 
                    onclick="event.stopPropagation(); filterOrdersByStatus('${escapeHtml(o.status)}')" 
                    oncontextmenu="event.stopPropagation(); showContextMenu(event, '${escapeHtml(o.status)}')"
                    style="cursor:pointer; user-select:none;">
                    <span class="status status-${escapeHtml(o.status)}">${escapeHtml(o.status)}</span>
                </td>
                <td>${formattedStatusDate}</td>
                <td>${escapeHtml(o.pickup_address || 'Не указан')}</td>
                <td>${escapeHtml(o.delivery_address || 'Не указан')}</td>
                <td class="manager-cell" 
                    data-manager-name="${escapeHtml(managerName)}" 
                    data-manager-phone="${escapeHtml(managerPhone)}"
                    style="cursor:pointer;">${escapeHtml(managerName)}</td>
            `;
            tbody.appendChild(tr);
        } catch (err) {
            console.error('Ошибка при рендеринге заявки:', err, o);
        }
    });

    // --- обработчик клика по номеру заявки (для подтверждения получения) ---
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

    // --- обработчик клика по статусу ---
    document.querySelectorAll('.status-cell').forEach(el => {
        el.removeEventListener('click', el._statusClick);
        el.removeEventListener('contextmenu', el._statusContext);
        el._statusClick = function(e) {
            e.stopPropagation();
            const status = this.dataset.status;
            if (status) filterOrdersByStatus(status);
        };
        el.addEventListener('click', el._statusClick);
        el._statusContext = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const status = this.dataset.status;
            if (status) showContextMenu(e, status);
        };
        el.addEventListener('contextmenu', el._statusContext);
    });

    // --- обработчик клика по ячейке менеджера ---
    document.querySelectorAll('.manager-cell').forEach(el => {
        el.removeEventListener('click', el._managerClick);
        el._managerClick = function(e) {
            e.stopPropagation();
            const name = this.dataset.managerName;
            const phone = this.dataset.managerPhone;
            alert(`Менеджер: ${name}\nТелефон: ${phone}`);
        };
        el.addEventListener('click', el._managerClick);
    });

    // сброс фильтра по заголовку статуса
    const headerStatus = document.querySelector('th:nth-child(4)');
    if (headerStatus) {
        headerStatus.removeEventListener('click', headerStatus._resetHandler);
        headerStatus._resetHandler = function(e) {
            filterOrdersByStatus(null);
        };
        headerStatus.addEventListener('click', headerStatus._resetHandler);
    }
}

// Вспомогательная функция для экранирования HTML
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