from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.src.db.database import get_session
from app.src.schemas.user import UserRead, UserCreate
from app.src.services.user import UserService

router = APIRouter()

@router.post(
  "/", 
  response_model=UserRead, 
  status_code=status.HTTP_201_CREATED
)
def create_user(user_create: UserCreate, db: Session = Depends(get_session)):
  user_service = UserService(db)
  return user_service.create_user(user_create)