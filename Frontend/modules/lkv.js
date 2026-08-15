// ============================================================
// ЛИЧНЫЙ КАБИНЕТ ВОДИТЕЛЯ (LKV)
// ============================================================

function renderLKV() {
    const orders = state.filteredOrders.length > 0 ? state.filteredOrders : state.orders;
    
    let rows = orders.map(o => {
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
            <td>${o.client_name || 'Не указан'}</td>
            <td>${o.weight}</td>
            <td 
                class="status-cell" 
                onclick="filterOrdersByStatus('${o.status}')" 
                oncontextmenu="showContextMenu(event, '${o.status}')"
                style="cursor:pointer; user-select:none;"
            >
                <span class="status status-${o.status}">${o.status}</span>
            </td>
        </tr>
    `}).join('');

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
        <h1 class="page-title">Мои рейсы</h1>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Дата</th>
                        <th>Клиент</th>
                        <th>Вес (кг)</th>
                        <th onclick="filterOrdersByStatus(null)" style="cursor:pointer; user-select:none;">${statusHeader}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="5" style="text-align:center;color:#5F6368;">Нет рейсов</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}