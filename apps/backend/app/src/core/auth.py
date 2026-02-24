from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from app.src.core.security import verify_token, create_access_token
from app.src.schemas.user import UserResponse

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to validate JWT token and extract user data from token.

    Args:
        credentials: HTTP Bearer token from request

    Returns:
        Decoded token payload containing user data

    Raises:
        HTTPException: If token is invalid or expired
    """
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
    """
    Dependency to validate user has one of the required roles.
    Used for role-based access control.

    Args:
        required_roles: List of allowed roles (e.g., ["ADMIN", "MANAGER"])
        current_user: Current authenticated user from token

    Returns:
        Current user data if authorized

    Raises:
        HTTPException: If user's role is not in required_roles
    """
    user_role = current_user.get("role")

    if user_role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User role '{user_role}' is not authorized for this action. Required roles: {required_roles}"
        )

    return current_user

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    """
    Optional dependency to validate JWT token if provided.

    Args:
        credentials: Optional HTTP Bearer token from request

    Returns:
        Decoded token payload if token provided, None otherwise

    Raises:
        HTTPException: If token is provided but invalid or expired
    """
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
  """
  Verify that the current user has access to modify their own data.

  Args:
      user_id: ID of resource being accessed
      current_user: Current authenticated user from token

  Returns:
      True if user owns the resource

  Raises:
      HTTPException: If user doesn't own the resource
  """
  current_user_id = current_user.get("user_id")

  if current_user_id != user_id:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="You do not have permission to access this resource"
    )

  return True

