// ============================================================
// ЛИЧНЫЙ КАБИНЕТ МЕНЕДЖЕРА (LKM)
// ============================================================
function renderLKM() {
    const orders = state.filteredOrders.length > 0 ? state.filteredOrders : state.orders;
    let rows = orders.map(o => {
        const createdDate = new Date(o.created_at);
        const formattedCreatedDate = createdDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const statusDate = new Date(o.updated_at);
        const formattedStatusDate = statusDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const driverName = (o.driver_name || '').replace(/'/g, "\\'");
        return `
            <tr>
                <td>${o.id}</td>
                <td>${formattedCreatedDate}</td>
                <td>${o.client_name || 'Не указан'}</td>
                <td 
                    class="driver-cell" 
                    data-order-id="${o.id}"
                    data-driver-name="${driverName}"
                    style="cursor:pointer; user-select:none;"
                >
                    ${o.driver_name || 'Не назначен'}
                </td>
                <td 
                    class="status-cell" 
                    onclick="window.filterOrdersByStatus('${o.status}')" 
                    oncontextmenu="window.showContextMenu(event, '${o.status}')"
                    style="cursor:pointer; user-select:none;"
                >
                    <span class="status status-${o.status}">${o.status}</span>
                </td>
                <td>${formattedStatusDate}</td>
                <td>${o.pickup_address || 'Не указан'}</td>
                <td>${o.delivery_address || 'Не указан'}</td>
            </tr>
        `}).join('');

    const driverHeader = state.driverFilter  
        ? `Водитель ↓ (${state.driverFilter})`  
        : 'Водитель';
    const statusHeader = state.statusFilter  
        ? `Статус ↓ (${state.statusFilter})`  
        : 'Статус';

    document.getElementById('app').innerHTML = `
        <div class="header">
            <div class="logo" onclick="handleLogoClick(event)">ТЛК Портал</div>
            <div class="user-info">
                <span class="name">${state.user.full_name}</span>
            </div>
        </div>
        <h1 class="page-title">Все заявки</h1>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Дата</th>
                        <th>Клиент</th>
                        <th onclick="window.filterOrdersByDriver(null)" style="cursor:pointer; user-select:none;">${driverHeader}</th>
                        <th onclick="window.filterOrdersByStatus(null)" style="cursor:pointer; user-select:none;">${statusHeader}</th>
                        <th>Дата статуса</th>
                        <th>Адрес отправления</th>
                        <th>Адрес доставки</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="8" style="text-align:center;color:#5F6368;">Нет заявок</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    document.querySelectorAll('.driver-cell').forEach(el => {
        el.removeEventListener('click', el._clickHandler);
        el.removeEventListener('contextmenu', el._contextHandler);
        el._clickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const orderId = parseInt(this.dataset.orderId);
            const driverName = this.dataset.driverName || '';
            const fakeEvent = {
                clientX: e.clientX || window.innerWidth / 2 - 100,
                clientY: e.clientY || window.innerHeight / 2 - 100,
                preventDefault: function() {}
            };
            if (typeof window.showDriverSelectionMenu === 'function') {
                window.showDriverSelectionMenu(fakeEvent, orderId, driverName);
            }
        };
        el.addEventListener('click', el._clickHandler);
        el._contextHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const driverName = this.dataset.driverName || '';
            if (typeof window.showDriverContextMenu === 'function') {
                window.showDriverContextMenu(e, driverName);
            }
        };
        el.addEventListener('contextmenu', el._contextHandler);
    });
}