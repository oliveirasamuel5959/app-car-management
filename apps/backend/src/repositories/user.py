from uuid import UUID

from sqlalchemy.orm import Session

from src.core.security import hash_password
from src.models.user import User
from src.schemas.user import UserCreate


def repo_create_user(db: Session, user: UserCreate, tenant_id: UUID | str) -> User:
    db_user = User(
        tenant_id=tenant_id,
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

def repo_get_all_users(db: Session, tenant_id: UUID | str) -> list[User]:
    return db.query(User).filter(User.tenant_id == tenant_id).all()

def repo_get_user_by_email(db: Session, email: str, tenant_id: UUID | str | None = None) -> User | None:
    query = db.query(User).filter(User.email == email)
    if tenant_id is not None:
        query = query.filter(User.tenant_id == tenant_id)
    return query.first()


def repo_get_users_by_email(db: Session, email: str, tenant_id: UUID | str | None = None) -> list[User]:
    query = db.query(User).filter(User.email == email)
    if tenant_id is not None:
        query = query.filter(User.tenant_id == tenant_id)
    return query.all()


def repo_email_exists(db: Session, email: str, tenant_id: UUID | str | None = None) -> bool:
    """Check if email already exists in database."""
    return repo_get_user_by_email(db, email, tenant_id=tenant_id) is not None

def repo_get_user_by_id(db: Session, user_id: int, tenant_id: UUID | str) -> User | None:
    return db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()

