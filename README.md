# SaaS Car Platform

**SaaS Car Platform** is a software-as-a-service application that connects **vehicle owners (clients)** and **mechanical workshops**, enabling vehicle management, smart workshop discovery, service scheduling, and real-time communication.

The project is designed with a **modern, scalable architecture**, following **MVP-first principles** and using a **monorepo approach** with FastAPI, React, and PostgreSQL.

---

## 📌 Overview

### 🎯 Problem
Vehicle owners often struggle to find reliable, nearby workshops with available service slots. Workshops, on the other hand, need a simple and efficient way to manage services, schedules, and customer interactions.

### 💡 Solution
A platform that allows:
- Clients to register and manage their vehicles
- Discovery of nearby workshops using geolocation
- Workshop reputation through ratings and reviews
- Easy service scheduling
- Direct, real-time communication between clients and workshops

---

## 🧩 Core Features (MVP)

### 👤 Users
- Authentication with JWT
- Two user roles:
  - **CLIENT**
  - **WORKSHOP**

### 🚗 Client
- Vehicle registration and management
- Search workshops by location and services
- View workshop details and reputation
- Request and schedule services
- Rate workshops after completed services

### 🛠 Workshop
- Workshop profile management
- Service catalog management
- Availability and schedule management
- Receive and manage service requests

### 💬 Communication
- Real-time chat between client and workshop (after a service request)

---

## 🏗 Architecture

- Monorepo structure
- Stateless backend
- RESTful API
- WebSocket-based real-time communication
- Designed for horizontal scalability

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack React Query
- Zustand

### Backend
- Python 3.11+
- FastAPI (async)
- SQLAlchemy 2.0 (async)
- Alembic (database migrations)
- Pydantic
- Pytest / Unittest

### Database
- PostgreSQL
- PostGIS (planned for geospatial queries)

### DevOps
- Docker / Docker Compose
- Nginx (reverse proxy / load balancer)
- GitHub Actions (CI/CD)

### Deployment
- Frontend: Azure App Service for Containers with Nginx
- Backend: Azure App Service for Containers
- Database: Azure Database for PostgreSQL Flexible Server
- Registry: Azure Container Registry
- CI/CD: GitHub Actions with Azure OIDC

See [`AZURE_DEPLOYMENT.md`](AZURE_DEPLOYMENT.md) for the provisioning and
deployment runbook. Local development uses the root `docker-compose.yml`.

---

## 📁 Monorepo Structure

```bash
saas-car-platform/
│
├── apps/
│   ├── web/            # Frontend (React + TypeScript + Nginx)
│   └── backend/        # Backend (FastAPI)
│
├── packages/
│   ├── shared-types/   # Shared DTOs and types
│   ├── ui/             # Reusable UI components
│   └── config/         # Shared configuration
│
├── apps/backend/Dockerfile
├── apps/web/Dockerfile
├── apps/web/nginx.conf.template
├── docker-compose.yml
│
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
│
├── turbo.json
├── package.json
├── README.md
└── .env.example
