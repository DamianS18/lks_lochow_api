import os
from pathlib import Path
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import get_db
from models.user_model import User, Payment
from schemas.user_dto import UserCreate, UserResponse, UserLogin, UserBadaniaUpdate, KartaUpdate


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
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

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

# 1. REJESTRACJA (Otwarte dla każdego)
@router.post("/", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ten e-mail jest już zarejestrowany w systemie.")

    # Admin od razu jest aktywny, rodzice czekają na akceptację
    domyslnie_aktywny = True if user.rola in ["admin", "trener"] else False
    zabezpieczone_haslo = get_password_hash(user.haslo)

    nowy_user = User(
        imie=user.imie,
        nazwisko=user.nazwisko,
        email=user.email,
        haslo=zabezpieczone_haslo,
        rola=user.rola,
        rocznik_dziecka=user.rocznik_dziecka,
        imie_dziecka=user.imie_dziecka,
        nazwisko_dziecka=user.nazwisko_dziecka,
        przypisany_trener=None,
        czy_aktywny=domyslnie_aktywny
    )
    db.add(nowy_user)
    db.commit()
    db.refresh(nowy_user)
    return nowy_user

# 2. LOGOWANIE (Otwarte dla każdego)
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    
    if not db_user or not verify_password(user.haslo, db_user.haslo):
        raise HTTPException(status_code=401, detail="Błędne dane logowania")
    
    if not db_user.czy_aktywny:
        raise HTTPException(status_code=403, detail="Twoje konto czeka na akceptację przez Administratora.")
        
    token = create_access_token(data={"sub": str(db_user.id), "rola": db_user.rola})
    
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": db_user
    }

@router.get("/", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(User).all()

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