from fastapi import FastAPI
from routers import user_router
from database import engine, Base

# Tworzenie wszystkich tabel w bazie danych (jeśli nie istnieją)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LKS Łochów API",
    description="System zarządzania klubem piłkarskim",
    version="1.0.0"
)

app.include_router(user_router.router)

@app.get("/")
def read_root():
    return {"message": "Witaj w API klubu LKS Łochów!"}