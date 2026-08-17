// ============================================================
// ЛИЧНЫЙ КАБИНЕТ ВОДИТЕЛЯ (LKV)
// ============================================================
function renderLKV() {
    const orders = state.filteredOrders.length > 0 ? state.filteredOrders : state.orders;
    const statusHeader = state.statusFilter 
        ? `Статус ↓ (${state.statusFilter})` 
        : 'Статус';

    let rowsHtml = '';
    if (orders && orders.length > 0) {
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

                rowsHtml += `
                    <tr>
                        <td class="order-id-cell" data-order-id="${o.id}" data-status="${escapeHtml(o.status)}" style="cursor:pointer;">${o.id}</td>
                        <td>${formattedDate}</td>
                        <td>${escapeHtml(o.client_name || 'Не указан')}</td>
                        <td>${escapeHtml(o.manager_name || 'Не назначен')}</td>
                        <td class="status-cell" 
                            onclick="filterOrdersByStatus('${escapeHtml(o.status)}')" 
                            oncontextmenu="showContextMenu(event, '${escapeHtml(o.status)}')"
                            style="cursor:pointer; user-select:none;">
                            <span class="status status-${escapeHtml(o.status)}">${escapeHtml(o.status)}</span>
                        </td>
                        <td>${formattedStatusDate}</td>
                        <td>${escapeHtml(o.pickup_address || 'Не указан')}</td>
                        <td>${escapeHtml(o.delivery_address || 'Не указан')}</td>
                    </tr>
                `;
            } catch (err) {
                console.error('Ошибка при рендеринге заявки водителя:', err, o);
            }
        });
    } else {
        rowsHtml = '<tr><td colspan="8" style="text-align:center;color:#5F6368;">Нет рейсов</td></tr>';
    }

    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="handleLogoClick(event)">ТЛК Портал</div>
            <div class="user-info">
                <span class="name">${escapeHtml(state.user.full_name)}</span>
            </div>
        </div>
        <h1 class="page-title">Мои рейсы</h1>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Дата</th>
                        <th>Клиент</th>
                        <th>Менеджер</th>
                        <th onclick="filterOrdersByStatus(null)" style="cursor:pointer; user-select:none;">${statusHeader}</th>
                        <th>Дата статуса</th>
                        <th>Адрес отправления</th>
                        <th>Адрес доставки</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;

    // --- обработчик клика по номеру заявки (смена статуса) ---
    document.querySelectorAll('.order-id-cell').forEach(el => {
        el.removeEventListener('click', el._clickHandler);
        el._clickHandler = function(e) {
            const orderId = parseInt(this.dataset.orderId);
            const status = this.dataset.status;
            const allowedStatuses = ['Назначена', 'В пути'];
            if (!allowedStatuses.includes(status)) {
                return;
            }

            let newStatusName = null;
            let confirmMessage = '';
            if (status === 'Назначена') {
                newStatusName = 'В пути';
                confirmMessage = 'Вы подтверждаете изменение статуса на "В пути"?';
            } else if (status === 'В пути') {
                newStatusName = 'Доставлена';
                confirmMessage = 'Вы подтверждаете изменение статуса на "Доставлена"?';
            }

            if (!newStatusName) return;

            if (confirm(confirmMessage)) {
                const newStatus = state.statuses.find(s => s.name === newStatusName);
                if (newStatus) {
                    updateOrderStatus(orderId, newStatus.id);
                } else {
                    alert(`Статус "${newStatusName}" не найден в системе`);
                }
            }
        };
        el.addEventListener('click', el._clickHandler);
    });

    // --- обработчики для статуса (фильтрация, контекстное меню) ---
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
        el.addEventListener('contextmenu', el._contextHandler);
    });
}

// Вспомогательная функция
if (typeof escapeHtml === 'undefined') {
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
}