# Backend API Rules

- Every new endpoint must include request and response schemas
- Use dependency injection for database sessions
- Return paginated results for collection endpoints
- Log external API failures with the shared logger
- Prefer service-layer functions over logic inside route files