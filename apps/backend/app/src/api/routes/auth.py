from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional, List
from functools import wraps

from app.src.core.security import verify_token, create_access_token
from app.src.db.database import get_session
from app.src.core.auth import get_current_user

from app.src.schemas.user import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserRead,
    UserResponse,
)
from app.src.services.user import UserService

router = APIRouter()
security = HTTPBearer()

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with email validation and password requirements",
)
def register(
    register_data: UserRegister,
    db: Session = Depends(get_session)
):
    """
    Register a new user.

    ### Requirements:
    - Age must be 18 or older
    - Password must be at least 8 characters
    - Password must contain at least one uppercase letter
    - Password must contain at least one digit
    - Email must be unique (not already registered)
    - Passwords must match

    ### Returns:
    - access_token: JWT token for authenticated requests
    - token_type: Token type (always "bearer")
    - user: User object with id, email, name, age, sex, role, and created_at
    """
    try:
        user_service = UserService(db)
        user, access_token = user_service.register_user(register_data)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserRead.from_orm(user)
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during registration: {str(e)}"
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
    description="Authenticate user with email and password, returns JWT token",
)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_session)
):
    """
    Authenticate user and generate JWT token.

    ### Parameters:
    - **email**: User email address
    - **password**: User password

    ### Returns:
    - access_token: JWT token for authenticated requests
    - token_type: Token type (always "bearer")
    - user: User object with details
    """
    try:
        user_service = UserService(db)
        user, access_token = user_service.login_user(login_data.email, login_data.password)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserRead.from_orm(user)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get the authenticated user's information",
)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Get the current authenticated user's information.

    Requires valid JWT token in Authorization header.
    """
    from app.src.repositories.user import get_user_by_email

    try:
        user = get_user_by_email(db, current_user.get("sub"))

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching user data"
        )
