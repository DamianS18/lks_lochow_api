from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Dane, które trener wysyła, aby utworzyć trening
class EventCreate(BaseModel):
    nazwa: str
    opis: Optional[str] = None
    typ: str
    data_rozpoczecia: datetime
    data_zakonczenia: datetime
    trener_id: int

# Dane, które API zwraca do przeglądarki
class EventResponse(BaseModel):
    id: int
    nazwa: str
    opis: Optional[str] = None
    typ: str
    data_rozpoczecia: datetime
    data_zakonczenia: datetime
    trener_id: int

    class Config:
        from_attributes = True