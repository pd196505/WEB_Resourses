from fastapi import FastAPI, HTTPException, Depends, Header
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_db_connection, get_db_connection_dict
from schemas import OrderCreate, OrderUpdateStatus, OrderResponse, ClientResponse
import re

app = FastAPI(
    title="ТЛК-Портал API",
    description="API для управления заявками (мульти-тенант по схемам tlkNN)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


# ============================================================
# ЗАВИСИМОСТЬ: какую схему обслуживает текущий запрос
# ============================================================
def get_request_schema(x_user_schema: str = Header(None, alias="X-User-Schema")) -> str:
    if not x_user_schema:
        return "tlk01"
    if not re.match(r"^tlk\d{2}$", x_user_schema):
        raise HTTPException(
            status_code=403,
            detail="Недопустимое имя схемы. Формат должен быть tlkXX (например, tlk01)."
        )
    return x_user_schema


# ============================================================
# СЛУЖЕБНЫЕ
# ============================================================
@app.get("/", tags=["System"])
async def root():
    return {"message": "ТЛК-Портал API работает", "version": "2.0.0"}


@app.get("/health", tags=["System"])
async def health(schema: str = Depends(get_request_schema)):
    try:
        conn = get_db_connection_dict(schema)
        cur = conn.cursor()
        cur.execute("""
            SELECT
                current_user                   AS "user",
                current_schema()               AS schema,
                current_setting('search_path') AS search_path
        """)
        info = cur.fetchone()
        cur.close()
        conn.close()
        return info
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# ============================================================
# АВТОРИЗАЦИЯ
# ============================================================
@app.post("/auth/login", tags=["Auth"])
async def login(request: LoginRequest, schema: str = Depends(get_request_schema)):
    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, username, full_name, role, password_hash
        FROM users
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


# ============================================================
# ПОЛЬЗОВАТЕЛИ
# ============================================================
@app.get("/users", tags=["Users"])
async def get_users(role: Optional[str] = None, schema: str = Depends(get_request_schema)):
    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    query = "SELECT id, username, full_name, role, phone, created_at FROM users"
    if role:
        query += " WHERE role = %s"
        cur.execute(query, (role,))
    else:
        cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


# ============================================================
# ЗАЯВКИ
# ============================================================
@app.get("/orders", response_model=List[OrderResponse], tags=["Orders"])
async def get_orders(
    limit: int = 20,
    offset: int = 0,
    role: Optional[str] = None,
    user_id: Optional[int] = None,
    schema: str = Depends(get_request_schema)
):
    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    query = """
        SELECT
            o.id, o.client_id, c.full_name AS client_name,
            o.manager_id, m.full_name AS manager_name, m.phone AS manager_phone,
            o.driver_id, d.full_name AS driver_name,
            o.weight, s.name AS status,
            o.pickup_address, o.delivery_address,
            o.created_at, o.updated_at
        FROM orders o
        LEFT JOIN users    c ON o.client_id  = c.id
        LEFT JOIN users    m ON o.manager_id = m.id
        LEFT JOIN users    d ON o.driver_id  = d.id
        LEFT JOIN statuses s ON o.status_id  = s.id
    """
    if role and user_id:
        role_field = {
            "client":  "o.client_id",
            "manager": "o.manager_id",
            "driver":  "o.driver_id"
        }.get(role)
        if role_field:
            query += f" WHERE {role_field} = %s"
            params = (user_id, limit, offset)
        else:
            params = (limit, offset)
    else:
        params = (limit, offset)

    query += " ORDER BY o.updated_at DESC LIMIT %s OFFSET %s"
    cur.execute(query, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@app.get("/order/{order_id}", response_model=OrderResponse, tags=["Orders"])
async def get_order(order_id: int, schema: str = Depends(get_request_schema)):
    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("""
        SELECT
            o.id, o.client_id, c.full_name AS client_name,
            o.manager_id, m.full_name AS manager_name, m.phone AS manager_phone,
            o.driver_id, d.full_name AS driver_name,
            o.weight, s.name AS status,
            o.pickup_address, o.delivery_address,
            o.created_at, o.updated_at
        FROM orders o
        LEFT JOIN users    c ON o.client_id  = c.id
        LEFT JOIN users    m ON o.manager_id = m.id
        LEFT JOIN users    d ON o.driver_id  = d.id
        LEFT JOIN statuses s ON o.status_id  = s.id
        WHERE o.id = %s
    """, (order_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return row


@app.get("/clients", response_model=List[ClientResponse], tags=["Clients"])
async def get_clients(schema: str = Depends(get_request_schema)):
    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, username, full_name, phone, created_at
        FROM users
        WHERE role = 'client'
        ORDER BY full_name
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


@app.get("/statuses", tags=["System"])
async def get_statuses(schema: str = Depends(get_request_schema)):
    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("SELECT id, name, description FROM statuses ORDER BY id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


# ============================================================
# СОЗДАНИЕ ЗАЯВКИ
# ============================================================
@app.post("/orders", response_model=OrderResponse, status_code=201, tags=["Orders"])
async def create_order(order: OrderCreate, schema: str = Depends(get_request_schema)):
    if order.weight <= 0:
        raise HTTPException(status_code=400, detail="Вес должен быть больше 0")

    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE id = %s AND role = 'client'", (order.client_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Клиент не найден")
    cur.execute("SELECT id FROM users WHERE id = %s AND role = 'manager'", (order.manager_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Менеджер не найден")
    if order.driver_id:
        cur.execute("SELECT id FROM users WHERE id = %s AND role = 'driver'", (order.driver_id,))
        if not cur.fetchone():
            cur.close(); conn.close()
            raise HTTPException(status_code=404, detail="Водитель не найден")
    cur.close()
    conn.close()

    conn = get_db_connection(schema)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO orders
            (client_id, manager_id, driver_id, weight, status_id, pickup_address, delivery_address)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, client_id, manager_id, driver_id, weight, status_id,
                  pickup_address, delivery_address, created_at, updated_at
    """, (
        order.client_id, order.manager_id, order.driver_id,
        order.weight, order.status_id,
        order.pickup_address, order.delivery_address
    ))
    row = cur.fetchone()
    cur.close()
    conn.close()

    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("""
        SELECT
            c.full_name AS client_name,
            m.full_name AS manager_name,
            m.phone     AS manager_phone,
            d.full_name AS driver_name,
            s.name      AS status
        FROM orders o
        LEFT JOIN users    c ON o.client_id  = c.id
        LEFT JOIN users    m ON o.manager_id = m.id
        LEFT JOIN users    d ON o.driver_id  = d.id
        LEFT JOIN statuses s ON o.status_id  = s.id
        WHERE o.id = %s
    """, (row[0],))
    names = cur.fetchone()
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


# ============================================================
# ОБНОВЛЕНИЕ СТАТУСА
# ============================================================
@app.put("/order/{order_id}/status", response_model=OrderResponse, tags=["Orders"])
async def update_order_status(
    order_id: int,
    status_update: OrderUpdateStatus,
    schema: str = Depends(get_request_schema)
):
    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("SELECT id FROM orders WHERE id = %s", (order_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    cur.close(); conn.close()

    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("SELECT id FROM statuses WHERE id = %s", (status_update.status_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Статус не найден")
    cur.close(); conn.close()

    conn = get_db_connection(schema)
    cur = conn.cursor()
    cur.execute("""
        UPDATE orders
        SET status_id = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING id, client_id, manager_id, driver_id, weight, status_id,
                  pickup_address, delivery_address, created_at, updated_at
    """, (status_update.status_id, order_id))
    row = cur.fetchone()
    cur.close()
    conn.close()

    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("""
        SELECT
            c.full_name AS client_name,
            m.full_name AS manager_name,
            m.phone     AS manager_phone,
            d.full_name AS driver_name,
            s.name      AS status
        FROM orders o
        LEFT JOIN users    c ON o.client_id  = c.id
        LEFT JOIN users    m ON o.manager_id = m.id
        LEFT JOIN users    d ON o.driver_id  = d.id
        LEFT JOIN statuses s ON o.status_id  = s.id
        WHERE o.id = %s
    """, (row[0],))
    names = cur.fetchone()
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


# ============================================================
# НАЗНАЧЕНИЕ / СНЯТИЕ ВОДИТЕЛЯ
# ============================================================
@app.put("/order/{order_id}/assign", tags=["Orders"])
async def assign_driver(
    order_id: int,
    request: dict,
    schema: str = Depends(get_request_schema)
):
    driver_id = request.get("driver_id")
    status_id = request.get("status_id")

    conn = get_db_connection_dict(schema)
    cur = conn.cursor()
    cur.execute("SELECT id FROM orders WHERE id = %s", (order_id,))
    if not cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    cur.close(); conn.close()

    if driver_id is not None:
        conn = get_db_connection_dict(schema)
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s AND role = 'driver'", (driver_id,))
        if not cur.fetchone():
            cur.close(); conn.close()
            raise HTTPException(status_code=404, detail="Водитель не найден")
        cur.close(); conn.close()

    conn = get_db_connection(schema)
    cur = conn.cursor()
    if driver_id is None:
        cur.execute("""
            UPDATE orders
            SET driver_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """, (order_id,))
    else:
        cur.execute("""
            UPDATE orders
            SET driver_id = %s, status_id = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """, (driver_id, status_id, order_id))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    return {
        "message": "Водитель назначен" if driver_id else "Водитель снят",
        "order_id": order_id,
        "driver_id": driver_id
    }


# ============================================================
# ЗАПУСК
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)