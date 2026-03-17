from pydantic import BaseModel
from datetime import datetime

class AttendanceCreate(BaseModel):
    user_id: int

class AttendanceResponse(BaseModel):
    id: int
    event_id: int
    user_id: int
    status: str
    data_zapisu: datetime

    class Config:
        from_attributes = True