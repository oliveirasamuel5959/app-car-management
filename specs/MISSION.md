# 🎯 Mission & Vision

This document defines the **product mission, vision, scope, and strategic objectives** for SaaS Oficina.

---

## 1. Mission Statement

**Build a unified SaaS platform that empowers automotive workshops to operate efficiently while connecting them with vehicle owners seeking trusted service providers.**

---

## 2. Product Vision (18-Month Horizon)

A multi-tenant marketplace SaaS where:
- **Workshops** manage operations through a modern, intuitive ERP platform
- **Clients** discover nearby workshops, communicate in real-time, and track service status
- **Parts suppliers** eventually participate as a third tenant type (future phase)
- The platform is self-sustaining through 10% commission on processed payments
- Users across tenant types operate in complete data isolation with no visibility to other tenants

---

## 3. Core Objectives

### Business
- **Achieve product-market fit** with 100+ active workshops by end of Year 1
- **Grow to 500+ workshops** generating consistent transaction volume by Year 2
- **Establish marketplace network effects** where clients discover workshops, leave reviews, and return
- **Build switching costs** through embedded workflows (scheduling, invoicing, chat history)

### Technical
- **Multi-tenant architecture** supporting hundreds of independent workshops with complete data isolation
- **Real-time communication** powering trust and speed in service discovery and booking
- **Scalable payment processing** enabling marketplace commission model
- **Analytics & operational insights** for workshops to grow their business

### User Experience
- **Frictionless onboarding** — workshops and clients get value in minutes
- **Transparent pricing** — clear commission structure, no hidden fees
- **Trust & accountability** — reviews, ratings, and service history
- **Mobile-first** — users access the platform from anywhere

---

## 4. Scope (MVP Phase - Months 1-3)

### In Scope
✅ Multi-tenant data isolation (shared everything model)  
✅ Workshop profile creation and service catalog  
✅ Client search (geolocation-based)  
✅ Real-time 1:1 chat (WebSocket)  
✅ Service order lifecycle (PENDING → CONFIRMED → DONE)  
✅ Basic reviews and ratings  
✅ Payment processing (via Stripe, split payment)  
✅ Responsive web UI (mobile-friendly)

### Out of Scope
❌ Mobile native apps (web first)  
❌ Parts supplier integration  
❌ Advanced invoicing and accounting  
❌ Marketing automation  
❌ Webhook integrations  
❌ Custom workflows per tenant  
❌ Multi-currency support  
❌ Advanced analytics and reporting

---

## 5. Multi-Tenancy Strategy

### Tenant Model
- **Primary tenant type:** Workshops (unique per tenant)
- **Secondary users:** Clients and staff accounts belonging to a workshop tenant
- **Tenant isolation:** Complete data isolation at row level
- **Shared infrastructure:** Single database, single application, path-based routing

### Tenant Lifecycle
1. **Signup:** Workshop creates account, assigned tenant slug (e.g., `oficina-silva`)
2. **Onboarding:** Workshop defines services, working hours, location
3. **Active:** Clients discover workshop, create service requests, communicate
4. **Growth:** Clients leave reviews, return for repeat service, refer others
5. **Scaling:** If volume exceeds threshold, tenant can upgrade to separate database (future)

### Data Isolation Guarantees
- No cross-tenant queries allowed
- Every query filtered by `tenant_id` at database layer
- Tenant context validated on every request
- Admins cannot override tenant boundaries
- Audit logging of all cross-boundary access attempts

---

## 6. Key Metrics (Success Criteria)

### MVP Validation
- **Workshop signup:** 50+ workshops in first month
- **Monthly active workshops:** 75% retention week-over-week
- **Chat engagement:** 70% of new service requests trigger chat
- **Review coverage:** 60% of completed services have reviews
- **Payment success rate:** 95%+ of initiated payments complete
- **Uptime:** 99.9% platform availability
- **Response time:** <200ms p95 latency for API endpoints

### Post-MVP Growth
- **Cross-tenant security:** Zero tenant data leaks or access violations
- **Marketplace quality:** 4.5+ average workshop rating
- **Commission revenue:** $10K+ monthly revenue from transaction fees
- **Expansion:** Support 500+ tenants without architectural changes

---

## 7. Strategic Assumptions

1. **Workshops have smartphone-connected staff** — Real-time communication is valuable
2. **Clients prefer searching online before calling** — Geolocation search is key differentiator
3. **Service reputation drives repeat business** — Reviews and ratings are trust builders
4. **Marketplace network effects emerge naturally** — Enough workshops attract clients, more clients attract workshops
5. **10% commission is sustainable and acceptable** — Market research validates this pricing model

---

## 8. Phases (Roadmap)

### Phase 1: MVP (Months 1-3)
- ✅ Core marketplace functionality
- ✅ Multi-tenant infrastructure
- ✅ Payment processing
- ✅ Real-time chat
- **Target:** 50 active workshops, validate product-market fit

### Phase 2: Growth (Months 4-9)
- 🟡 Advanced search (filters, saved searches)
- 🟡 Workshop analytics dashboard
- 🟡 Appointment scheduling/calendar
- 🟡 SMS notifications
- **Target:** 300+ workshops, monthly recurring revenue

### Phase 3: Expansion (Months 10-18)
- 🟡 Parts supplier integration (as tertiary tenant type)
- 🟡 Mobile app (iOS/Android)
- 🟡 Advanced invoicing and accounting
- 🟡 Webhook integrations for third parties
- **Target:** 1000+ workshops, enterprise features

---

## 10. Implementation Status (Pre-Alpha)

See `ROADMAP.md` for detailed implementation roadmap and timeline.

### Current Phase
**Phase 0: Foundation (In Progress)** — Core architecture in place, multi-tenancy and payment processing pending.

### What's Built ✅
- User authentication (JWT)
- Core models (User, Vehicle, Workshop, Service, ServiceOrder, Message, Notification)
- API routes for CRUD operations
- WebSocket chat infrastructure
- React UI for client and workshop flows
- Auth and theme context management

### Critical Gaps ❌
- Multi-tenancy isolation NOT ENFORCED (security risk)
- Payment processing not implemented
- Database migrations not written
- Tests not written

### MVP Timeline
**Target:** Ready for staging in 6 weeks (mid-July 2026)
- Week 1-1.5: Multi-tenancy
- Week 1.5-2.5: Payment processing
- Week 2.5-3.5: Service order lifecycle
- Week 3.5-4: Reviews & ratings
- Week 4-4.5: Search filtering
- Week 4.5-5: Real-time WebSocket
- Week 5-5.5: Testing & Polish
- Week 5.5-6: Deployment & Docs

---

## 11. Document Status

**Status:** Active  
**Scope:** MVP and early-stage evolution  
**Ownership:** Product & Engineering Team  
**Last Updated:** 2026-05-30
