# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Vehicle owners who need vehicle services and mechanical workshops that provide those services.

## Product Purpose

Connect vehicle owners with mechanical workshops so clients can find workshops, request appointments, follow service orders, and workshops can manage the services they provide.

## Capabilities and Constraints

The app has CLIENT and WORKSHOP roles. The frontend currently supports workshop search, appointment requests, appointment status updates, service-order tracking, vehicle management, maintenance history, messaging, and workshop operations. The appointment request API supports the request types maintenance, repair, inspection, and other. Appointment requests have the states pending, viewed, accepted, and rejected; completion and client cancellation are not represented as appointment states. Backend changes are outside the current frontend redesign scope.

## Evidence on Hand

Product capabilities and terminology are evidenced in `AGENTS.md`, `apps/web/src/routes/routes.tsx`, and the frontend services under `apps/web/src/services/`. No separate positioning evidence or user-provided marketing claims were established.

## Product Principles

- Keep appointment and service-order lifecycle states distinct.
- Preserve the existing API contracts while the frontend redesign is implemented.
- Do not present an action as available when the current backend does not support it.
