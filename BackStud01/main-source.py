from fastapi import FastAPI, HTTPException
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_db_connection, get_db_connection_dict
from schemas import OrderCreate, OrderUpdateStatus, OrderResponse, ClientResponse

app = FastAPI(
    title="ТЛК-Портал API",
    description="API для управления заявками на перевозку",
    version="2.0.0"
)

# ============================================================
# НАСТРОЙКА CORS
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# МОДЕЛЬ ДЛЯ ЛОГИНА
# ============================================================
class LoginRequest(BaseModel):
    username: str
    password: str

# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================
def get_schema_prefix():
    from database import get_schema
    schema = get_schema()
    return f"{schema}."

# ============================================================
# ЭНДПОИНТЫ
# ============================================================
@app.get("/", tags=["System"])
async def root():
    return {"message": "ТЛК-Портал API работает", "version": "2.0.0"}

# -------- АВТОРИЗАЦИЯ --------
@app.post("/auth/login", tags=["Auth"])
async def login(request: LoginRequest):
    schema = get_schema_prefix()
    conn = get_db_connection_dict()
    cur = conn.cursor()
    cur.execute(f"""
        SELECT id, username, full_name, role, password_hash
        FROM {schema}users
        WHERE username = %s
    """, (request.username,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    if user["password_hash"] != request.password:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    return {
        "id": user["id"],
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role"],
    }

# -------- СПИСОК ПОЛЬЗОВАТЕЛЕЙ --------
@app.get("/users", tags=["Users"])
async def get_users(role: Optional[str] = None):
    schema = get_schema_prefix()
    conn = get_db_connection_dict()
    cur = conn.cursor()
    query = f"""
        SELECT id, username, full_name, role, phone, created_at
        FROM {schema}users
    """
    if role:
        query += f" WHERE role = %s"
        cur.execute(query, (role,))
    else:
        cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

# -------- 1. СПИСОК ВСЕХ ЗАЯВОК --------
@app.get("/orders", response_model=List[OrderResponse], tags=["Orders"])
async def get_orders(
    limit: int = 20,
    offset: int = 0,
    role: Optional[str] = None,
    user_id: Optional[int] = None
):
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
            m.phone AS manager_phone,
            o.driver_id,
            d.full_name AS driver_name,
            o.weight,
            s.name AS status,
            o.pickup_address,
            o.delivery_address,
            o.created_at,
            o.updated_at
        FROM {schema}orders o
        LEFT JOIN {schema}users c ON o.client_id = c.id
        LEFT JOIN {schema}users m ON o.manager_id = m.id
        LEFT JOIN {schema}users d ON o.driver_id = d.id
        LEFT JOIN {schema}statuses s ON o.status_id = s.id
    """
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
    # ИЗМЕНЕНО: сортировка по дате статуса (updated_at) по убыванию
    query += " ORDER BY o.updated_at DESC LIMIT %s OFFSET %s"
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

# -------- 2. ДЕТАЛИ ЗАЯВКИ --------
@app.get("/order/{order_id}", response_model=OrderResponse, tags=["Orders"])
async def get_order(order_id: int):
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
            m.phone AS manager_phone,
            o.driver_id,
            d.full_name AS driver_name,
            o.weight,
            s.name AS status,
            o.pickup_address,
            o.delivery_address,
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

# -------- 3. СПИСОК КЛИЕНТОВ --------
@app.get("/clients", response_model=List[ClientResponse], tags=["Clients"])
async def get_clients():
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

# -------- 4. СПИСОК СТАТУСОВ --------
@app.get("/statuses", tags=["System"])
async def get_statuses():
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

# -------- 5. СОЗДАНИЕ ЗАЯВКИ --------
@app.post("/orders", response_model=OrderResponse, status_code=201, tags=["Orders"])
async def create_order(order: OrderCreate):
    schema = get_schema_prefix()
    if order.weight <= 0:
        raise HTTPException(status_code=400, detail="Вес должен быть больше 0")
    conn = get_db_connection_dict()
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {schema}users WHERE id = %s AND role = 'client'", (order.client_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Клиент не найден")
    cur.execute(f"SELECT id FROM {schema}users WHERE id = %s AND role = 'manager'", (order.manager_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    if order.driver_id:
        cur.execute(f"SELECT id FROM {schema}users WHERE id = %s AND role = 'driver'", (order.driver_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Водитель не найден")
    cur.close()
    conn.close()

    conn = get_db_connection()
    cur = conn.cursor()
    query = f"""
        INSERT INTO {schema}orders 
        (client_id, manager_id, driver_id, weight, status_id, pickup_address, delivery_address)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, client_id, manager_id, driver_id, weight, status_id, pickup_address, delivery_address, created_at, updated_at
    """
    cur.execute(query, (
        order.client_id,
        order.manager_id,
        order.driver_id,
        order.weight,
        order.status_id,
        order.pickup_address,
        order.delivery_address
    ))
    row = cur.fetchone()

    conn_dict = get_db_connection_dict()
    cur_dict = conn_dict.cursor()
    cur_dict.execute(f"""
        SELECT 
            c.full_name AS client_name,
            m.full_name AS manager_name,
            m.phone AS manager_phone,
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
        "manager_phone": names["manager_phone"] if names else None,
        "driver_id": row[3],
        "driver_name": names["driver_name"] if names else None,
        "weight": row[4],
        "status": names["status"] if names else None,
        "pickup_address": row[6] if row[6] is not None else "",
        "delivery_address": row[7] if row[7] is not None else "",
        "created_at": row[8],
        "updated_at": row[9]
    }

# -------- 6. ОБНОВЛЕНИЕ СТАТУСА --------
@app.put("/order/{order_id}/status", response_model=OrderResponse, tags=["Orders"])
async def update_order_status(order_id: int, status_update: OrderUpdateStatus):
    schema = get_schema_prefix()
    conn_dict = get_db_connection_dict()
    cur_dict = conn_dict.cursor()
    cur_dict.execute(f"SELECT id FROM {schema}orders WHERE id = %s", (order_id,))
    if not cur_dict.fetchone():
        cur_dict.close()
        conn_dict.close()
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    cur_dict.close()
    conn_dict.close()

    conn_dict = get_db_connection_dict()
    cur_dict = conn_dict.cursor()
    cur_dict.execute(f"SELECT id FROM {schema}statuses WHERE id = %s", (status_update.status_id,))
    if not cur_dict.fetchone():
        cur_dict.close()
        conn_dict.close()
        raise HTTPException(status_code=404, detail="Статус не найден")
    cur_dict.close()
    conn_dict.close()

    conn = get_db_connection()
    cur = conn.cursor()
    query = f"""
        UPDATE {schema}orders 
        SET status_id = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING id, client_id, manager_id, driver_id, weight, status_id, pickup_address, delivery_address, created_at, updated_at
    """
    cur.execute(query, (status_update.status_id, order_id))
    row = cur.fetchone()

    conn_dict = get_db_connection_dict()
    cur_dict = conn_dict.cursor()
    cur_dict.execute(f"""
        SELECT 
            c.full_name AS client_name,
            m.full_name AS manager_name,
            m.phone AS manager_phone,
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
        "manager_phone": names["manager_phone"] if names else None,
        "driver_id": row[3],
        "driver_name": names["driver_name"] if names else None,
        "weight": row[4],
        "status": names["status"] if names else None,
        "pickup_address": row[6] if row[6] is not None else "",
        "delivery_address": row[7] if row[7] is not None else "",
        "created_at": row[8],
        "updated_at": row[9]
    }

# -------- 7. НАЗНАЧЕНИЕ ВОДИТЕЛЯ --------
@app.put("/order/{order_id}/assign", tags=["Orders"])
async def assign_driver(order_id: int, request: dict):
    schema = get_schema_prefix()
    driver_id = request.get("driver_id")
    status_id = request.get("status_id")
    if driver_id is None:
        raise HTTPException(status_code=400, detail="driver_id обязателен")
    conn_dict = get_db_connection_dict()
    cur_dict = conn_dict.cursor()
    cur_dict.execute(f"SELECT id FROM {schema}orders WHERE id = %s", (order_id,))
    if not cur_dict.fetchone():
        cur_dict.close()
        conn_dict.close()
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    cur_dict.close()
    conn_dict.close()

    if driver_id is not None:
        conn_dict = get_db_connection_dict()
        cur_dict = conn_dict.cursor()
        cur_dict.execute(f"SELECT id FROM {schema}users WHERE id = %s AND role = 'driver'", (driver_id,))
        if not cur_dict.fetchone():
            cur_dict.close()
            conn_dict.close()
            raise HTTPException(status_code=404, detail="Водитель не найден")
        cur_dict.close()
        conn_dict.close()

    conn = get_db_connection()
    cur = conn.cursor()
    if driver_id is None:
        query = f"""
            UPDATE {schema}orders 
            SET driver_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """
        cur.execute(query, (order_id,))
    else:
        query = f"""
            UPDATE {schema}orders 
            SET driver_id = %s, status_id = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """
        cur.execute(query, (driver_id, status_id, order_id))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"message": "Водитель назначен", "order_id": order_id, "driver_id": driver_id}

# ============================================================
# ЗАПУСК
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)