from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrderCreate(BaseModel):
    client_id: int
    driver_id: Optional[int] = None
    weight: float
    status: Optional[str] = "created"

class OrderUpdateStatus(BaseModel):
    status: str

class OrderResponse(BaseModel):
    id: int
    client_id: int
    client_name: Optional[str] = None
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    weight: float
    status: str
    created_at: datetime
    updated_at: datetime

class ClientResponse(BaseModel):
    id: int
    name: str
    inn: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime