from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    nazwa = Column(String)
    data_rozpoczecia = Column(String)
    data_zakonczenia = Column(String)
    typ = Column(String)
    opis = Column(String, nullable=True)
    trener_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class Oboz(Base):
    __tablename__ = "obozy"

    id = Column(Integer, primary_key=True, index=True)
    nazwa = Column(String)
    grupa = Column(String)
    od = Column(String)
    do = Column(String)
    cena = Column(Integer)
    opis = Column(String)

class ObozZapis(Base):
    __tablename__ = "obozy_zapisy"

    id = Column(Integer, primary_key=True, index=True)
    oboz_id = Column(Integer, ForeignKey("obozy.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    imie_dziecka = Column(String)
    nazwisko_dziecka = Column(String)

class Sprzet(Base):
    __tablename__ = "magazyn_sprzet"

    id = Column(Integer, primary_key=True, index=True)
    nazwa = Column(String)
    ilosc = Column(Integer)

class WydanieSprzetu(Base):
    __tablename__ = "magazyn_wydania"

    id = Column(Integer, primary_key=True, index=True)
    sprzet_id = Column(Integer, ForeignKey("magazyn_sprzet.id"))
    nazwa = Column(String)
    ilosc = Column(Integer)
    trener = Column(String)
    data = Column(String)

class Konspekt(Base):
    __tablename__ = "konspekty"

    id = Column(Integer, primary_key=True, index=True)
    temat = Column(String)
    cel = Column(String)
    czas = Column(Integer)
    opis = Column(String)
    data = Column(String)
    autor_id = Column(Integer, ForeignKey("users.id")) 

class MatchRating(Base):
    __tablename__ = "match_ratings"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(String)
    zawodnik = Column(String)
    mecz = Column(String)
    tech = Column(Integer)
    mot = Column(Integer)
    wal = Column(Integer)
    uwagi = Column(String)
    trener_id = Column(Integer, ForeignKey("users.id"))