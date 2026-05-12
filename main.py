import os
import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

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

# Automatyczna migracja: dodanie brakujących kolumn do istniejących tabel
# (create_all nie dodaje kolumn do tabel, które już istnieją)
def migruj_brakujace_kolumny():
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    if "events" in insp.get_table_names():
        kolumny = [c["name"] for c in insp.get_columns("events")]
        with engine.begin() as conn:
            if "opis" not in kolumny:
                conn.execute(text("ALTER TABLE events ADD COLUMN opis VARCHAR"))
                logger.info("📦 Dodano kolumnę 'opis' do tabeli events")
            if "trener_id" not in kolumny:
                conn.execute(text("ALTER TABLE events ADD COLUMN trener_id INTEGER"))
                logger.info("📦 Dodano kolumnę 'trener_id' do tabeli events")
    if "users" in insp.get_table_names():
        kolumny = [c["name"] for c in insp.get_columns("users")]
        with engine.begin() as conn:
            if "reset_hasla_requested" not in kolumny:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_hasla_requested BOOLEAN DEFAULT false"))
                logger.info("Dodano kolumne 'reset_hasla_requested' do tabeli users")
            if "reset_hasla_approved" not in kolumny:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_hasla_approved BOOLEAN DEFAULT false"))
                logger.info("Dodano kolumne 'reset_hasla_approved' do tabeli users")
            if "reset_hasla_token_hash" not in kolumny:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_hasla_token_hash VARCHAR"))
                logger.info("Dodano kolumne 'reset_hasla_token_hash' do tabeli users")
            if "reset_hasla_expires_at" not in kolumny:
                conn.execute(text("ALTER TABLE users ADD COLUMN reset_hasla_expires_at VARCHAR"))
                logger.info("Dodano kolumne 'reset_hasla_expires_at' do tabeli users")

migruj_brakujace_kolumny()

def stworz_pierwszego_admina():
    db = SessionLocal()
    # 1. Sprawdzamy, czy admin już istnieje w bazie
    admin = db.query(user_model.User).filter(user_model.User.email == "admin@klub.pl").first()
    
    if not admin:
        # 2. Pobieramy hasło admina z .env (NIE hardcodujemy!)
        admin_password = os.getenv("ADMIN_PASSWORD")
        if not admin_password:
            logger.warning("⚠️ ADMIN_PASSWORD nie ustawiony w .env! Konto admina NIE zostanie utworzone.")
            db.close()
            return
        
        haslo_hash = user_router.get_password_hash(admin_password)
        
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

# CORS – ograniczony do konkretnej domeny frontendu (NIE "*"!)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Rejestracja routerów (Twoich ścieżek API)
RATE_LIMITS = {
    ("POST", "/users/login"): (10, timedelta(minutes=1)),
    ("POST", "/users/"): (12, timedelta(minutes=5)),
    ("POST", "/users/reset-hasla/prosba"): (6, timedelta(minutes=5)),
}
DEFAULT_RATE_LIMIT = (240, timedelta(minutes=1))
rate_limit_buckets = defaultdict(deque)
MAX_RATE_LIMIT_BUCKETS = 10000


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    trust_proxy_headers = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"
    if trust_proxy_headers and forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith(("/docs", "/openapi.json", "/redoc")):
        return await call_next(request)

    limit, window = RATE_LIMITS.get((request.method, request.url.path), DEFAULT_RATE_LIMIT)
    key = (request.method, request.url.path, _client_ip(request))
    now = datetime.now(timezone.utc)

    if len(rate_limit_buckets) > MAX_RATE_LIMIT_BUCKETS:
        for bucket_key in list(rate_limit_buckets.keys()):
            bucket = rate_limit_buckets[bucket_key]
            while bucket and now - bucket[0] > window:
                bucket.popleft()
            if not bucket:
                rate_limit_buckets.pop(bucket_key, None)

    bucket = rate_limit_buckets[key]

    while bucket and now - bucket[0] > window:
        bucket.popleft()

    if len(bucket) >= limit:
        return JSONResponse(
            status_code=429,
            content={"detail": "Za duzo prob. Sprobuj ponownie za chwile."},
        )

    bucket.append(now)
    return await call_next(request)


app.include_router(user_router.router)
app.include_router(event_router.router) 

# FastAPI serwuje cały folder 'frontend' jako stronę WWW
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
