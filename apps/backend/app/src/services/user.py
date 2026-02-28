from app.src.repositories.user import repo_create_user, repo_get_all_users, repo_get_user_by_email
from app.src.repositories.user import repo_email_exists, repo_get_user_by_id
from app.src.models.user import User
from app.src.core.security import verify_password, create_access_token
from app.src.schemas.user import UserCreate
from sqlalchemy.orm import Session


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user: User) -> User:
        if user.age < 18:
            raise ValueError("User must be at least 18 years old")
        return repo_create_user(self.db, user)

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
        # Check if email already exists
        if repo_email_exists(self.db, register_data.email):
            raise ValueError(f"Email {register_data.email} is already registered")

        # Create user using the UserCreate schema

        user_create = UserCreate(
            name=register_data.name,
            age=register_data.age,
            sex=register_data.sex,
            email=register_data.email,
            password=register_data.password,
            role=register_data.role
        )

        user = repo_create_user(self.db, user_create)

        # Create JWT token
        access_token = create_access_token(
            data={
                "sub": user.email, 
                "user_id": user.id,
                "user_role": user.role
            }
        )

        return user, access_token

    def login_user(self, email: str, password: str) -> tuple:
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
        user = repo_get_user_by_email(self.db, email)

        if not user:
            raise ValueError("Invalid email or password")

        if not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")

        # Create JWT token
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id}
        )

        return user, access_token
    
    def get_all_users(self) -> list[User]:
        return repo_get_all_users(self.db)
    
    def get_user_by_id(self, user_id: int) -> User:
        user = repo_get_user_by_id(self.db, user_id)
        if not user:
            raise ValueError("User not found")
        return user

  