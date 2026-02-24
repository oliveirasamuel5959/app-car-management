# Decorator-Based Auth Middleware Usage Guide

This guide shows how to use the decorator-style authentication middleware in your route handlers.

## Available Decorators

### 1. @auth_middleware - Basic Authentication
Protects a route by requiring a valid JWT token.

**Usage:**
```python
from fastapi import APIRouter, Request
from app.src.core.middleware import auth_middleware

router = APIRouter()

@router.get("/protected")
@auth_middleware
def protected_route(request: Request):
    """Route that requires JWT authentication"""
    user = request.state.user
    user_id = request.state.user_id
    email = request.state.email

    return {
        "message": f"Hello {email}",
        "user_data": user,
        "user_id": user_id
    }
```

**Access the user context from request.state:**
- `request.state.user` - Full decoded JWT payload
- `request.state.user_id` - User ID from token
- `request.state.email` - User email from token

**Error Responses:**
- 401 Unauthorized - Missing or invalid token
- 401 Unauthorized - Invalid header format

---

### 2. @role_protected - Role-Based Access Control
Restricts route access to specific user roles.

**Usage:**
```python
from fastapi import APIRouter, Request
from app.src.core.middleware import auth_middleware, role_protected

router = APIRouter()

@router.delete("/admin/users/{user_id}")
@auth_middleware
@role_protected(["ADMIN"])
def delete_user(user_id: int, request: Request):
    """Only ADMIN users can access this route"""
    return {"message": f"User {user_id} deleted by {request.state.email}"}


@router.post("/workshop/services")
@auth_middleware
@role_protected(["WORKSHOP", "ADMIN"])
def create_service(request: Request):
    """WORKSHOP and ADMIN users can access"""
    return {"message": "Service created"}
```

**Requirements:**
- Must be used together with `@auth_middleware`
- Place `@role_protected` BELOW `@auth_middleware` in the decorator stack

**Error Responses:**
- 401 Unauthorized - Authentication required (missing @auth_middleware)
- 403 Forbidden - User role not in allowed list

---

### 3. @owner_protected - Ownership Verification
Verifies the authenticated user owns the requested resource.

**Usage:**
```python
from fastapi import APIRouter, Request
from app.src.core.middleware import auth_middleware, owner_protected

router = APIRouter()

@router.get("/users/{user_id}/profile")
@auth_middleware
@owner_protected
def get_user_profile(user_id: int, request: Request):
    """User can only access their own profile"""
    return {"profile": f"User {user_id} profile"}


@router.put("/vehicles/{vehicle_id}")
@auth_middleware
@owner_protected
def update_vehicle(vehicle_id: int, request: Request):
    """User can only update their own vehicle"""
    return {"message": f"Vehicle {vehicle_id} updated"}
```

**Requirements:**
- Must be used together with `@auth_middleware`
- Route must have `user_id` or `id` path parameter
- Place `@owner_protected` BELOW `@auth_middleware`

**Error Responses:**
- 401 Unauthorized - Authentication required
- 403 Forbidden - User doesn't own resource

---

## Complete Examples

### Example 1: Protected Vehicle Creation
```python
from fastapi import APIRouter, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.src.core.middleware import auth_middleware
from app.src.db.database import get_session
from app.src.schemas.vehicle import VehicleCreate

router = APIRouter()

@router.post("/vehicles")
@auth_middleware
def create_vehicle(
    vehicle_data: VehicleCreate,
    request: Request,
    db: Session = Depends(get_session)
):
    """Create vehicle for authenticated user"""
    user_id = request.state.user_id
    email = request.state.email

    # Create vehicle using authenticated user's ID
    vehicle = Vehicle(
        brand=vehicle_data.brand,
        model=vehicle_data.model,
        year=vehicle_data.year,
        plate=vehicle_data.plate,
        user_id=user_id  # Always use current user's ID
    )

    db.add(vehicle)
    db.commit()

    return {"message": f"Vehicle created for {email}"}
```

### Example 2: Admin-Only Operations
```python
@router.get("/admin/analytics")
@auth_middleware
@role_protected(["ADMIN"])
def get_analytics(request: Request):
    """Only admins can view analytics"""
    return {
        "admin": request.state.email,
        "analytics": "..."
    }
```

### Example 3: Personal Data Access
```python
@router.get("/users/{user_id}/vehicles")
@auth_middleware
@owner_protected
def get_user_vehicles(user_id: int, request: Request):
    """User can only view their own vehicles"""
    return {
        "user_id": user_id,
        "vehicles": []
    }
```

---

## Decorator Stack Order

When combining multiple decorators, place them in this order (top to bottom):

```python
@router.method("/path")           # FastAPI route decorator (FIRST)
@auth_middleware                   # Authentication (SECOND)
@role_protected([...])             # Role check (THIRD)
@owner_protected                   # Ownership check (FOURTH)
def handler(request: Request):     # Handler function (LAST)
    pass
```

**Important:** Fastapi route decorator must be first, auth decorator must be before role/owner decorators.

---

## Decorator vs Dependency Injection

### Using Decorators (@auth_middleware)
```python
@router.get("/protected")
@auth_middleware
def route(request: Request):
    user = request.state.user
    return {"user": user}
```

### Using Dependencies (Depends)
```python
from app.src.api.routes.auth import get_current_user

@router.get("/protected")
def route(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}
```

**Choose based on your preference:**
- **Decorators:** Better for simple cases, cleaner syntax
- **Dependencies:** Better for complex type hints, easier testing

Both are supported and can be mixed in your codebase.

---

## Error Handling

### Missing Authentication
```python
@router.get("/protected")
@auth_middleware
def route(request: Request):
    pass

# Request without token:
# GET /protected
# Response: 401 Unauthorized
# {"detail": "Missing authorization token"}
```

### Invalid Token Format
```python
# Request with invalid format:
# GET /protected
# Authorization: InvalidToken123
# Response: 401 Unauthorized
# {"detail": "Invalid authorization header format. Use: Bearer <token>"}
```

### Expired Token
```python
# Request with expired token:
# GET /protected
# Authorization: Bearer eyJhbGc... (expired)
# Response: 401 Unauthorized
# {"detail": "Invalid or expired token"}
```

### Insufficient Permissions
```python
@router.delete("/admin")
@auth_middleware
@role_protected(["ADMIN"])
def admin_action(request: Request):
    pass

# Request as CLIENT user:
# DELETE /admin
# Authorization: Bearer eyJhbGc...
# Response: 403 Forbidden
# {"detail": "Role 'CLIENT' is not authorized. Required roles: ADMIN"}
```

### Resource Not Owned
```python
@router.get("/users/{user_id}/profile")
@auth_middleware
@owner_protected
def get_profile(user_id: int, request: Request):
    pass

# User 5 requesting user 10's profile:
# GET /users/10/profile
# Authorization: Bearer eyJhbGc... (user_id: 5)
# Response: 403 Forbidden
# {"detail": "You do not have permission to access this resource"}
```

---

## Testing with curl

### Get Authentication Token
```bash
# Register
curl -X POST http://localhost:5500/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "age": 25,
    "email": "john@example.com",
    "password": "SecurePass123",
    "password_confirm": "SecurePass123",
    "sex": "Male",
    "role": "CLIENT"
  }'

# Extract access_token from response
```

### Call Protected Route
```bash
# With token
curl http://localhost:5500/protected \
  -H "Authorization: Bearer YOUR_TOKEN"

# Without token (will fail)
curl http://localhost:5500/protected
```

---

## Migration from Dependencies to Decorators

If you're currently using `Depends(get_current_user)`, you can switch to decorators:

**Before:**
```python
from app.src.api.routes.auth import get_current_user

@router.get("/vehicles")
def get_vehicles(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id")
    return {"vehicles": []}
```

**After:**
```python
from app.src.core.middleware import auth_middleware

@router.get("/vehicles")
@auth_middleware
def get_vehicles(request: Request):
    user_id = request.state.user_id
    return {"vehicles": []}
```

Both approaches are valid - choose based on your preference!
