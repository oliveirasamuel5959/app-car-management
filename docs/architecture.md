# 🏗 System Architecture

This document describes the **architecture, design principles, and technical decisions** of the SaaS Car Platform.  
It serves as a reference for developers and contributors to understand **how the system is structured and why**.

---

## 1. Architectural Overview

The SaaS Car Platform is a **marketplace-style SaaS application** connecting **clients (vehicle owners)** and **mechanical workshops**.

The architecture is designed with:
- Monorepo structure
- Modular backend
- Stateless services
- API-first approach
- MVP-driven evolution

---

## 2. High-Level Architecture


---

## 3. Monorepo Architecture

The project uses a **monorepo** to centralize frontend, backend, and shared packages.

### Benefits
- Single source of truth
- Shared contracts and types
- Simplified CI/CD
- Easier refactoring and coordination

### Structure


---

## 4. Backend Architecture (FastAPI)

### 4.1 Layered Architecture

The backend follows a **layered (clean) architecture**:


### Responsibilities
- **Routers**: HTTP layer, request/response validation, authentication
- **Services**: Business rules and workflows
- **Repositories**: Database access only
- **Models**: ORM entities (SQLAlchemy)
- **Schemas**: API contracts (Pydantic)

> Business logic must never live in routers.

---

### 4.2 Stateless Design

- No server-side sessions
- Authentication via JWT
- Horizontal scaling supported
- All state stored in database or external services

---

### 4.3 Authentication & Authorization

- JWT-based authentication
- Short-lived access tokens
- Refresh tokens
- Role-based access control (RBAC)
- Ownership checks to prevent IDOR

---

## 5. Frontend Architecture (React)

### Principles
- Feature-oriented folder structure
- Clear separation of concerns
- API-driven UI

### Structure


### State Management
- **React Query (TanStack)** for server state
- **Zustand** for client/global state

---

## 6. Data Architecture

### Database
- PostgreSQL as primary database
- UUID as primary keys
- Alembic for migrations

### Geolocation
- MVP: latitude / longitude
- Planned: PostGIS (`geography(Point)`)
- GIST indexes for spatial queries

---

## 7. Communication Patterns

### REST API
- CRUD operations
- Authentication
- Search
- Scheduling

### WebSockets
- Real-time messaging
- Authenticated connections only
- Used primarily for chat and live updates

---

## 8. Scalability Strategy

### Horizontal Scaling
- Stateless API containers
- Load balancing via Nginx
- Independent scaling of frontend and backend

### Future Enhancements
- Redis for caching and pub/sub
- Background jobs (Celery / RQ)
- Event-driven processing

---

## 9. DevOps & Deployment Architecture

### CI/CD
- GitHub Actions
- Automated tests
- Linting and build pipelines

### Containerization
- Docker for all services
- Docker Compose for local development
- Environment-based configuration

### Deployment Targets
- Frontend: Vercel
- Backend: Railway / Fly.io / AWS
- Database: Managed PostgreSQL (Neon, Supabase, RDS)

---

## 10. Observability

### Logging
- Structured logs (JSON)
- Correlation ID per request
- Centralized error handling

### Monitoring
- Healthcheck endpoint: `GET /health`
- Ready for integration with monitoring tools

---

## 11. Security Architecture

- bcrypt password hashing
- JWT validation and expiration
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- Secure defaults (deny by default)

---

## 12. Architectural Trade-offs

### Monolith First
- Faster MVP delivery
- Lower operational complexity
- Easier debugging and iteration

### Microservices (Deferred)
- Not justified at MVP stage
- Higher operational cost and complexity

The architecture is designed to **evolve into microservices if and when required**.

---

## 13. Evolution Strategy

- Start simple
- Measure usage and bottlenecks
- Introduce complexity only when justified
- Document major decisions via ADRs

---

## 14. Related Documents

- `README.md`
- `REQUIREMENTS.md`
- `SECURITY.md` (planned)
- `API_CONTRACT.md` (planned)
- `ADR/` (planned)

---

## 15. Document Status

**Status:** Active  
**Scope:** MVP and early growth phase  
**Ownership:** Engineering Team
