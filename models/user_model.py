from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    imie = Column(String, index=True)
    nazwisko = Column(String)
    email = Column(String, unique=True, index=True)
    haslo = Column(String)
    rola = Column(String)
    rocznik_dziecka = Column(Integer, nullable=True)
    imie_dziecka = Column(String, nullable=True)
    nazwisko_dziecka = Column(String, nullable=True)
    przypisany_trener = Column(String, nullable=True)
    badania_start = Column(String, nullable=True)
    badania_koniec = Column(String, nullable=True)
    
    czy_aktywny = Column(Boolean, default=False)
    
    # KARTA MEDYCZNA I SPRZĘTOWA
    rozmiar_koszulki = Column(String, nullable=True)
    rozmiar_dresu = Column(String, nullable=True)
    alergie = Column(String, nullable=True)
    telefon_ice = Column(String, nullable=True)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id")) # Łączymy wpłatę z konkretnym rodzicem
    miesiac_idx = Column(Integer) # Numer miesiąca (0 = Styczeń, 1 = Luty itd.)
    oplacone = Column(Boolean, default=False)

