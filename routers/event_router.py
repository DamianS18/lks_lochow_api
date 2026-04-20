from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models.event_model import Oboz, ObozZapis, Sprzet, WydanieSprzetu, Konspekt, MatchRating
from schemas.user_dto import ObozCreate, ObozResponse, ObozZapisCreate, SprzetCreate, SprzetResponse, WydanieCreate, WydanieResponse, KonspektCreate, KonspektResponse, MatchRatingCreate, MatchRatingResponse

from schemas.attendance_dto import AttendanceCreate, AttendanceResponse
from repositories import attendance_repo
from schemas.event_dto import EventCreate, EventResponse
from repositories import event_repo

# --- DODANE IMPORTY DLA BEZPIECZEŃSTWA ---
from models.user_model import User
from routers.user_router import get_current_user

router = APIRouter(prefix="/events", tags=["Wydarzenia (Zamiast Aukcji)"])

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    return event_repo.create_event(db=db, event=event)

@router.get("/", response_model=List[EventResponse])
def get_events(
    typ: Optional[str] = Query(None, description="Filtruj po typie (np. mecz, trening)"), 
    db: Session = Depends(get_db)
):
    return event_repo.get_events(db=db, typ=typ)


@router.post("/obozy", response_model=ObozResponse)
def dodaj_oboz(oboz: ObozCreate, db: Session = Depends(get_db)):
    nowy_oboz = Oboz(**oboz.dict())
    db.add(nowy_oboz)
    db.commit()
    db.refresh(nowy_oboz)
    return nowy_oboz

@router.get("/obozy", response_model=list[ObozResponse])
def pobierz_obozy(db: Session = Depends(get_db)):
    return db.query(Oboz).order_by(Oboz.id.desc()).all()

# --- ZABEZPIECZONA FUNKCJA USUWANIA OBOZU ---
@router.delete("/obozy/{oboz_id}")
def usun_oboz(oboz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.rola != "admin":
        raise HTTPException(status_code=403, detail="Brak uprawnień. Tylko Administrator może usuwać obozy.")
        
    oboz = db.query(Oboz).filter(Oboz.id == oboz_id).first()
    if not oboz:
        raise HTTPException(status_code=404, detail="Obóz nie istnieje")
    db.delete(oboz)
    db.commit()
    return {"wiadomosc": "Usunięto obóz"}

@router.post("/obozy/{oboz_id}/zapisy")
def zapisz_na_oboz(oboz_id: int, zapis: ObozZapisCreate, db: Session = Depends(get_db)):
    istniejacy_zapis = db.query(ObozZapis).filter(
        ObozZapis.oboz_id == oboz_id, 
        ObozZapis.user_id == zapis.user_id
    ).first()
    
    if istniejacy_zapis:
        raise HTTPException(status_code=400, detail="Dziecko jest już zapisane na ten obóz!")
        
    nowy_zapis = ObozZapis(
        oboz_id=oboz_id, 
        user_id=zapis.user_id, 
        imie_dziecka=zapis.imie_dziecka, 
        nazwisko_dziecka=zapis.nazwisko_dziecka
    )
    db.add(nowy_zapis)
    db.commit()
    return {"wiadomosc": "Zapisano pomyślnie!"}

@router.get("/obozy/{oboz_id}/zapisy")
def pobierz_zapisy(oboz_id: int, db: Session = Depends(get_db)):
    zapisy = db.query(ObozZapis).filter(ObozZapis.oboz_id == oboz_id).all()
    return zapisy


@router.get("/magazyn/sprzet", response_model=List[SprzetResponse])
def get_sprzet(db: Session = Depends(get_db)):
    return db.query(Sprzet).all()

@router.post("/magazyn/sprzet", response_model=SprzetResponse)
def dodaj_sprzet(sprzet: SprzetCreate, db: Session = Depends(get_db)):
    nowy = Sprzet(nazwa=sprzet.nazwa, ilosc=sprzet.ilosc)
    db.add(nowy)
    db.commit()
    db.refresh(nowy)
    return nowy

@router.get("/magazyn/wydania", response_model=List[WydanieResponse])
def get_wydania(db: Session = Depends(get_db)):
    return db.query(WydanieSprzetu).order_by(WydanieSprzetu.id.desc()).all()

@router.post("/magazyn/wydania", response_model=WydanieResponse)
def wydaj_sprzet(wydanie: WydanieCreate, db: Session = Depends(get_db)):
    sprzet_db = db.query(Sprzet).filter(Sprzet.id == wydanie.sprzet_id).first()
    if not sprzet_db or sprzet_db.ilosc < wydanie.ilosc:
        raise HTTPException(status_code=400, detail="Brak wystarczającej ilości sprzętu w magazynie")
    
    sprzet_db.ilosc -= wydanie.ilosc
    
    nowe_wydanie = WydanieSprzetu(
        sprzet_id=wydanie.sprzet_id,
        nazwa=wydanie.nazwa,
        ilosc=wydanie.ilosc,
        trener=wydanie.trener,
        data=date.today().strftime("%Y-%m-%d")
    )
    db.add(nowe_wydanie)
    db.commit()
    db.refresh(nowe_wydanie)
    return nowe_wydanie


@router.get("/konspekty", response_model=List[KonspektResponse])
def get_konspekty(db: Session = Depends(get_db)):
    return db.query(Konspekt).order_by(Konspekt.id.desc()).all()

@router.post("/konspekty", response_model=KonspektResponse)
def dodaj_konspekt(konspekt: KonspektCreate, autor_id: int, db: Session = Depends(get_db)):
    nowy = Konspekt(
        temat=konspekt.temat,
        cel=konspekt.cel,
        czas=konspekt.czas,
        opis=konspekt.opis,
        data=date.today().strftime("%Y-%m-%d"),
        autor_id=autor_id
    )
    db.add(nowy)
    db.commit()
    db.refresh(nowy)
    return nowy

@router.get("/ratings", response_model=List[MatchRatingResponse])
def get_ratings(db: Session = Depends(get_db)):
    return db.query(MatchRating).order_by(MatchRating.id.desc()).all()

@router.post("/ratings", response_model=MatchRatingResponse)
def dodaj_ocene(ocena: MatchRatingCreate, trener_id: int, db: Session = Depends(get_db)):
    nowa = MatchRating(
        **ocena.dict(),
        data=date.today().strftime("%Y-%m-%d"),
        trener_id=trener_id
    )
    db.add(nowa)
    db.commit()
    db.refresh(nowa)
    return nowa

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    db_event = event_repo.get_event_by_id(db=db, event_id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono wydarzenia")
    return db_event

@router.put("/{event_id}", response_model=EventResponse)
def update_event(event_id: int, event: EventCreate, db: Session = Depends(get_db)):
    db_event = event_repo.get_event_by_id(db=db, event_id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono wydarzenia")
    return event_repo.update_event(db=db, db_event=db_event, event_update=event)

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    db_event = event_repo.get_event_by_id(db=db, event_id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono wydarzenia")
    event_repo.delete_event(db=db, db_event=db_event)
    return None

@router.post("/{event_id}/attendances", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_attendance_for_event(event_id: int, attendance: AttendanceCreate, db: Session = Depends(get_db)):
    return attendance_repo.create_attendance(db=db, event_id=event_id, attendance=attendance)

@router.get("/{event_id}/attendances", response_model=List[AttendanceResponse])
def get_attendances_for_event(event_id: int, db: Session = Depends(get_db)):
    return attendance_repo.get_attendances_for_event(db=db, event_id=event_id)