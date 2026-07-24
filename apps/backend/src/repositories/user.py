from uuid import UUID

from sqlalchemy.orm import Session

from src.core.security import hash_password
from src.models.user import User
from src.schemas.user import UserCreate, UserUpdate


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


def repo_get_user_by_email(
    db: Session, email: str, tenant_id: UUID | str | None = None
) -> User | None:
    query = db.query(User).filter(User.email == email)
    if tenant_id is not None:
        query = query.filter(User.tenant_id == tenant_id)
    return query.first()


def repo_get_users_by_email(
    db: Session, email: str, tenant_id: UUID | str | None = None
) -> list[User]:
    query = db.query(User).filter(User.email == email)
    if tenant_id is not None:
        query = query.filter(User.tenant_id == tenant_id)
    return query.all()


def repo_email_exists(
    db: Session, email: str, tenant_id: UUID | str | None = None
) -> bool:
    """Check if email already exists in database."""
    return repo_get_user_by_email(db, email, tenant_id=tenant_id) is not None


def repo_get_user_by_id(
    db: Session, user_id: int, tenant_id: UUID | str
) -> User | None:
    return (
        db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    )


def repo_update_user(
    db: Session, user_id: int, tenant_id: UUID | str, updates: UserUpdate
) -> User | None:
    """Apply a partial profile update to a tenant-scoped user."""
    user = repo_get_user_by_id(db, user_id, tenant_id)
    if not user:
        return None

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def repo_find_user_by_tenant_and_role(
    db: Session, tenant_id: UUID | str, role: str
) -> User | None:
    """Find the first user matching a tenant and role (e.g. the workshop owner or client)."""
    return (
        db.query(User)
        .filter(User.tenant_id == tenant_id, User.role == role)
        .first()
    )
