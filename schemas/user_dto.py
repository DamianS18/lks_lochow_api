from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional

class KartaUpdate(BaseModel):
    koszulka: str = Field(max_length=20)
    dres: str = Field(max_length=20)
    alergie: str = Field(max_length=500)
    telefon: str = Field(max_length=30)

class UserCreate(BaseModel):
    imie: str = Field(min_length=2, max_length=80)
    nazwisko: str = Field(min_length=2, max_length=80)
    email: EmailStr
    haslo: str = Field(min_length=6, max_length=128)
    rola: Literal["rodzic", "trener", "admin"] = "rodzic"
    rocznik_dziecka: Optional[int] = Field(default=None, ge=2000, le=2035)
    imie_dziecka: Optional[str] = Field(default=None, max_length=80)
    nazwisko_dziecka: Optional[str] = Field(default=None, max_length=80)

class UserLogin(BaseModel):
    email: EmailStr
    haslo: str = Field(min_length=1, max_length=128)

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetSet(BaseModel):
    email: EmailStr
    kod: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    nowe_haslo: str = Field(min_length=6, max_length=128)
    powtorz_haslo: str = Field(min_length=6, max_length=128)

class UserBadaniaUpdate(BaseModel):
    badania_start: str = Field(max_length=20)
    badania_koniec: str = Field(max_length=20)

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
    reset_hasla_requested: bool = False
    reset_hasla_approved: bool = False

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ObozCreate(BaseModel):
    nazwa: str = Field(min_length=2, max_length=120)
    grupa: str = Field(min_length=1, max_length=120)
    od: str = Field(max_length=20)
    do: str = Field(max_length=20)
    cena: int = Field(ge=0, le=100000)
    opis: str = Field(max_length=1000)

class ObozResponse(ObozCreate):
    id: int
    
    class Config:
        from_attributes = True

class ObozZapisCreate(BaseModel):
    user_id: Optional[int] = None
    imie_dziecka: Optional[str] = None
    nazwisko_dziecka: Optional[str] = None

class SprzetCreate(BaseModel):
    nazwa: str = Field(min_length=2, max_length=120)
    ilosc: int = Field(ge=1, le=10000)

class SprzetResponse(SprzetCreate):
    id: int
    class Config:
        from_attributes = True

class WydanieCreate(BaseModel):
    sprzet_id: int
    nazwa: str = Field(min_length=2, max_length=120)
    ilosc: int = Field(ge=1, le=10000)
    trener: str = Field(min_length=2, max_length=160)

class WydanieResponse(WydanieCreate):
    id: int
    data: str
    class Config:
        from_attributes = True

class KonspektCreate(BaseModel):
    temat: str = Field(min_length=2, max_length=160)
    cel: str = Field(min_length=2, max_length=300)
    czas: int = Field(ge=1, le=300)
    opis: str = Field(min_length=2, max_length=5000)

class KonspektResponse(KonspektCreate):
    id: int
    data: str
    autor_id: int
    class Config:
        from_attributes = True

class MatchRatingCreate(BaseModel):
    zawodnik: str = Field(min_length=2, max_length=160)
    mecz: str = Field(min_length=2, max_length=160)
    tech: int = Field(ge=1, le=10)
    mot: int = Field(ge=1, le=10)
    wal: int = Field(ge=1, le=10)
    uwagi: str = Field(max_length=2000)

class MatchRatingResponse(MatchRatingCreate):
    id: int
    data: str
    trener_id: int
    class Config:
        from_attributes = True
