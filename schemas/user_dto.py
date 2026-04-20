from pydantic import BaseModel
from typing import Optional

class KartaUpdate(BaseModel):
    koszulka: str
    dres: str
    alergie: str
    telefon: str

class UserCreate(BaseModel):
    imie: str
    nazwisko: str
    email: str
    haslo: str
    rola: str
    rocznik_dziecka: Optional[int] = None
    imie_dziecka: Optional[str] = None
    nazwisko_dziecka: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    haslo: str

class UserBadaniaUpdate(BaseModel):
    badania_start: str
    badania_koniec: str

class UserResponse(BaseModel):
    id: int
    imie: str
    nazwisko: str
    email: str
    rola: str
    rocznik_dziecka: Optional[int] = None
    imie_dziecka: Optional[str] = None
    nazwisko_dziecka: Optional[str] = None
    przypisany_trener: Optional[str] = None
    badania_start: Optional[str] = None
    badania_koniec: Optional[str] = None
    czy_aktywny: bool = False
    rozmiar_koszulki: str | None = None
    rozmiar_dresu: str | None = None
    alergie: str | None = None
    telefon_ice: str | None = None

    class Config:
        from_attributes = True

class ObozCreate(BaseModel):
    nazwa: str
    grupa: str
    od: str
    do: str
    cena: int
    opis: str

class ObozResponse(ObozCreate):
    id: int
    
    class Config:
        from_attributes = True

class ObozZapisCreate(BaseModel):
    user_id: int
    imie_dziecka: str
    nazwisko_dziecka: str

class SprzetCreate(BaseModel):
    nazwa: str
    ilosc: int

class SprzetResponse(SprzetCreate):
    id: int
    class Config:
        from_attributes = True

class WydanieCreate(BaseModel):
    sprzet_id: int
    nazwa: str
    ilosc: int
    trener: str

class WydanieResponse(WydanieCreate):
    id: int
    data: str
    class Config:
        from_attributes = True

class KonspektCreate(BaseModel):
    temat: str
    cel: str
    czas: int
    opis: str

class KonspektResponse(KonspektCreate):
    id: int
    data: str
    autor_id: int
    class Config:
        from_attributes = True

class MatchRatingCreate(BaseModel):
    zawodnik: str
    mecz: str
    tech: int
    mot: int
    wal: int
    uwagi: str

class MatchRatingResponse(MatchRatingCreate):
    id: int
    data: str
    trener_id: int
    class Config:
        from_attributes = True