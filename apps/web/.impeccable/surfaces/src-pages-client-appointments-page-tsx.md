---
version: 1
slug: "src-pages-client-appointments-page-tsx"
primary_target: "src/pages/client/appointments-page.tsx"
related_targets: []
---

Scope: Client appointments, operated by vehicle owners to discover a workshop and request a slot.

Audience and task: A client compares workshops, selects a request type and available time, submits contact information, and tracks the workshop response.

Constraints: Keep APIs/auth and local timezone behavior; no backend changes. Booking stages: Oficina → Serviço → Data e horário → Confirmar. Cancelados always contains recusado, Concluídos contains accepted past requests, and Próximos contains the rest. Do not offer cancellation/rescheduling. Keep legacy routes until TG10, the 50-item list cap, and omit workshop-name lookups.

Direction contract

THESIS: Make the next appointment decision obvious: first choose where, then what, when, and finally confirm; refuse a generic directory/list detached from the booking task.

OWN-WORLD: Use the existing DrivePluss palette and CSS-token system, Plus Jakarta Sans, compact but breathable workshop results, explicit schedule status tints, and a restrained calendar/availability grid; keep navigation and controls familiar to a working client app.

STORY: The client compares workshops and services, selects a request type and a real available slot, then submits details; after submission the request appears in Meus agendamentos and can be tracked by status.

FIRST VIEWPORT: The shared application shell frames a left-aligned Agendamentos heading and two tabs. In Novo, place a four-step progress track above search filters and results; show the map as a secondary desktop panel. In Meus, place three status filters above appointment entries, with a clear next-step action in every empty bucket.

FORM: Code-led Operate surface extension, using the existing route and shared Tailwind-token design system; no concept seed because this extends an established authenticated surface.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
