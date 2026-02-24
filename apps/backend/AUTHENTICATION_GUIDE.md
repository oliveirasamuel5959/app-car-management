"""
Authentication and Route Protection Usage Guide

This guide demonstrates how to use the authentication middleware and
protection dependencies in your FastAPI routes.
"""

# ============================================================================
# 1. BASIC PROTECTED ROUTE (Required JWT Token)
# ============================================================================
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.src.api.routes.auth import get_current_user
from app.src.db.database import get_session

router = APIRouter()

@router.get("/protected-example")
async def protected_route(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Route that requires valid JWT token.
    Automatically rejects requests without Bearer token or with invalid token.
    """
    return {
        "message": f"Hello {current_user.get('sub')}",
        "user_id": current_user.get("user_id")
    }


# ============================================================================
# 2. OPTIONAL AUTHENTICATION (Token not required)
# ============================================================================
from app.src.api.routes.auth import get_optional_user
from typing import Optional

@router.get("/public-with-auth")
async def public_with_optional_auth(
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Route that works with or without authentication.
    current_user will be None if no token provided, or user data if token is valid.
    """
    if current_user:
        return {"message": f"Welcome back {current_user.get('sub')}"}
    return {"message": "Welcome guest"}


# ============================================================================
# 3. ROLE-BASED ACCESS CONTROL (Only specific roles)
# ============================================================================
from app.src.api.routes.auth import get_user_by_role
from functools import partial

@router.delete("/admin-only")
async def admin_only_route(
    current_user: dict = Depends(lambda: get_user_by_role(["ADMIN"]))
):
    """
    Route restricted to ADMIN role only.
    Returns 403 Forbidden if user doesn't have ADMIN role.
    """
    return {"message": "Admin action performed"}


@router.post("/workshop-operations")
async def workshop_operations(
    current_user: dict = Depends(lambda: get_user_by_role(["WORKSHOP", "ADMIN"]))
):
    """
    Route accessible to WORKSHOP and ADMIN roles.
    Multiple roles can be specified.
    """
    return {
        "message": f"{current_user} performed operation",
        "role": current_user.get("role")
    }


# ============================================================================
# 4. USER OWNERSHIP VERIFICATION
# ============================================================================
from app.src.api.routes.auth import verify_user_id_ownership

@router.put("/users/{user_id}/profile")
async def update_user_profile(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Route that verifies the requesting user can only update their own profile.
    Raises 403 Forbidden if trying to update another user's data.
    """
    verify_user_id_ownership(user_id, current_user)

    # Safe to proceed - user owns this resource
    return {"message": f"Profile for user {user_id} updated"}


# ============================================================================
# 5. ACCESSING USER CONTEXT FROM MIDDLEWARE
# ============================================================================
from fastapi import Request

@router.get("/my-info")
async def get_my_info(request: Request):
    """
    Access user data attached by AuthMiddleware.
    request.state.user contains the decoded JWT payload.
    request.state.user_id contains the user's ID.
    request.state.email contains the user's email.
    """
    user = request.state.user
    return {
        "user_id": request.state.user_id,
        "email": request.state.email,
        "full_payload": user
    }


# ============================================================================
# 6. PUBLIC ROUTES (No Authentication Required)
# ============================================================================
"""
The following routes are automatically public (defined in AuthMiddleware):
- /auth/register
- /auth/login
- /docs (API documentation)
- /redoc
- /openapi.json
- /

These routes bypass authentication checks automatically.
"""

@router.post("/public-endpoint")
async def public_endpoint(data: dict):
    """
    Only routes in PUBLIC_ROUTES bypass auth.
    This endpoint would require auth UNLESS added to public_routes.
    """
    return {"data": data}


# ============================================================================
# 7. ERROR HANDLING AND RESPONSES
# ============================================================================
"""
The middleware and dependencies automatically handle these error cases:

1. Missing Authorization Header:
   - Status: 401 Unauthorized
   - Response: {"detail": "Missing authorization token"}

2. Invalid Authorization Format:
   - Status: 401 Unauthorized
   - Response: {"detail": "Invalid authorization header format"}

3. Invalid/Expired Token:
   - Status: 401 Unauthorized
   - Response: {"detail": "Invalid or expired token"}

4. Insufficient Permissions (Role):
   - Status: 403 Forbidden
   - Response: {"detail": "User role 'CLIENT' is not authorized..."}

5. Resource Ownership Violation:
   - Status: 403 Forbidden
   - Response: {"detail": "You do not have permission to access this resource"}

6. Rate Limit Exceeded:
   - Status: 429 Too Many Requests
   - Response: {"detail": "Too many requests. Please try again later."}
"""


# ============================================================================
# 8. MIDDLEWARE FEATURES
# ============================================================================
"""
THREE MIDDLEWARE LAYERS PROTECT YOUR APPLICATION:

A. AuthMiddleware
   - Validates JWT tokens on all protected routes
   - Attaches user context to request state
   - Skips public routes defined in PUBLIC_ROUTES

B. RateLimitMiddleware
   - Tracks requests per user (60 per minute by default)
   - Prevents spam and brute force attacks
   - Per-user rate limiting (identified by user_id or IP)

C. SecurityHeadersMiddleware
   - Adds security headers to all responses:
     * X-Content-Type-Options: nosniff
     * X-Frame-Options: DENY
     * X-XSS-Protection: 1; mode=block
     * Strict-Transport-Security
     * Content-Security-Policy
   - Protects against common web vulnerabilities
"""


# ============================================================================
# 9. COMPLETE PROTECTED ENDPOINT EXAMPLE
# ============================================================================

@router.get("/users/{user_id}/details")
async def get_user_details(
    user_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Complete example combining multiple protection layers:
    1. Requires valid JWT token (via get_current_user dependency)
    2. Verifies user owns the requested resource
    3. Accesses middleware-attached user context
    4. Rate limited by middleware
    5. Secured by security headers middleware
    """
    # Verify ownership
    verify_user_id_ownership(user_id, current_user)

    # Access user info from middleware
    requesting_user_id = request.state.user_id

    # Proceed with database query
    # user = db.query(User).filter(User.id == user_id).first()

    return {
        "requested_user_id": user_id,
        "requesting_user_id": requesting_user_id,
        "authenticated": True
    }


# ============================================================================
# 10. TESTING PROTECTED ENDPOINTS
# ============================================================================
"""
Using curl or Postman:

1. Get a token from registration/login:
   POST /auth/register
   {
     "name": "John Doe",
     "age": 25,
     "email": "john@example.com",
     "password": "SecurePass123",
     "password_confirm": "SecurePass123",
     "sex": "Male",
     "role": "CLIENT"
   }

   Response includes: "access_token": "eyJhbGc..."

2. Use token in protected endpoints:
   GET /protected-example
   Authorization: Bearer eyJhbGc...

3. Without token (will be rejected):
   GET /protected-example
   → 401 Unauthorized
"""
