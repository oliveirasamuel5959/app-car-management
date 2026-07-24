from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from src.models.schedule import Schedule
from src.repositories.schedules import (
    repo_create_schedule,
    repo_get_schedule_by_id,
    repo_get_schedule_by_id_for_client,
    repo_get_schedules_for_client,
    repo_get_schedules_for_workshop,
    repo_update_schedule,
)

# Terminal statuses — no further transitions allowed
_TERMINAL_STATUSES = {"aceito", "recusado"}


class ScheduleService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Workshop-side
    # ------------------------------------------------------------------

    def get_schedules_for_workshop(
        self,
        workshop_tenant_id: UUID | str,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Schedule]:
        return repo_get_schedules_for_workshop(
            self.db, workshop_tenant_id, skip=skip, limit=limit
        )

    def get_schedule_by_id(
        self,
        schedule_id: int,
        workshop_tenant_id: UUID | str,
    ) -> Schedule | None:
        return repo_get_schedule_by_id(
            self.db, schedule_id, workshop_tenant_id
        )

    def _require_not_terminal(self, schedule: Schedule) -> None:
        if schedule.status in _TERMINAL_STATUSES:
            raise ValueError(
                f"Schedule {schedule.id} is already {schedule.status} "
                f"and cannot be transitioned further"
            )

    def view_schedule(
        self,
        schedule_id: int,
        workshop_tenant_id: UUID | str,
    ) -> Schedule:
        schedule = repo_get_schedule_by_id(
            self.db, schedule_id, workshop_tenant_id
        )
        if not schedule:
            raise ValueError(f"Schedule {schedule_id} not found")

        # No-op safe: if already visualizado or beyond, don't regress
        if schedule.status == "pendente":
            return repo_update_schedule(
                self.db,
                schedule,
                {
                    "status": "visualizado",
                    "viewed_at": datetime.now(timezone.utc),
                },
            )
        # Already visualizado or terminal — just set viewed_at if missing
        if schedule.viewed_at is None:
            return repo_update_schedule(
                self.db,
                schedule,
                {"viewed_at": datetime.now(timezone.utc)},
            )
        return schedule

    def accept_schedule(
        self,
        schedule_id: int,
        workshop_tenant_id: UUID | str,
    ) -> Schedule:
        schedule = repo_get_schedule_by_id(
            self.db, schedule_id, workshop_tenant_id
        )
        if not schedule:
            raise ValueError(f"Schedule {schedule_id} not found")
        self._require_not_terminal(schedule)

        return repo_update_schedule(
            self.db,
            schedule,
            {
                "status": "aceito",
                "responded_at": datetime.now(timezone.utc),
            },
        )

    def reject_schedule(
        self,
        schedule_id: int,
        workshop_tenant_id: UUID | str,
    ) -> Schedule:
        schedule = repo_get_schedule_by_id(
            self.db, schedule_id, workshop_tenant_id
        )
        if not schedule:
            raise ValueError(f"Schedule {schedule_id} not found")
        self._require_not_terminal(schedule)

        return repo_update_schedule(
            self.db,
            schedule,
            {
                "status": "recusado",
                "responded_at": datetime.now(timezone.utc),
            },
        )

    # ------------------------------------------------------------------
    # Client-side (needed for Phase 3, but defined here for cohesion)
    # ------------------------------------------------------------------

    def create_schedule(
        self,
        data: dict,
        client_tenant_id: UUID | str,
    ) -> Schedule:
        data["client_tenant_id"] = client_tenant_id
        data["status"] = "pendente"
        return repo_create_schedule(self.db, data)

    def get_schedules_for_client(
        self,
        client_tenant_id: UUID | str,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Schedule]:
        return repo_get_schedules_for_client(
            self.db, client_tenant_id, skip=skip, limit=limit
        )

    def get_schedule_by_id_for_client(
        self,
        schedule_id: int,
        client_tenant_id: UUID | str,
    ) -> Schedule | None:
        return repo_get_schedule_by_id_for_client(
            self.db, schedule_id, client_tenant_id
        )
