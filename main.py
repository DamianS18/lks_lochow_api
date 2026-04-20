import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Importy bazy i modeli
from database import engine, Base, SessionLocal
from models import user_model, event_model, attendance_model 
from routers import user_router, event_router

# Konfiguracja logowania (wygląd komunikatów w konsoli)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Tworzenie tabel w bazie danych
Base.metadata.create_all(bind=engine)

def stworz_pierwszego_admina():
    db = SessionLocal()
    # 1. Sprawdzamy, czy admin już istnieje w bazie
    admin = db.query(user_model.User).filter(user_model.User.email == "admin@klub.pl").first()
    
    if not admin:
        # 2. Tworzymy bezpieczny SZYFR z hasła "admin123"
        haslo_hash = user_router.get_password_hash("admin123")
        
        # 3. Dodajemy konto admina do bazy
        nowy_admin = user_model.User(
            imie="Główny",
            nazwisko="Administrator",
            email="admin@klub.pl",
            haslo=haslo_hash,
            rola="admin",
            czy_aktywny=True  # Ważne: Admin od razu jest aktywny!
        )
        db.add(nowy_admin)
        db.commit()
        logger.info("🚀 STWORZONO NOWE KONTO ADMINA W BAZIE! (admin@klub.pl)")
        
    db.close()

stworz_pierwszego_admina()

app = FastAPI(
    title="LKS Łochów API",
    description="System zarządzania klubem piłkarskim",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Rejestracja routerów (Twoich ścieżek API)
app.include_router(user_router.router)
app.include_router(event_router.router) 

# FastAPI serwuje cały folder 'frontend' jako stronę WWW
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")