from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrderCreate(BaseModel):
    client_id: int
    manager_id: int
    driver_id: Optional[int] = None
    weight: float
    status_id: int = 1  # по умолчанию "Создана" (id=1)

class OrderUpdateStatus(BaseModel):
    status_id: int

class OrderResponse(BaseModel):
    id: int
    client_id: int
    client_name: Optional[str] = None
    manager_id: int
    manager_name: Optional[str] = None
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    weight: float
    status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ClientResponse(BaseModel):
    id: int
    username: str
    full_name: str
    phone: Optional[str] = None
    created_at: datetime