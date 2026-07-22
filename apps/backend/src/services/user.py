from sqlalchemy.orm import Session

from src.core.security import create_access_token, verify_password
from src.core.tenant import slugify_tenant_name
from src.models.user import User
from src.repositories.tenant import repo_get_or_create_tenant, repo_get_tenant_by_slug
from src.repositories.user import (
    repo_create_user,
    repo_email_exists,
    repo_get_all_users,
    repo_get_user_by_email,
    repo_get_user_by_id,
    repo_get_users_by_email,
    repo_update_user,
)
from src.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user: User) -> User:
        if user.age < 18:
            raise ValueError("User must be at least 18 years old")
        tenant_name = getattr(user, "tenant_name", None) or user.name
        tenant_slug = getattr(user, "tenant_slug", None) or slugify_tenant_name(
            tenant_name
        )
        tenant = repo_get_or_create_tenant(self.db, slug=tenant_slug, name=tenant_name)
        return repo_create_user(self.db, user, tenant.id)

    def register_user(self, register_data) -> tuple:
        """
        Register a new user with email validation and return JWT token.

        Args:
            register_data: UserRegister schema with registration data

        Returns:
            Tuple of (user, access_token)

        Raises:
            ValueError: If email already exists or validation fails
        """
        tenant_name = register_data.tenant_name or register_data.name
        tenant_slug = register_data.tenant_slug or slugify_tenant_name(tenant_name)
        tenant = repo_get_or_create_tenant(self.db, slug=tenant_slug, name=tenant_name)

        if repo_email_exists(self.db, register_data.email, tenant_id=tenant.id):
            raise ValueError(f"Email {register_data.email} is already registered")

        # Create user using the UserCreate schema

        user_create = UserCreate(
            name=register_data.name,
            age=register_data.age,
            sex=register_data.sex,
            email=register_data.email,
            password=register_data.password,
            role=register_data.role,
            tenant_name=tenant.name,
            tenant_slug=tenant.slug,
        )

        user = repo_create_user(self.db, user_create, tenant.id)

        # Create JWT token
        access_token = create_access_token(
            data={
                "sub": user.email,
                "user_id": user.id,
                "role": user.role,
                "tenant_id": str(user.tenant_id),
                "tenant_slug": tenant.slug,
            }
        )

        return user, access_token

    def login_user(
        self, email: str, password: str, tenant_slug: str | None = None
    ) -> tuple:
        """
        Authenticate user and generate JWT token.

        Args:
            email: User email
            password: User plain text password

        Returns:
            Tuple of (user, access_token)

        Raises:
            ValueError: If credentials are invalid
        """
        tenant = repo_get_tenant_by_slug(self.db, tenant_slug) if tenant_slug else None

        if tenant_slug and not tenant:
            raise ValueError("Tenant not found")

        if tenant:
            user = repo_get_user_by_email(self.db, email, tenant_id=tenant.id)
            if not user or not verify_password(password, user.password_hash):
                raise ValueError("Invalid email or password")
        else:
            matching_users = [
                candidate
                for candidate in repo_get_users_by_email(self.db, email)
                if verify_password(password, candidate.password_hash)
            ]

            if not matching_users:
                raise ValueError("Invalid email or password")

            if len(matching_users) > 1:
                raise ValueError(
                    "Multiple accounts match these credentials. Provide tenant_slug to select the correct tenant."
                )

            user = matching_users[0]
            tenant = user.tenant

        # Create JWT token
        access_token = create_access_token(
            data={
                "sub": user.email,
                "user_id": user.id,
                "role": user.role,
                "tenant_id": str(user.tenant_id),
                "tenant_slug": tenant.slug if tenant else None,
            }
        )

        return user, access_token

    def get_all_users(self, tenant_id) -> list[User]:
        return repo_get_all_users(self.db, tenant_id)

    def get_user_by_id(self, user_id: int, tenant_id) -> User:
        user = repo_get_user_by_id(self.db, user_id, tenant_id)
        if not user:
            raise ValueError("User not found")
        return user

    def update_user(self, user_id: int, tenant_id, updates: UserUpdate) -> User:
        user = repo_update_user(self.db, user_id, tenant_id, updates)
        if not user:
            raise ValueError("User not found")
        return user
