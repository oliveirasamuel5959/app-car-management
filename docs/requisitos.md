# 📋 Functional and Non-Functional Requirements

This document defines the **functional (FR)** and **non-functional requirements (NFR)** of the SaaS Car Platform.  
It serves as a **living document** to guide development, prioritization, testing, and future evolution of the system.

---

## 1. Functional Requirements (FR)

Functional requirements describe **what the system must do** from a business and user perspective.

---

### FR-01 – Authentication

**Description:**  
The system must provide secure authentication for all users.

**Requirements:**
- User registration (signup)
- User login
- User logout
- Authentication based on **JWT**
- Support for **refresh tokens**
- Token revocation on logout

**Actors:**
- Client
- Workshop

---

### FR-02 – User Profiles

**Description:**  
The system must support different user roles with distinct permissions.

**Requirements:**
- User role `CLIENT`
- User role `WORKSHOP`
- Role-based access control (RBAC)
- Authorization enforced at API level

---

### FR-03 – Vehicle Management

**Description:**  
Clients must be able to manage their vehicles.

**Requirements:**
- Create vehicle
- Read vehicle list
- Update vehicle
- Delete vehicle
- Vehicles are owned by a single client
- Workshops cannot manage vehicles

**Actors:**
- Client

---

### FR-04 – Workshop Management

**Description:**  
Workshops must be able to manage their public profile and offerings.

**Requirements:**
- Create workshop profile
- Update workshop information
- Register services offered
- Define working hours / availability
- Workshop profile is linked 1–1 with a user

**Actors:**
- Workshop

---

### FR-05 – Workshop Search

**Description:**  
Clients must be able to discover workshops that match their needs.

**Requirements:**
- Search workshops by geographic location
- Sort by proximity
- Filter by services offered
- View summarized workshop information in search results

**Actors:**
- Client

---

### FR-06 – Scheduling

**Description:**  
Clients and workshops must manage service appointments.

**Requirements:**
- Client can create a service appointment request
- Workshop can accept or reject requests
- Appointment lifecycle statuses:
  - `PENDING`
  - `CONFIRMED`
  - `CANCELLED`
  - `DONE`
- Only confirmed appointments can be marked as done

**Actors:**
- Client
- Workshop

---

### FR-07 – Reviews and Ratings

**Description:**  
Clients must be able to evaluate workshops after service completion.

**Requirements:**
- Client can rate a workshop only after service is completed
- One review per completed service
- Rating scale (e.g. 1–5 stars)
- Optional text comment
- Workshop average rating is automatically updated

**Actors:**
- Client

---

### FR-08 – Messaging

**Description:**  
The system must allow communication between clients and workshops.

**Requirements:**
- Real-time messaging (WebSocket)
- Messages allowed only if there is an active service request or appointment
- Communication restricted to involved parties
- Basic message history support

**Actors:**
- Client
- Workshop

---

## 2. Non-Functional Requirements (NFR)

Non-functional requirements define **how the system operates**, focusing on quality attributes.

---

## 🔒 Security

**Requirements:**
- Passwords must be hashed using **bcrypt**
- JWT access tokens with short expiration time
- Refresh tokens stored securely
- Rate limiting on authentication endpoints
- Protection against IDOR (Insecure Direct Object Reference)
- Validation of user ownership on all protected resources

---

## ⚡ Performance

**Requirements:**
- Efficient geospatial queries using **PostGIS**
- Database indexing for frequently queried fields
- Pagination for list endpoints
- Search response times optimized for large datasets
- Caching layer planned (Redis) for search and read-heavy endpoints

---

## 📈 Scalability

**Requirements:**
- Stateless backend services
- Horizontal scaling supported
- Reverse proxy and load balancing via Nginx
- Independent containers for services
- No server-side session storage

---

## 🧪 Quality & Testing

**Requirements:**
- Minimum test coverage:
  - 80% for critical services
- Test types:
  - Unit tests (domain and services)
  - Integration tests (API + database)
- Automated tests executed in CI pipeline
- Linting and formatting enforced

---

## 📜 Observability

**Requirements:**
- Structured logging (JSON format)
- Correlation ID propagated across requests
- Centralized error handling
- Healthcheck endpoint:
  - `GET /health`
- Logs must support debugging and monitoring in production

---

## 3. Evolution Guidelines

- This document must be updated whenever:
  - New features are added
  - Business rules change
  - Architecture decisions impact requirements
- Each new feature should reference:
  - Related FRs
  - Impacted NFRs
- Requirements should be traceable to:
  - API endpoints
  - Tests
  - User stories

---

## 4. Status

**Document Status:** Active  
**Scope:** MVP and early-stage evolution  
**Last Update:** Initial version

---
