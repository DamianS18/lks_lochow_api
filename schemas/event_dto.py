from pydantic import BaseModel, Field
from typing import Optional

# Dane, które trener wysyła, aby utworzyć trening
# trener_id NIE jest tu potrzebny – pobierany z tokena JWT w routerze
class EventCreate(BaseModel):
    nazwa: str = Field(min_length=2, max_length=160)
    typ: str = Field(min_length=2, max_length=40)
    data_rozpoczecia: str = Field(max_length=40)
    data_zakonczenia: str = Field(max_length=40)
    opis: Optional[str] = Field(default=None, max_length=2000)

# Dane, które API zwraca do przeglądarki
class EventResponse(BaseModel):
    id: int
    nazwa: str
    typ: str
    data_rozpoczecia: str
    data_zakonczenia: str
    opis: Optional[str] = None
    trener_id: Optional[int] = None

    class Config:
        from_attributes = True
