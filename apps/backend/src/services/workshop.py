from sqlalchemy.orm import Session

from src.models.user import User
from src.models.workshop import Workshop
from src.repositories.workshop import (repo_create_workshop,
                                       repo_get_workshop_all_clients,
                                       repo_get_workshop_by_id,
                                       repo_get_workshop_by_id_any_tenant,
                                       repo_get_workshop_by_id_for_client,
                                       repo_get_workshop_for_user,
                                       repo_get_workshops_nearby,
                                       repo_search_workshops,
                                       repo_update_workshop)
from src.schemas.workshop import (WorkshopCreate, WorkshopSearchItem,
                                  WorkshopUpdate)

VALID_SEARCH_SORTS = {"distance", "rating", "reviews"}
VALID_SEARCH_SERVICE_TYPES = {"manutencao", "reparo", "inspecao", "outro"}


class WorkshopService:
    def __init__(self, db: Session):
        self.db = db

    def create_workshop(
        self, workshop_in: WorkshopCreate, user_id: int, tenant_id
    ) -> Workshop:
        # additional business rules could be added here
        return repo_create_workshop(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            workshop_data=workshop_in.dict(),
        )

    def get_current_workshop(self, user_id: int, tenant_id) -> Workshop:
        workshop = repo_get_workshop_for_user(self.db, user_id, tenant_id)
        if not workshop:
            raise ValueError("Workshop profile not found")
        return workshop

    def update_workshop(
        self, user_id: int, tenant_id, updates: WorkshopUpdate
    ) -> Workshop:
        workshop = repo_get_workshop_for_user(self.db, user_id, tenant_id)
        if not workshop:
            raise ValueError("Workshop profile not found")
        return repo_update_workshop(
            self.db, workshop, updates.model_dump(exclude_unset=True)
        )

    def get_workshop_by_id(self, workshop_id: int, tenant_id) -> Workshop:
        workshop = repo_get_workshop_by_id(self.db, workshop_id, tenant_id)
        if not workshop:
            raise ValueError(f"Workshop {workshop_id} not found")
        return workshop

    def get_workshop_by_client_access(
        self, workshop_id: int, user_id: int, user_email: str | None = None
    ) -> Workshop:
        workshop = repo_get_workshop_by_id_for_client(
            self.db, workshop_id, user_id, user_email=user_email
        )
        if not workshop:
            raise ValueError(f"Workshop {workshop_id} not found")
        return workshop

    def get_nearby_workshops(
        self, tenant_id, lat: float, lng: float, radius_km: float = 10.0
    ) -> list[Workshop]:
        # service handled radius calculation (defaults to 10km)
        return repo_get_workshops_nearby(self.db, tenant_id, lat, lng, radius_km)

    def get_all_clients(self, workshop_id: int, tenant_id) -> list[User]:
        """
        Return all distinct CLIENT users that have services
        in the specified workshop.
        """
        clients = repo_get_workshop_all_clients(self.db, workshop_id, tenant_id)

        if not clients:
            return []

        return clients

    def search_workshops(
        self,
        name: str | None = None,
        lat: float | None = None,
        lng: float | None = None,
        radius_km: float = 10.0,
        min_rating: float | None = None,
        service_types: list[str] | None = None,
        sort: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[WorkshopSearchItem]:
        """Search workshops with optional filters (client discovery, cross-tenant).

        `sort` defaults to `distance` when coordinates are provided and
        `rating` otherwise.
        """
        if sort is None:
            sort = "distance" if (lat is not None and lng is not None) else "rating"
        if sort not in VALID_SEARCH_SORTS:
            raise ValueError(f"Invalid sort: {sort}")
        if sort == "distance" and (lat is None or lng is None):
            raise ValueError("Sort by distance requires latitude and longitude")
        if service_types:
            invalid = [t for t in service_types if t not in VALID_SEARCH_SERVICE_TYPES]
            if invalid:
                raise ValueError(f"Invalid service type: {invalid[0]}")

        return repo_search_workshops(
            self.db,
            name=name,
            lat=lat,
            lng=lng,
            radius_km=radius_km,
            min_rating=min_rating,
            service_types=service_types,
            sort=sort,
            skip=skip,
            limit=limit,
        )

    def get_workshop_by_id_any_tenant(self, workshop_id: int) -> Workshop:
        """Get workshop by ID without tenant scoping (for client discovery)."""
        workshop = repo_get_workshop_by_id_any_tenant(self.db, workshop_id)
        if not workshop:
            raise ValueError(f"Workshop {workshop_id} not found")
        return workshop

    def get_workshop_agenda(
        self,
        workshop_id: int,
        date_from: "datetime.date",
        date_to: "datetime.date",
    ) -> list[dict]:
        """Compute daily availability for a workshop.

        Returns one entry per day in [date_from, date_to]. Each entry has:
          - date, is_open, day_of_week
          - slots: list of {time, busy}
        """
        import datetime as _dt

        from src.models.schedule import Schedule

        workshop = repo_get_workshop_by_id_any_tenant(self.db, workshop_id)
        if not workshop:
            raise ValueError(f"Workshop {workshop_id} not found")

        # Parse operating-hours configuration
        work_days: set[int] = set()
        if workshop.work_days:
            try:
                work_days = {
                    int(d.strip()) for d in workshop.work_days.split(",") if d.strip()
                }
            except (ValueError, AttributeError):
                work_days = set()

        opening = workshop.opening_time  # datetime.time or None
        closing = workshop.closing_time  # datetime.time or None

        # Load accepted schedules in range for busy computation
        accepted_schedules: list[tuple[_dt.date, _dt.time]] = []
        if opening and closing:
            accepted = (
                self.db.query(Schedule)
                .filter(
                    Schedule.workshop_id == workshop_id,
                    Schedule.status == "aceito",
                    Schedule.scheduled_at
                    >= _dt.datetime.combine(date_from, _dt.time.min),
                    Schedule.scheduled_at
                    <= _dt.datetime.combine(date_to, _dt.time.max),
                )
                .all()
            )
            for s in accepted:
                if s.scheduled_at:
                    accepted_schedules.append(
                        (s.scheduled_at.date(), s.scheduled_at.time())
                    )

        SLOT_MINUTES = 30
        result: list[dict] = []

        current = date_from
        while current <= date_to:
            iso_weekday = current.isoweekday()  # 1=Monday … 7=Sunday
            is_open = (
                iso_weekday in work_days and opening is not None and closing is not None
            )

            slots: list[dict] = []
            if is_open:
                # Build time slots
                slot_start = _dt.datetime.combine(current, opening)
                slot_end = _dt.datetime.combine(current, closing)

                while slot_start + _dt.timedelta(minutes=SLOT_MINUTES) <= slot_end:
                    slot_time = slot_start.time()
                    # A slot is busy if any accepted schedule falls within this 30-min window
                    busy = any(
                        s_date == current
                        and slot_time
                        <= s_time
                        < (
                            _dt.datetime.combine(current, slot_time)
                            + _dt.timedelta(minutes=SLOT_MINUTES)
                        ).time()
                        for s_date, s_time in accepted_schedules
                    )
                    slots.append({"time": slot_time.strftime("%H:%M"), "busy": busy})
                    slot_start += _dt.timedelta(minutes=SLOT_MINUTES)

            result.append(
                {
                    "date": current.isoformat(),
                    "day_of_week": iso_weekday,
                    "is_open": is_open,
                    "slots": slots,
                }
            )
            current += _dt.timedelta(days=1)

        return result
