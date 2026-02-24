"""
Authentication middleware for protecting routes and adding user context to requests.
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from typing import Callable, List
import logging

from app.src.core.security import verify_token

logger = logging.getLogger(__name__)


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
        """
        Process incoming requests to validate authentication.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware/route handler

        Returns:
            Response from next handler or error response
        """
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
