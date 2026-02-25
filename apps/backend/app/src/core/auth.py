from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from app.src.core.security import verify_token, create_access_token
from app.src.schemas.user import UserResponse
from app.src.services.user import UserService

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:

    token = credentials.credentials
    payload = verify_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
  
async def get_user_by_role(
    required_roles: List[str],
    current_user: dict = Depends(get_current_user)
) -> dict:

    user_role = current_user.get("role")

    if user_role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User role '{user_role}' is not authorized for this action. Required roles: {required_roles}"
        )

    return current_user

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:

    if credentials is None:
        return None

    token = credentials.credentials
    payload = verify_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
  
def verify_user_id_ownership(user_id: int, current_user: dict) -> bool:

  current_user_id = current_user.get("user_id")

  if current_user_id != user_id:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="You do not have permission to access this resource"
    )

  return True

