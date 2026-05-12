from sqlalchemy.orm import Session
from models.event_model import Event
from schemas.event_dto import EventCreate

# Pobieranie listy wydarzeń (Z FILTROWANIEM PO TYPIE - wymóg na zaliczenie)
def get_events(db: Session, typ: str = None):
    query = db.query(Event)
    if typ:
        query = query.filter(Event.typ == typ)
    return query.all()

def get_event_by_id(db: Session, event_id: int):
    return db.query(Event).filter(Event.id == event_id).first()

def create_event(db: Session, event: EventCreate, trener_id: int = None):
    db_event = Event(
        **event.model_dump(),
        trener_id=trener_id
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def update_event(db: Session, db_event: Event, event_update: EventCreate):
    for key, value in event_update.model_dump().items():
        setattr(db_event, key, value)
    db.commit()
    db.refresh(db_event)
    return db_event

def delete_event(db: Session, db_event: Event):
    db.delete(db_event)
    db.commit()
    return True