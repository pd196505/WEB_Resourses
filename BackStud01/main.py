from fastapi import FastAPI, HTTPException
from typing import List, Optional
from database import get_db_connection, get_schema
from schemas import OrderCreate, OrderUpdateStatus, OrderResponse, ClientResponse

app = FastAPI(
    title="ТЛК-Портал API",
    description="API для управления заявками на перевозку",
    version="1.0.0"
)

# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================

def get_schema_prefix():
    """Возвращает schema prefix для запросов"""
    schema = get_schema()
    return f"{schema}."

# ============================================================
# ЭНДПОИНТЫ
# ============================================================

@app.get("/", tags=["System"])
async def root():
    """Проверка работы API"""
    return {"message": "ТЛК-Портал API работает", "version": "1.0.0"}

# -------- 1. СПИСОК ВСЕХ ЗАЯВОК --------
@app.get("/orders", response_model=List[OrderResponse], tags=["Orders"])
async def get_orders(limit: int = 20, offset: int = 0):
    """
    Получить список всех заявок с пагинацией.
    - **limit**: количество записей (по умолчанию 20)
    - **offset**: смещение для пагинации
    """
    schema = get_schema_prefix()
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = f"""
        SELECT 
            o.id,
            o.client_id,
            c.name AS client_name,
            o.driver_id,
            d.full_name AS driver_name,
            o.weight,
            o.status,
            o.created_at,
            o.updated_at
        FROM {schema}orders o
        LEFT JOIN {schema}clients c ON o.client_id = c.id
        LEFT JOIN {schema}drivers d ON o.driver_id = d.id
        ORDER BY o.created_at DESC
        LIMIT %s OFFSET %s
    """
    cur.execute(query, (limit, offset))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    return rows

# -------- 2. ДЕТАЛИ ОДНОЙ ЗАЯВКИ --------
@app.get("/order/{order_id}", response_model=OrderResponse, tags=["Orders"])
async def get_order(order_id: int):
    """Получить детальную информацию по одной заявке"""
    schema = get_schema_prefix()
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = f"""
        SELECT 
            o.id,
            o.client_id,
            c.name AS client_name,
            o.driver_id,
            d.full_name AS driver_name,
            o.weight,
            o.status,
            o.created_at,
            o.updated_at
        FROM {schema}orders o
        LEFT JOIN {schema}clients c ON o.client_id = c.id
        LEFT JOIN {schema}drivers d ON o.driver_id = d.id
        WHERE o.id = %s
    """
    cur.execute(query, (order_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    return row

# -------- 3. СОЗДАНИЕ ЗАЯВКИ --------
@app.post("/orders", response_model=OrderResponse, status_code=201, tags=["Orders"])
async def create_order(order: OrderCreate):
    """Создать новую заявку"""
    schema = get_schema_prefix()
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = f"""
        INSERT INTO {schema}orders (client_id, driver_id, weight, status)
        VALUES (%s, %s, %s, %s)
        RETURNING id, client_id, driver_id, weight, status, created_at, updated_at
    """
    cur.execute(query, (order.client_id, order.driver_id, order.weight, order.status))
    row = cur.fetchone()
    
    # Получаем имена клиента и водителя
    cur.execute(f"""
        SELECT 
            c.name AS client_name,
            d.full_name AS driver_name
        FROM {schema}orders o
        LEFT JOIN {schema}clients c ON o.client_id = c.id
        LEFT JOIN {schema}drivers d ON o.driver_id = d.id
        WHERE o.id = %s
    """, (row[0],))
    names = cur.fetchone()
    
    cur.close()
    conn.close()
    
    return {
        "id": row[0],
        "client_id": row[1],
        "client_name": names[0] if names else None,
        "driver_id": row[2],
        "driver_name": names[1] if names else None,
        "weight": row[3],
        "status": row[4],
        "created_at": row[5],
        "updated_at": row[6]
    }

# -------- 4. ОБНОВЛЕНИЕ СТАТУСА ЗАЯВКИ --------
@app.put("/order/{order_id}/status", response_model=OrderResponse, tags=["Orders"])
async def update_order_status(order_id: int, status_update: OrderUpdateStatus):
    """Изменить статус заявки"""
    schema = get_schema_prefix()
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем, что заявка существует
    cur.execute(f"SELECT id FROM {schema}orders WHERE id = %s", (order_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    query = f"""
        UPDATE {schema}orders 
        SET status = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING id, client_id, driver_id, weight, status, created_at, updated_at
    """
    cur.execute(query, (status_update.status, order_id))
    row = cur.fetchone()
    
    # Получаем имена
    cur.execute(f"""
        SELECT 
            c.name AS client_name,
            d.full_name AS driver_name
        FROM {schema}orders o
        LEFT JOIN {schema}clients c ON o.client_id = c.id
        LEFT JOIN {schema}drivers d ON o.driver_id = d.id
        WHERE o.id = %s
    """, (row[0],))
    names = cur.fetchone()
    
    cur.close()
    conn.close()
    
    return {
        "id": row[0],
        "client_id": row[1],
        "client_name": names[0] if names else None,
        "driver_id": row[2],
        "driver_name": names[1] if names else None,
        "weight": row[3],
        "status": row[4],
        "created_at": row[5],
        "updated_at": row[6]
    }

# -------- 5. СПИСОК КЛИЕНТОВ --------
@app.get("/clients", response_model=List[ClientResponse], tags=["Clients"])
async def get_clients():
    """Получить список всех клиентов"""
    schema = get_schema_prefix()
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = f"""
        SELECT id, name, inn, email, phone, created_at
        FROM {schema}clients
        ORDER BY name
    """
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    return rows

# -------- 6. СПИСОК СТАТУСОВ (ДЛЯ UI) --------
@app.get("/statuses", tags=["System"])
async def get_statuses():
    """Получить список возможных статусов заявок"""
    schema = get_schema_prefix()
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = f"""
        SELECT code, name, description
        FROM {schema}statuses
        ORDER BY id
    """
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    return rows

# ============================================================
# ЗАПУСК (для отладки)
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)