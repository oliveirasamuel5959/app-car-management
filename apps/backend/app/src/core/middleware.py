"""
Authentication middleware for protecting routes and adding user context to requests.
Provides both global middleware and decorator-based protection for individual routes.
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from typing import Callable, List
from functools import wraps
import logging

from app.src.core.security import verify_token

logger = logging.getLogger(__name__)


# ============================================================================
# DECORATOR-BASED AUTH MIDDLEWARE
# ============================================================================

def auth_middleware(func: Callable) -> Callable:
    """
    Decorator to protect individual route handlers with JWT authentication.

    Usage:
        @router.get("/protected")
        @auth_middleware
        def protected_route(request: Request):
            user_data = request.state.user
            return {"user": user_data}

    Args:
        func: Route handler function to protect

    Returns:
        Wrapped function that validates JWT token before execution
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract request from kwargs or args
        request = None
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break

        if request is None and "request" in kwargs:
            request = kwargs["request"]

        if request is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Request object not found"
            )

        # Extract and validate token
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authorization token"
            )

        try:
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                raise ValueError("Invalid authentication scheme")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format. Use: Bearer <token>"
            )

        # Verify token
        payload = verify_token(token)

        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        # Attach user data to request state
        request.state.user = payload
        request.state.user_id = payload.get("user_id")
        request.state.email = payload.get("sub")

        # Call the actual route handler
        return await func(*args, **kwargs) if hasattr(func, '__call__') else func(*args, **kwargs)

    return wrapper


def role_protected(allowed_roles: List[str]) -> Callable:
    """
    Decorator to protect routes based on user role.
    Must be used with @auth_middleware.

    Usage:
        @router.delete("/admin")
        @auth_middleware
        @role_protected(["ADMIN", "MANAGER"])
        def admin_route(request: Request):
            return {"message": "Admin action"}

    Args:
        allowed_roles: List of roles allowed to access this route

    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if request is None and "request" in kwargs:
                request = kwargs["request"]

            # Check if user is authenticated (auth_middleware should have run first)
            if not hasattr(request.state, "user"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            # Check role
            user_role = request.state.user.get("role")
            if user_role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{user_role}' is not authorized. Required roles: {', '.join(allowed_roles)}"
                )

            return await func(*args, **kwargs) if hasattr(func, '__call__') else func(*args, **kwargs)

        return wrapper
    return decorator


def owner_protected(func: Callable) -> Callable:
    """
    Decorator to verify user owns the requested resource.
    Must be used with @auth_middleware.
    Expects 'user_id' or 'id' as a path parameter.

    Usage:
        @router.get("/users/{user_id}/profile")
        @auth_middleware
        @owner_protected
        def get_user_profile(user_id: int, request: Request):
            return {"data": "user profile"}

    Args:
        func: Route handler function

    Returns:
        Wrapped function that verifies ownership
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract request
        request = None
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break

        if request is None and "request" in kwargs:
            request = kwargs["request"]

        # Check if user is authenticated
        if not hasattr(request.state, "user"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )

        # Get resource user_id from path parameters
        resource_user_id = kwargs.get("user_id")
        if resource_user_id is None:
            resource_user_id = kwargs.get("id")

        if resource_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Resource user_id not found in path"
            )

        # Verify ownership
        current_user_id = request.state.user_id
        if current_user_id != int(resource_user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )

        return await func(*args, **kwargs) if hasattr(func, '__call__') else func(*args, **kwargs)

    return wrapper


# ============================================================================
# GLOBAL MIDDLEWARE CLASSES
# ============================================================================

class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate JWT tokens and attach user context to requests.
    This middleware:
    - Extracts JWT tokens from Authorization headers
    - Validates token signatures and expiration
    - Attaches decoded user data to the request state
    - Handles auth errors gracefully
    """

    # Routes that don't require authentication
    PUBLIC_ROUTES = {
        "/auth/register",
        "/auth/login",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/",
    }

    def __init__(self, app, public_routes: List[str] = None):
        super().__init__(app)
        if public_routes:
            self.PUBLIC_ROUTES.update(public_routes)

    async def dispatch(self, request: Request, call_next: Callable) -> JSONResponse:
        
        if request.method == "OPTIONS":
            return await call_next(request)
    
        # Check if route requires authentication
        if self._is_public_route(request.url.path):
            return await call_next(request)

        # Extract and validate token
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            logger.warning(f"Missing authorization header for {request.method} {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Missing authorization token"}
            )

        # Extract token from "Bearer <token>" format
        try:
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                raise ValueError("Invalid authentication scheme")
        except ValueError:
            logger.warning(f"Invalid authorization header format for {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid authorization header format"}
            )

        # Verify token
        payload = verify_token(token)

        if payload is None:
            logger.warning(f"Invalid or expired token for {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid or expired token"}
            )

        # Attach user data to request state
        request.state.user = payload
        request.state.user_id = payload.get("user_id")
        request.state.email = payload.get("sub")

        return await call_next(request)

    @staticmethod
    def _is_public_route(path: str) -> bool:
        """
        Check if the route is publicly accessible (no auth required).

        Args:
            path: Request path

        Returns:
            True if route is public, False if auth is required
        """
        # Check exact matches
        if path in AuthMiddleware.PUBLIC_ROUTES:
            return True

        # Check prefix matches
        public_prefixes = ["/docs", "/redoc", "/openapi"]
        return any(path.startswith(prefix) for prefix in public_prefixes)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track request counts and enforce rate limiting per user.
    Helps prevent abuse and brute force attacks.
    """

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts = {}  # {user_id: [timestamps]}

    async def dispatch(self, request: Request, call_next: Callable) -> JSONResponse:
        """
        Track requests and enforce rate limiting.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware/route handler

        Returns:
            Response or rate limit error
        """
        # Get user identifier (user_id or IP address)
        user_id = getattr(request.state, "user_id", request.client.host)

        # Check rate limit
        import time
        current_time = time.time()
        minute_ago = current_time - 60

        if user_id not in self.request_counts:
            self.request_counts[user_id] = []

        # Clean old requests
        self.request_counts[user_id] = [
            ts for ts in self.request_counts[user_id] if ts > minute_ago
        ]

        # Check if limit exceeded
        if len(self.request_counts[user_id]) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for user {user_id}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again later."}
            )

        # Add current request
        self.request_counts[user_id].append(current_time)

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    Enhances security against common web vulnerabilities.
    """

    async def dispatch(self, request: Request, call_next: Callable):
        """
        Add security headers to responses.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware/route handler

        Returns:
            Response with security headers
        """
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"

        return response
