from models import user_model, event_model, attendance_model # Dodane attendance_model
from fastapi import FastAPI
from routers import user_router, event_router
from database import engine, Base
from models import user_model, event_model # Musimy zaimportować modele, by baza się zbudowała

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LKS Łochów API",
    description="System zarządzania klubem piłkarskim",
    version="1.0.0"
)

app.include_router(user_router.router)
app.include_router(event_router.router) # Dodajemy nasz nowy panel wydarzeń!

@app.get("/")
def read_root():
    return {"message": "Witaj w API klubu LKS Łochów!"}