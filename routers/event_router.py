from schemas.attendance_dto import AttendanceCreate, AttendanceResponse
from repositories import attendance_repo
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from schemas.event_dto import EventCreate, EventResponse
from repositories import event_repo

router = APIRouter(prefix="/events", tags=["Wydarzenia (Zamiast Aukcji)"])

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    return event_repo.create_event(db=db, event=event)

# Tutaj zrealizowany jest wymóg filtrowania wg kategorii (typu wydarzenia)
@router.get("/", response_model=List[EventResponse])
def get_events(
    typ: Optional[str] = Query(None, description="Filtruj po typie (np. mecz, trening)"), 
    db: Session = Depends(get_db)
):
    return event_repo.get_events(db=db, typ=typ)

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