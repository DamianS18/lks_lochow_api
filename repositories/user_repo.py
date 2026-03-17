from sqlalchemy.orm import Session
from models.user_model import User
from schemas.user_dto import UserCreate

# Funkcja pobierająca jednego użytkownika po ID
def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

# Funkcja pobierająca wszystkich użytkowników
def get_all_users(db: Session):
    return db.query(User).all()

# Funkcja zapisująca nowego użytkownika do bazy
def create_user(db: Session, user: UserCreate):
    # Mapujemy dane z DTO na nasz Model bazy danych
    db_user = User(
        imie=user.imie,
        nazwisko=user.nazwisko,
        email=user.email,
        rola=user.rola,
        haslo=user.haslo # W prawdziwej aplikacji hasło byśmy tu zahashowali!
    )
    db.add(db_user)
    db.commit() # Zatwierdzamy zmiany w bazie
    db.refresh(db_user) # Odświeżamy, żeby uzyskać wygenerowane ID
    return db_user