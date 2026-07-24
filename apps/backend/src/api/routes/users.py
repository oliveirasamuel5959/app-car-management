from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.core.file_uploader import handle_file_upload
from src.db.database import get_session
from src.schemas.user import UserCreate, UserRead, UserResponse, UserUpdate
from src.services.user import UserService

router = APIRouter()


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(user_create: UserCreate, db: Session = Depends(get_session)):
    user_service = UserService(db)
    return user_service.create_user(user_create)


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Return the authenticated user's profile."""
    service = UserService(db)
    try:
        return service.get_user_by_id(
            int(current_user.get("user_id")), current_user.get("tenant_id")
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def update_my_profile(
    updates: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Update the authenticated user's own profile fields."""
    service = UserService(db)
    try:
        return service.update_user(
            int(current_user.get("user_id")),
            current_user.get("tenant_id"),
            updates,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/me/avatar", response_model=UserResponse, status_code=status.HTTP_200_OK
)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Upload a profile photo and store its URL on the user."""
    file_info = await handle_file_upload(file, int(current_user.get("user_id")))
    service = UserService(db)
    try:
        return service.update_user(
            int(current_user.get("user_id")),
            current_user.get("tenant_id"),
            UserUpdate(avatar_url=file_info["file_url"]),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/", response_model=list[UserRead])
def get_all_users(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Retrieve all users from database
    """
    try:
        service = UserService(db)
        return service.get_all_users(current_user.get("tenant_id"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
