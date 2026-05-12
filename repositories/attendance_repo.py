from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.attendance_model import Attendance
from models.event_model import Event
from schemas.attendance_dto import AttendanceCreate


ALLOWED_ATTENDANCE_STATUSES = {"obecny", "nieobecny", "usprawiedliwiony"}


def create_attendance(db: Session, event_id: int, attendance: AttendanceCreate):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Wydarzenie nie istnieje")

    status = attendance.status
    if status not in ALLOWED_ATTENDANCE_STATUSES:
        status = "obecny"

    existing_attendance = db.query(Attendance).filter(
        Attendance.event_id == event_id,
        Attendance.user_id == attendance.user_id,
    ).first()

    if existing_attendance:
        existing_attendance.status = status
        db.commit()
        db.refresh(existing_attendance)
        return existing_attendance

    db_attendance = Attendance(
        event_id=event_id,
        user_id=attendance.user_id,
        status=status,
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance


def get_attendances_for_event(db: Session, event_id: int):
    return db.query(Attendance).filter(Attendance.event_id == event_id).all()
