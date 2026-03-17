from sqlalchemy import Column, Integer, ForeignKey, String, DateTime
from database import Base
import datetime

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id")) # ID treningu
    user_id = Column(Integer, ForeignKey("users.id"))   # ID zawodnika
    status = Column(String, default="zapisany")
    data_zapisu = Column(DateTime, default=datetime.datetime.utcnow)