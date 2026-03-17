from pydantic import BaseModel, EmailStr
from typing import Optional

# 1. DTO - Dane przychodzące (np. formularz rejestracji rodzica/trenera)
class UserCreate(BaseModel):
    imie: str
    nazwisko: str
    email: EmailStr
    rola: str # "rodzic" lub "trener"
    haslo: str # Pamiętaj, hasło dostajemy, ale NIE CHCEMY go potem zwracać!

# 2. DTO - Dane wychodzące (to wysyłamy na zewnątrz, np. do przeglądarki)
class UserResponse(BaseModel):
    id: int
    imie: str
    nazwisko: str
    email: EmailStr
    rola: str
    
    class Config:
        from_attributes = True # To nam później ułatwi współpracę z bazą danych