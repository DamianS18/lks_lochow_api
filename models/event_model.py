from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from database import Base
import datetime

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    nazwa = Column(String, index=True)
    opis = Column(String)
    typ = Column(String, index=True) # np. "trening" lub "mecz"
    data_rozpoczecia = Column(DateTime, default=datetime.datetime.utcnow)
    data_zakonczenia = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Identyfikator właściciela (zgodnie z wymogiem sylabusa)
    trener_id = Column(Integer, ForeignKey("users.id"))