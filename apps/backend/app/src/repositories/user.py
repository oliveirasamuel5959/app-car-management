from sqlalchemy.orm import Session
from app.src.models.user import User 
from app.src.schemas.user import UserCreate
from app.src.core.security import hash_password

def repo_create_user(db: Session, user: UserCreate) -> User:
    db_user = User(
        name=user.name,
        age=user.age,
        sex=user.sex,
        email=user.email,
        role=user.role,
        password_hash=hash_password(user.password),
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()
