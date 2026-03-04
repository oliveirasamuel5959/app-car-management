from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.src.db.database import get_session
from app.src.schemas.workshop_client import WorkshopClientCreate, WorkshopClientRead, WorkshopClientUpdate
from app.src.services.workshop_client import WorkshopClientService
from app.src.core.auth import get_current_user

router = APIRouter()


@router.post(
    "/",
    response_model=WorkshopClientRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a client to your workshop",
)
def create_workshop_client(
    client_in: WorkshopClientCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = WorkshopClientService(db)
    try:
        user_id = current_user.get("user_id")
        return service.create_client(client_in, user_id=int(user_id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/",
    response_model=List[WorkshopClientRead],
    status_code=status.HTTP_200_OK,
    summary="List all clients of your workshop",
)
def get_workshop_clients(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = WorkshopClientService(db)
    try:
        user_id = current_user.get("user_id")
        return service.get_clients(user_id=int(user_id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/{client_id}",
    response_model=WorkshopClientRead,
    status_code=status.HTTP_200_OK,
    summary="Get a specific workshop client",
)
def get_workshop_client(
    client_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = WorkshopClientService(db)
    user_id = current_user.get("user_id")
    client = service.get_client_by_id(client_id, user_id=int(user_id))
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.put(
    "/{client_id}",
    response_model=WorkshopClientRead,
    status_code=status.HTTP_200_OK,
    summary="Update a workshop client",
)
def update_workshop_client(
    client_id: int,
    client_update: WorkshopClientUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = WorkshopClientService(db)
    try:
        user_id = current_user.get("user_id")
        result = service.update_client(client_id, client_update, user_id=int(user_id))
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workshop client",
)
def delete_workshop_client(
    client_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = WorkshopClientService(db)
    user_id = current_user.get("user_id")
    deleted = service.delete_client(client_id, user_id=int(user_id))
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
