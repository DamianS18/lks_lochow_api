from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas.user_dto import UserCreate, UserResponse
from repositories import user_repo

router = APIRouter(prefix="/users", tags=["Użytkownicy"])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Router tylko przekazuje zadanie do Repozytorium
    return user_repo.create_user(db=db, user=user)

@router.get("/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return user_repo.get_all_users(db=db)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = user_repo.get_user_by_id(db=db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono użytkownika")
    return db_user