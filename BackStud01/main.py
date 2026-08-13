from fastapi import FastAPI, HTTPException
from typing import List, Optional
from database import get_db_connection, get_db_connection_dict
from schemas import OrderCreate, OrderUpdateStatus, OrderResponse, ClientResponse

app = FastAPI(
    title="ТЛК-Портал API",
    description="API для управления заявками на перевозку",
    version="2.0.0"
)

# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================

def get_schema_prefix():
    """Возвращает schema prefix для запросов"""
    from database import get_schema
    schema = get_schema()
    return f"{schema}."

# ============================================================
# ЭНДПОИНТЫ
# ============================================================

@app.get("/", tags=["System"])
async def root():
    """Проверка работы API"""
    return {"message": "ТЛК-Портал API работает", "version": "2.0.0"}

# -------- 1. СПИСОК ВСЕХ ЗАЯВОК (GET) --------
@app.get("/orders", response_model=List[OrderResponse], tags=["Orders"])
async def get_orders(
    limit: int = 20, 
    offset: int = 0,
    role: Optional[str] = None,
    user_id: Optional[int] = None
):
    """
    Получить список заявок с фильтрацией по роли.
    - **role**: client, manager, driver
    - **user_id**: ID пользователя
    - **limit**: количество записей (по умолчанию 20)
    - **offset**: смещение для пагинации
    """
    schema = get_schema_prefix()
    conn = get_db_connection_dict()
    cur = conn.cursor()
    
    # Базовый запрос
    query = f"""
        SELECT 
            o.id,
            o.client_id,
            c.full_name AS client_name,
            o.manager_id,
            m.full_name AS manager_name,
            o.driver_id,
            d.full_name AS driver_name,
            o.weight,
            s.name AS status,
            o.created_at,
            o.updated_at
        FROM {schema}orders o
        LEFT JOIN {schema}users c ON o.client_id = c.id
        LEFT JOIN {schema}users m ON o.manager_id = m.id
        LEFT JOIN {schema}users d ON o.driver_id = d.id
        LEFT JOIN {schema}statuses s ON o.status_id = s.id
    """
    
    # Фильтрация по роли
    if role and user_id:
        role_field = {
            "client": "o.client_id",
            "manager": "o.manager_id",
            "driver": "o.driver_id"
        }.get(role)
        if role_field:
            query += f" WHERE {role_field} = %s"
            params = (user_id, limit, offset)
        else:
            params = (limit, offset)
    else:
        params = (limit, offset)
    
    query += " ORDER BY o.created_at DESC LIMIT %s OFFSET %s"
    
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    return rows

# -------- 2. ДЕТАЛИ ОДНОЙ ЗАЯВКИ (GET) --------
@app.get("/order/{order_id}", response_model=OrderResponse, tags=["Orders"])
async def get_order(order_id: int):
    """Получить детальную информацию по одной заявке"""
    schema = get_schema_prefix()
    conn = get_db_connection_dict()
    cur = conn.cursor()
    
    query = f"""
        SELECT 
            o.id,
            o.client_id,
            c.full_name AS client_name,
            o.manager_id,
            m.full_name AS manager_name,
            o.driver_id,
            d.full_name AS driver_name,
            o.weight,
            s.name AS status,
            o.created_at,
            o.updated_at
        FROM {schema}orders o
        LEFT JOIN {schema}users c ON o.client_id = c.id
        LEFT JOIN {schema}users m ON o.manager_id = m.id
        LEFT JOIN {schema}users d ON o.driver_id = d.id
        LEFT JOIN {schema}statuses s ON o.status_id = s.id
        WHERE o.id = %s
    """
    cur.execute(query, (order_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    return row

# -------- 3. СПИСОК КЛИЕНТОВ (GET) --------
@app.get("/clients", response_model=List[ClientResponse], tags=["Clients"])
async def get_clients():
    """Получить список всех клиентов"""
    schema = get_schema_prefix()
    conn = get_db_connection_dict()
    cur = conn.cursor()
    
    query = f"""
        SELECT id, username, full_name, phone, created_at
        FROM {schema}users
        WHERE role = 'client'
        ORDER BY full_name
    """
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    return rows

# -------- 4. СПИСОК СТАТУСОВ (GET) --------
@app.get("/statuses", tags=["System"])
async def get_statuses():
    """Получить список возможных статусов заявок"""
    schema = get_schema_prefix()
    conn = get_db_connection_dict()
    cur = conn.cursor()
    
    query = f"""
        SELECT id, name, description
        FROM {schema}statuses
        ORDER BY id
    """
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    return rows

# -------- 5. СОЗДАНИЕ ЗАЯВКИ (POST) --------
@app.post("/orders", response_model=OrderResponse, status_code=201, tags=["Orders"])
async def create_order(order: OrderCreate):
    """Создать новую заявку"""
    schema = get_schema_prefix()
    
    # Проверяем вес
    if order.weight <= 0:
        raise HTTPException(status_code=400, detail="Вес должен быть больше 0")
    
    # Проверяем существование клиента
    conn = get_db_connection_dict()
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {schema}users WHERE id = %s AND role = 'client'", (order.client_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Клиент не найден")
    
    # Проверяем существование менеджера
    cur.execute(f"SELECT id FROM {schema}users WHERE id = %s AND role = 'manager'", (order.manager_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    
    # Если указан водитель — проверяем
    if order.driver_id:
        cur.execute(f"SELECT id FROM {schema}users WHERE id = %s AND role = 'driver'", (order.driver_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Водитель не найден")
    
    cur.close()
    conn.close()
    
    # Вставляем заявку
    conn = get_db_connection()
    cur = conn.cursor()
    query = f"""
        INSERT INTO {schema}orders (client_id, manager_id, driver_id, weight, status_id)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, client_id, manager_id, driver_id, weight, status_id, created_at, updated_at
    """
    cur.execute(query, (order.client_id, order.manager_id, order.driver_id, order.weight, order.status_id))
    row = cur.fetchone()
    
    # Получаем имена
    conn_dict = get_db_connection_dict()
    cur_dict = conn_dict.cursor()
    cur_dict.execute(f"""
        SELECT 
            c.full_name AS client_name,
            m.full_name AS manager_name,
            d.full_name AS driver_name,
            s.name AS status
        FROM {schema}orders o
        LEFT JOIN {schema}users c ON o.client_id = c.id
        LEFT JOIN {schema}users m ON o.manager_id = m.id
        LEFT JOIN {schema}users d ON o.driver_id = d.id
        LEFT JOIN {schema}statuses s ON o.status_id = s.id
        WHERE o.id = %s
    """, (row[0],))
    names = cur_dict.fetchone()
    cur_dict.close()
    conn_dict.close()
    
    cur.close()
    conn.close()
    
    return {
        "id": row[0],
        "client_id": row[1],
        "client_name": names["client_name"] if names else None,
        "manager_id": row[2],
        "manager_name": names["manager_name"] if names else None,
        "driver_id": row[3],
        "driver_name": names["driver_name"] if names else None,
        "weight": row[4],
        "status": names["status"] if names else None,
        "created_at": row[6],
        "updated_at": row[7]
    }

# -------- 6. ОБНОВЛЕНИЕ СТАТУСА ЗАЯВКИ (PUT) --------
@app.put("/order/{order_id}/status", response_model=OrderResponse, tags=["Orders"])
async def update_order_status(order_id: int, status_update: OrderUpdateStatus):
    """Изменить статус заявки"""
    schema = get_schema_prefix()
    
    # Проверяем существование заявки
    conn_dict = get_db_connection_dict()
    cur_dict = conn_dict.cursor()
    cur_dict.execute(f"SELECT id FROM {schema}orders WHERE id = %s", (order_id,))
    if not cur_dict.fetchone():
        cur_dict.close()
        conn_dict.close()
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    cur_dict.close()
    conn_dict.close()
    
    # Проверяем существование статуса
    conn_dict = get_db_connection_dict()
    cur_dict = conn_dict.cursor()
    cur_dict.execute(f"SELECT id FROM {schema}statuses WHERE id = %s", (status_update.status_id,))
    if not cur_dict.fetchone():
        cur_dict.close()
        conn_dict.close()
        raise HTTPException(status_code=404, detail="Статус не найден")
    cur_dict.close()
    conn_dict.close()
    
    # Обновляем статус
    conn = get_db_connection()
    cur = conn.cursor()
    query = f"""
        UPDATE {schema}orders 
        SET status_id = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING id, client_id, manager_id, driver_id, weight, status_id, created_at, updated_at
    """
    cur.execute(query, (status_update.status_id, order_id))
    row = cur.fetchone()
    
    # Получаем имена
    conn_dict = get_db_connection_dict()
    cur_dict = conn_dict.cursor()
    cur_dict.execute(f"""
        SELECT 
            c.full_name AS client_name,
            m.full_name AS manager_name,
            d.full_name AS driver_name,
            s.name AS status
        FROM {schema}orders o
        LEFT JOIN {schema}users c ON o.client_id = c.id
        LEFT JOIN {schema}users m ON o.manager_id = m.id
        LEFT JOIN {schema}users d ON o.driver_id = d.id
        LEFT JOIN {schema}statuses s ON o.status_id = s.id
        WHERE o.id = %s
    """, (row[0],))
    names = cur_dict.fetchone()
    cur_dict.close()
    conn_dict.close()
    
    cur.close()
    conn.close()
    
    return {
        "id": row[0],
        "client_id": row[1],
        "client_name": names["client_name"] if names else None,
        "manager_id": row[2],
        "manager_name": names["manager_name"] if names else None,
        "driver_id": row[3],
        "driver_name": names["driver_name"] if names else None,
        "weight": row[4],
        "status": names["status"] if names else None,
        "created_at": row[6],
        "updated_at": row[7]
    }

# ============================================================
# ЗАПУСК (для отладки)
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)