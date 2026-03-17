from sqlalchemy.orm import Session
from models.attendance_model import Attendance
from models.event_model import Event
from schemas.attendance_dto import AttendanceCreate
from fastapi import HTTPException
import datetime

def create_attendance(db: Session, event_id: int, attendance: AttendanceCreate):
    # 1. Sprawdzamy czy trening w ogóle istnieje
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Wydarzenie nie istnieje")

    # 2. WYMÓG ZALICZENIOWY: Blokada zapisu po czasie (jak koniec aukcji)
    if event.data_rozpoczecia < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Ten trening już się rozpoczął lub minął. Nie można się zapisać.")

    # 3. WYMÓG ZALICZENIOWY: Weryfikacja logiczna (czy już nie jest zapisany)
    existing_attendance = db.query(Attendance).filter(
        Attendance.event_id == event_id,
        Attendance.user_id == attendance.user_id
    ).first()
    if existing_attendance:
        raise HTTPException(status_code=400, detail="Ten zawodnik jest już zapisany na to wydarzenie")

    # Zapis do bazy
    db_attendance = Attendance(event_id=event_id, user_id=attendance.user_id)
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

# Funkcja do pobierania całej listy obecności z danego treningu
def get_attendances_for_event(db: Session, event_id: int):
    return db.query(Attendance).filter(Attendance.event_id == event_id).all()