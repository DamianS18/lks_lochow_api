import os
import secrets
from pathlib import Path
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import get_db
from models.user_model import User, Payment
from schemas.user_dto import (
    KartaUpdate,
    LoginResponse,
    PasswordResetRequest,
    PasswordResetSet,
    UserBadaniaUpdate,
    UserCreate,
    UserLogin,
    UserResponse,
)


env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def validate_password_strength(password: str):
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Haslo musi miec minimum 6 znakow")
    if not any(ch.isupper() for ch in password):
        raise HTTPException(status_code=400, detail="Haslo musi zawierac wielka litere")
    if not any(ch.isdigit() for ch in password):
        raise HTTPException(status_code=400, detail="Haslo musi zawierac cyfre")


def trener_identifier(user: User) -> str:
    if user.rola != "trener":
        return ""
    if user.przypisany_trener:
        return f"{user.przypisany_trener} - {user.imie} {user.nazwisko}"
    return f"{user.imie} {user.nazwisko}"

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Sprawdza token przed wpuszczeniem do funkcji."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Brak dostępu - nieprawidłowy token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesja wygasła, zaloguj się ponownie.")
    except jwt.InvalidTokenError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
        
    return user

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

# 1. REJESTRACJA (Otwarte dla każdego – ale TYLKO jako rodzic!)
@router.post("/", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == str(user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ten e-mail jest już zarejestrowany w systemie.")

    # BEZPIECZEŃSTWO: Rejestracja ZAWSZE tworzy konto rodzica.
    # Konta trenerów tworzy admin, konto admina jest jedno i tworzone przy starcie.
    # Ignorujemy rolę z requestu – zapobiegamy eskalacji uprawnień!
    validate_password_strength(user.haslo)
    zabezpieczone_haslo = get_password_hash(user.haslo)

    nowy_user = User(
        imie=user.imie,
        nazwisko=user.nazwisko,
        email=str(user.email),
        haslo=zabezpieczone_haslo,
        rola="rodzic",
        rocznik_dziecka=user.rocznik_dziecka,
        imie_dziecka=user.imie_dziecka,
        nazwisko_dziecka=user.nazwisko_dziecka,
        przypisany_trener=None,
        czy_aktywny=False  # Rodzic ZAWSZE czeka na akceptację admina
    )
    db.add(nowy_user)
    db.commit()
    db.refresh(nowy_user)
    return nowy_user

# 1b. TWORZENIE KONTA TRENERA (Tylko admin!)
@router.post("/admin/utworz-trenera", response_model=UserResponse, status_code=201)
def create_trener(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ZABEZPIECZENIE: Tylko admin może tworzyć konta trenerów
    if current_user.rola != "admin":
        raise HTTPException(status_code=403, detail="Tylko admin może tworzyć konta trenerów")
    
    db_user = db.query(User).filter(User.email == str(user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ten e-mail jest już zarejestrowany w systemie.")

    validate_password_strength(user.haslo)
    zabezpieczone_haslo = get_password_hash(user.haslo)

    nowy_trener = User(
        imie=user.imie,
        nazwisko=user.nazwisko,
        email=str(user.email),
        haslo=zabezpieczone_haslo,
        rola="trener",
        przypisany_trener=None,
        czy_aktywny=True  # Trener aktywny od razu (tworzony przez admina)
    )
    db.add(nowy_trener)
    db.commit()
    db.refresh(nowy_trener)
    return nowy_trener

# 2. LOGOWANIE (Otwarte dla każdego)
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Szukamy użytkownika w bazie po emailu (Swagger przesyła email w polu 'username')
    db_user = db.query(User).filter(User.email == form_data.username).first()
    
    # 2. Weryfikacja: Czy użytkownik istnieje i czy hasło jest poprawne
    # Zakładam, że masz funkcję verify_password i pole w bazie o nazwie 'haslo'
    if not db_user or not verify_password(form_data.password, db_user.haslo):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Błędny e-mail lub hasło"
        )
    
    # 3. Sprawdzenie czy konto jest aktywne
    if not db_user.czy_aktywny:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Konto oczekuje na akceptację przez administratora"
        )
        
    # 4. Generowanie tokena JWT
    token = create_access_token(data={"sub": str(db_user.id), "rola": db_user.rola})
    
    # 5. Zwrócenie danych (Kluczowe dla frontendu: obiekt 'user')
    return {
        "access_token": token, 
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "rola": db_user.rola,
            "imie": db_user.imie,     # Pobierze "Główny"
            "nazwisko": db_user.nazwisko # Pobierze "Administrator"
        }
    }


@router.post("/reset-hasla/prosba")
def popros_o_reset_hasla(reset: PasswordResetRequest, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == str(reset.email)).first()
    if db_user:
        db_user.reset_hasla_requested = True
        db_user.reset_hasla_approved = False
        db_user.reset_hasla_token_hash = None
        db_user.reset_hasla_expires_at = None
        db.commit()
    return {"wiadomosc": "Jesli konto istnieje, prosba trafila do administratora."}

@router.patch("/{user_id}/reset-hasla/akceptuj")
def zaakceptuj_reset_hasla(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.rola != "admin":
        raise HTTPException(status_code=403, detail="Tylko admin moze akceptowac reset hasla")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Nie znaleziono uzytkownika")

    reset_code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    db_user.reset_hasla_requested = True
    db_user.reset_hasla_approved = True
    db_user.reset_hasla_token_hash = get_password_hash(reset_code)
    db_user.reset_hasla_expires_at = expires_at.isoformat()
    db.commit()
    return {
        "wiadomosc": "Reset hasla zaakceptowany",
        "kod": reset_code,
        "wygasa_o": db_user.reset_hasla_expires_at,
    }

@router.patch("/reset-hasla/ustaw")
def ustaw_nowe_haslo(reset: PasswordResetSet, db: Session = Depends(get_db)):
    if reset.nowe_haslo != reset.powtorz_haslo:
        raise HTTPException(status_code=400, detail="Hasla nie sa identyczne")
    validate_password_strength(reset.nowe_haslo)

    db_user = db.query(User).filter(User.email == str(reset.email)).first()
    if not db_user or not db_user.reset_hasla_approved:
        raise HTTPException(status_code=403, detail="Administrator nie zaakceptowal resetu hasla")
    if not db_user.reset_hasla_token_hash or not db_user.reset_hasla_expires_at:
        raise HTTPException(status_code=403, detail="Kod resetu nie jest aktywny")
    try:
        expires_at = datetime.fromisoformat(db_user.reset_hasla_expires_at)
    except ValueError:
        raise HTTPException(status_code=403, detail="Kod resetu jest nieprawidlowy")
    if expires_at < datetime.now(timezone.utc):
        db_user.reset_hasla_requested = False
        db_user.reset_hasla_approved = False
        db_user.reset_hasla_token_hash = None
        db_user.reset_hasla_expires_at = None
        db.commit()
        raise HTTPException(status_code=403, detail="Kod resetu wygasl. Popros administratora o nowy kod.")
    if not verify_password(reset.kod, db_user.reset_hasla_token_hash):
        raise HTTPException(status_code=403, detail="Nieprawidlowy kod resetu")

    db_user.haslo = get_password_hash(reset.nowe_haslo)
    db_user.reset_hasla_requested = False
    db_user.reset_hasla_approved = False
    db_user.reset_hasla_token_hash = None
    db_user.reset_hasla_expires_at = None
    db.commit()
    return {"wiadomosc": "Haslo zostalo zmienione. Mozesz sie zalogowac."}

@router.get("/", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.rola == "admin":
        return db.query(User).all()
    if current_user.rola == "trener":
        identyfikator = trener_identifier(current_user)
        return db.query(User).filter(
            (User.id == current_user.id) |
            ((User.rola == "rodzic") & (User.przypisany_trener == identyfikator))
        ).all()
    return db.query(User).filter(User.id == current_user.id).all()

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ZABEZPIECZENIE: Rodzic może pobrać tylko siebie
    if current_user.rola == "rodzic" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Brak dostępu do cudzego profilu")
        
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    return db_user

@router.patch("/{user_id}/trener")
def ustaw_trenera(user_id: int, nazwa_trenera: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ZABEZPIECZENIE: Tylko admin może przypisać trenera
    if current_user.rola != "admin":
        raise HTTPException(status_code=403, detail="Tylko admin może przypisywać trenerów")
        
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    db_user.przypisany_trener = nazwa_trenera
    db.commit()
    return {"wiadomosc": "Zaktualizowano trenera"}

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ZABEZPIECZENIE: Tylko admin może usuwać konta
    if current_user.rola != "admin":
        raise HTTPException(status_code=403, detail="Tylko admin może usuwać konta")
        
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    db.delete(db_user)
    db.commit()
    return {"wiadomosc": "Usunięto pomyślnie"}

@router.patch("/{user_id}/badania")
def aktualizuj_badania(user_id: int, dane_badan: UserBadaniaUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ZABEZPIECZENIE: Rodzic nie może sfałszować daty badań (tylko trener/admin)
    if current_user.rola == "rodzic":
        raise HTTPException(status_code=403, detail="Tylko trener może edytować badania")
        
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Nie znaleziono zawodnika")
    
    db_user.badania_start = dane_badan.badania_start
    db_user.badania_koniec = dane_badan.badania_koniec
    db.commit()
    return {"wiadomosc": "Badania zostały zaktualizowane pomyślnie!"}

@router.patch("/{user_id}/akceptuj")
def akceptuj_konto(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ZABEZPIECZENIE: Tylko admin może akceptować
    if current_user.rola != "admin":
        raise HTTPException(status_code=403, detail="Tylko admin może akceptować konta")
        
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Nie znaleziono")
    db_user.czy_aktywny = True
    db.commit()
    return {"wiadomosc": "Konto zaakceptowane!"}

@router.patch("/{user_id}/karta")
def aktualizuj_karte_medyczna(user_id: int, karta: KartaUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ZABEZPIECZENIE: Rodzic edytuje tylko swoją, admin może każdą
    if current_user.rola == "rodzic" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Możesz edytować tylko swoją kartę medyczną")
        
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Nie znaleziono użytkownika")
        
    db_user.rozmiar_koszulki = karta.koszulka
    db_user.rozmiar_dresu = karta.dres
    db_user.alergie = karta.alergie
    db_user.telefon_ice = karta.telefon
    db.commit()
    return {"wiadomosc": "Karta medyczna zaktualizowana pomyślnie!"}

@router.get("/{user_id}/platnosci")
def pobierz_platnosci(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ZABEZPIECZENIE: Rodzic widzi tylko swoje składki
    if current_user.rola == "rodzic" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Możesz podglądać tylko swoje płatności")
        
    platnosci = db.query(Payment).filter(Payment.user_id == user_id).all()
    return [{"miesiac_idx": p.miesiac_idx, "oplacone": p.oplacone} for p in platnosci]

@router.patch("/{user_id}/platnosci/{miesiac_idx}")
def zmien_status_platnosci(user_id: int, miesiac_idx: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # ZABEZPIECZENIE: Tylko admin zmienia status płatności
    if current_user.rola != "admin":
        raise HTTPException(status_code=403, detail="Tylko admin może zmieniać status płatności")
        
    platnosc = db.query(Payment).filter(Payment.user_id == user_id, Payment.miesiac_idx == miesiac_idx).first()
    
    if platnosc:
        platnosc.oplacone = not platnosc.oplacone
    else:
        nowa_platnosc = Payment(user_id=user_id, miesiac_idx=miesiac_idx, oplacone=True)
        db.add(nowa_platnosc)
        
    db.commit()
    return {"wiadomosc": "Status płatności zmieniony"}
