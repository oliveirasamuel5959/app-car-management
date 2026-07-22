# Feature: Agendamento de Serviços (Client ↔ Workshop)

## 0. Decisões confirmadas na etapa de planejamento

| Dúvida | Decisão |
|---|---|
| O que é um "tenant"? | **Modelo dual-tenant**: cliente é um tenant, oficina é um tenant. Cada `schedule` referencia os dois. |
| Uma tabela `schedules` ou uma por tenant? | **Uma única tabela**, com `client_tenant_id` e `workshop_tenant_id` separados (ver seção 2). Evita duplicação de dados e mantém uma fonte única de verdade para o fluxo de status. |
| Disponibilidade de horário | Não é uma tabela de configuração nova. É **derivada das ordens de serviço já existentes da oficina** (`services_history` / ordens em andamento). O endpoint de agenda cruza o horário de funcionamento da oficina com os horários já ocupados por ordens abertas. |
| Avaliação (rating) | **Somente schema** nesta fase. Tabela `workshop_ratings` criada mas sem UI/endpoint de submissão ainda (ver seção 2.3 e "Fora de escopo"). |

> ⚠️ **Assunção a validar antes de implementar**: assumo que o model `Workshop` já possui campos de horário de funcionamento (ex.: `opening_time`, `closing_time`) e `employee_count`, já que você mencionou "informações de funcionamento" e "quantidade de funcionários" como dado existente a ser exibido. Se esses campos não existirem ainda no model `Workshop`, é preciso adicioná-los antes do endpoint de agenda funcionar — me avise se precisar do diff desse model também.

---

## 1. Arquitetura geral do fluxo

```
Cliente                                  Oficina
──────                                   ───────
/novo-agendamento                        (login já existe)
  → tabela de oficinas (filtro nome/localização)
  → clica na linha
/agendamentos/[workshopId]
  → calendário (GET /workshops/{id}/agenda)
  → info da oficina (horário, funcionários, rating)
  → seleciona dia/hora
  → Modal Form (tipo serviço, descrição, telefone, email)
  → POST /schedules  ──────────────────▶  status = PENDENTE
                                          notifica oficina (tabela `notifications` já existente)

/meus-agendamentos                       /agendamentos
  → GET /schedules?client=me             → GET /schedules?workshop=me
  → mostra status em tempo real          → tabela de solicitações
                                          → "Visualizar Agendamento"
                                             → PATCH /schedules/{id}/view
                                               (pendente → visualizado)
                                             → Modal detalhado
                                             → Aceitar  → PATCH status=aceito  ─┐
                                             → Recusar  → PATCH status=recusado ─┤→ notifica cliente
                                             → Cancelar → fecha modal, sem PATCH ┘  (tabela `notifications`)
```

---

## 2. Backend — Novos modelos

### 2.1 Enums

```python
import enum

class ScheduleStatus(str, enum.Enum):
    PENDENTE = "pendente"
    VISUALIZADO = "visualizado"
    ACEITO = "aceito"
    RECUSADO = "recusado"


class ServiceRequestType(str, enum.Enum):
    MANUTENCAO = "manutencao"
    REPARO = "reparo"
    INSPECAO = "inspecao"
    OUTRO = "outro"
```

### 2.2 Tabela `schedules`

Ponto-chave: como cliente e oficina são tenants distintos, o registro precisa dos dois FKs para `tenants.id`, com `foreign_keys=[...]` explícito nos relationships (SQLAlchemy não consegue inferir qual FK usar quando há duas apontando pra mesma tabela).

```python
import uuid
import decimal
from datetime import datetime
from sqlalchemy import (
    String, Text, Integer, DateTime, ForeignKey, Index, Enum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Schedule(Base):
    __tablename__ = "schedules"
    __table_args__ = (
        Index("ix_schedules_workshop_tenant_id_scheduled_at", "workshop_tenant_id", "scheduled_at"),
        Index("ix_schedules_client_tenant_id_status", "client_tenant_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Tenants (dual-tenant model)
    client_tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    workshop_tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )

    # Referências diretas (evita joins desnecessários e facilita queries de agenda)
    workshop_id: Mapped[int] = mapped_column(
        ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False
    )
    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )

    # Dados da solicitação (form do modal)
    service_request_type: Mapped[ServiceRequestType] = mapped_column(
        Enum(ServiceRequestType, name="service_request_type"), nullable=False
    )
    problem_description: Mapped[str] = mapped_column(Text, nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)

    # Data/hora escolhida no calendário
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Status
    status: Mapped[ScheduleStatus] = mapped_column(
        Enum(ScheduleStatus, name="schedule_status"),
        default=ScheduleStatus.PENDENTE,
        nullable=False,
    )
    viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )

    # Relationships — foreign_keys explícito por causa do dual FK em tenants.id
    client_tenant = relationship("Tenant", foreign_keys=[client_tenant_id])
    workshop_tenant = relationship("Tenant", foreign_keys=[workshop_tenant_id])
    workshop = relationship("Workshop", backref="schedules")
    vehicle = relationship("Vehicle", backref="schedules")
```

**Colunas da tabela `schedules` (resumo):**
```
id, client_tenant_id, workshop_tenant_id, workshop_id, vehicle_id, service_request_type, problem_description, contact_phone, contact_email, scheduled_at, status, viewed_at, responded_at, created_at, updated_at
```

### 2.3 Tabela `workshop_ratings` (schema-only nesta fase)

```python
from sqlalchemy import UniqueConstraint, CheckConstraint

class WorkshopRating(Base):
    __tablename__ = "workshop_ratings"
    __table_args__ = (
        UniqueConstraint("schedule_id", name="uq_workshop_ratings_schedule_id"),
        CheckConstraint("rating >= 0 AND rating <= 5", name="ck_workshop_ratings_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workshop_tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    client_tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)

    # Link opcional ao agendamento que originou a avaliação (evita rating "solto")
    schedule_id: Mapped[int | None] = mapped_column(
        ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True
    )

    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

> A média de rating por oficina deve ser calculada via query agregada (`AVG(rating)` com `func.avg` no SQLAlchemy), não armazenada como coluna redundante em `Workshop` — a menos que a leitura na listagem de oficinas vire gargalo de performance, caso em que vale considerar um campo `avg_rating` cacheado + trigger/job de recálculo.

---

## 3. Backend — Endpoints

Seguindo o padrão que você já tem (repository → service → router), os novos endpoints:

### Lado Cliente
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/workshops?name=&lat=&lng=&radius_km=` | Lista oficinas com filtro por nome OU localização |
| `GET` | `/workshops/{workshop_id}/agenda?date_from=&date_to=` | Retorna horários ocupados/livres, cruzando `opening_time`/`closing_time` da oficina com as ordens de serviço já agendadas (`services_history` + `schedules` com status `aceito`) |
| `GET` | `/workshops/{workshop_id}` | Detalhe da oficina (funcionamento, nº funcionários, rating médio) |
| `POST` | `/schedules` | Cria novo agendamento (status inicial `pendente`) |
| `GET` | `/schedules?client_tenant_id=me` | "Meus Agendamentos" — lista com status |

### Lado Oficina
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/schedules?workshop_tenant_id=me` | Lista de solicitações recebidas |
| `GET` | `/schedules/{id}` | Detalhe (também dispara `PATCH .../view` no frontend ao abrir o modal, ou o backend marca `viewed_at` automaticamente neste GET) |
| `PATCH` | `/schedules/{id}/accept` | `status → aceito`, seta `responded_at`, dispara notificação |
| `PATCH` | `/schedules/{id}/reject` | `status → recusado`, seta `responded_at`, dispara notificação |

> **Nota de design**: "Visualizado" pode ser setado tanto num PATCH explícito (`/view`) quanto automaticamente no `GET /schedules/{id}` quando quem chama é a oficina — recomendo o PATCH explícito pra manter efeitos colaterais fora de um GET (boa prática REST: GET não deveria mutar estado).

### Notificações
Reaproveitar a tabela `notifications` já existente — ao aceitar/recusar, criar um registro de notificação apontando para o `client_tenant_id`, com referência ao `schedule_id`. Não é necessário criar uma tabela nova pra isso.

---

## 4. Frontend

### 4.1 Rotas — ajuste de nomenclatura

O spec original pedia páginas nomeadas literalmente `<oficina_id>-agendamentos`. Isso não segue boas práticas de roteamento (mistura ID dinâmico dentro de uma string estática). O padrão correto, tanto em Next.js quanto React Router, é rota dinâmica:

```
/novo-agendamento                 → tabela de oficinas
/agendamentos/[workshopId]        → calendário + form da oficina específica  (era "<oficina_id>-agendamentos")
/meus-agendamentos                → lista de agendamentos do cliente
/agendamentos                     → lista de solicitações (lado oficina)
```

### 4.2 Sidebar
- Cliente: botão **"Novo Agendamento"** → `/novo-agendamento`
- Oficina: botão **"Agendamentos"** → `/agendamentos`

### 4.3 Página `/novo-agendamento` (cliente)
- Tabela de oficinas, cada linha é clicável (botão)
- Filtros: nome (input text) OU localização atual (usa geolocalização do browser + `location_bias` no backend)
- Ao clicar → `router.push(/agendamentos/${workshop.id})`

### 4.4 Página `/agendamentos/[workshopId]` (cliente)
- Header: nome da oficina
- Bloco de informações: horário de funcionamento, nº de funcionários, rating (estrelas 0–5, somente leitura nesta fase — sem botão de avaliar ainda, já que o rating é schema-only)
- Calendário (ex.: `react-day-picker` ou `FullCalendar`) consumindo `GET /workshops/{id}/agenda`
- Ao selecionar dia + hora → abre Modal Form (client-side state, sem navegação):
  - `service_request_type`: select (Manutenção / Reparo / Inspeção / Outro)
  - `problem_description`: textarea
  - `contact_phone`, `contact_email`: inputs
  - Botões: **Cancelar** (fecha modal, descarta) / **Confirmar Agendamento** (`POST /schedules`)

### 4.5 Página `/meus-agendamentos` (cliente)
- Tabela com status (`Pendente`, `Visualizado`, `Aceito`, `Recusado`) — badge colorido por status
- Atualização de status pode ser via polling simples (`GET /schedules` a cada X segundos) ou via notificação já existente, sem necessidade de WebSocket nesta fase — sugiro deixar WebSocket como melhoria futura.

### 4.6 Página `/agendamentos` (oficina)
- Tabela de solicitações recebidas, coluna de status
- Botão **"Visualizar Agendamento"** por linha → abre Modal com:
  - Todos os dados da solicitação (tipo, descrição, contato, veículo se houver)
  - **Aceitar Agendamento** → `PATCH /schedules/{id}/accept`
  - **Recusar Agendamento** → `PATCH /schedules/{id}/reject`
  - **Cancelar** → apenas fecha o modal (sem chamada ao backend)

---

## 5. Fora de escopo nesta primeira entrega (mas já planejado no schema)

- UI de submissão de avaliação (rating) pelo cliente — tabela `workshop_ratings` já existe, endpoint `POST /workshop-ratings` fica para a próxima etapa.
- WebSocket/real-time para notificações — usar a tabela `notifications` existente com polling por enquanto.
- Cancelamento de agendamento pelo **cliente** após confirmado — o spec só definiu cancelamento do lado da oficina (que é só fechar o modal, sem mudança de status). Se você quiser que o cliente também possa cancelar um agendamento já `pendente`/`aceito`, isso precisa de um novo status (`cancelado_pelo_cliente`) — não estava no escopo original, mas vale alinhar antes de implementar caso seja necessário.

---

## 6. Ordem sugerida de implementação

1. Migração Alembic: criar `schedules` e `workshop_ratings` + enums no banco
2. Model + schema (Pydantic) + repository + service de `Schedule` (seguindo o padrão de `services_history`)
3. Endpoints do lado oficina primeiro (`GET/PATCH /schedules`) — mais simples, sem cálculo de agenda
4. Endpoint de agenda (`GET /workshops/{id}/agenda`) — depende de confirmar campos de horário no model `Workshop`
5. Endpoint `POST /schedules` (cliente)
6. Integração com `notifications` existente nos PATCH de accept/reject
7. Frontend: sidebar → páginas → modais, nessa ordem
