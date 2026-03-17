from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Plik bazy utworzy się automatycznie w głównym folderze
SQLALCHEMY_DATABASE_URL = "sqlite:///./klub_lks.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Funkcja dostarczająca sesję bazy danych do naszych ścieżek
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()