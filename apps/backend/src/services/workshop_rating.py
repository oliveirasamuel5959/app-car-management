from uuid import UUID

from sqlalchemy.orm import Session

from src.models.workshop_rating import WorkshopRating
from src.repositories.schedules import repo_get_schedule_by_id_for_client
from src.repositories.workshop import (repo_get_workshop_by_id_any_tenant,
                                       repo_get_workshop_by_tenant_id,
                                       repo_update_workshop)
from src.repositories.workshop_rating import (
    repo_average_for_workshop_tenant, repo_create_rating, repo_delete_rating,
    repo_get_rating_by_id, repo_get_rating_by_schedule,
    repo_list_ratings_for_client_tenant, repo_list_ratings_for_workshop_tenant,
    repo_update_rating)


class WorkshopRatingService:
    """Business rules for client ratings of accepted schedules."""

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Client write side (create/update/delete own ratings)
    # ------------------------------------------------------------------

    def create_rating(
        self,
        data: dict,
        client_tenant_id: UUID | str,
    ) -> WorkshopRating:
        schedule = repo_get_schedule_by_id_for_client(
            self.db, data["schedule_id"], client_tenant_id
        )
        if not schedule:
            raise ValueError("Schedule not found")
        if schedule.status != "aceito":
            raise ValueError("Ratings are only allowed for accepted schedules")

        existing = repo_get_rating_by_schedule(self.db, schedule.id, client_tenant_id)
        if existing:
            raise ValueError("A rating already exists for this schedule")

        rating = repo_create_rating(
            self.db,
            {
                "workshop_tenant_id": schedule.workshop_tenant_id,
                "client_tenant_id": schedule.client_tenant_id,
                "schedule_id": schedule.id,
                "rating": data["rating"],
                "comment": data.get("comment"),
            },
        )
        self._recompute_workshop_avg(schedule.workshop_tenant_id)
        return rating

    def update_rating(
        self,
        rating_id: int,
        data: dict,
        client_tenant_id: UUID | str,
    ) -> WorkshopRating:
        rating = repo_get_rating_by_id(self.db, rating_id, client_tenant_id)
        if not rating:
            raise ValueError(f"Rating {rating_id} not found")
        if rating.client_tenant_id != client_tenant_id:
            raise ValueError("Only the author can update this rating")

        updates = {}
        if data.get("rating") is not None:
            updates["rating"] = data["rating"]
        if data.get("comment") is not None:
            updates["comment"] = data["comment"]

        updated = repo_update_rating(self.db, rating, updates)
        if "rating" in updates:
            self._recompute_workshop_avg(rating.workshop_tenant_id)
        return updated

    def delete_rating(
        self,
        rating_id: int,
        client_tenant_id: UUID | str,
    ) -> None:
        rating = repo_get_rating_by_id(self.db, rating_id, client_tenant_id)
        if not rating:
            raise ValueError(f"Rating {rating_id} not found")
        if rating.client_tenant_id != client_tenant_id:
            raise ValueError("Only the author can delete this rating")

        workshop_tenant_id = rating.workshop_tenant_id
        repo_delete_rating(self.db, rating)
        self._recompute_workshop_avg(workshop_tenant_id)

    # ------------------------------------------------------------------
    # Read side
    # ------------------------------------------------------------------

    def get_ratings_for_client(
        self,
        client_tenant_id: UUID | str,
        skip: int = 0,
        limit: int = 50,
    ) -> list[WorkshopRating]:
        return repo_list_ratings_for_client_tenant(
            self.db, client_tenant_id, skip=skip, limit=limit
        )

    def get_ratings_for_workshop(
        self,
        workshop_tenant_id: UUID | str,
        skip: int = 0,
        limit: int = 50,
    ) -> list[WorkshopRating]:
        return repo_list_ratings_for_workshop_tenant(
            self.db, workshop_tenant_id, skip=skip, limit=limit
        )

    def get_ratings_for_workshop_public(
        self,
        workshop_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[WorkshopRating]:
        """Ratings for a workshop resolved via its tenant (public read)."""
        workshop = repo_get_workshop_by_id_any_tenant(self.db, workshop_id)
        if not workshop:
            raise ValueError(f"Workshop {workshop_id} not found")
        return repo_list_ratings_for_workshop_tenant(
            self.db, workshop.tenant_id, skip=skip, limit=limit
        )

    def get_rating_by_id(
        self,
        rating_id: int,
        tenant_id: UUID | str,
    ) -> WorkshopRating | None:
        return repo_get_rating_by_id(self.db, rating_id, tenant_id)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _recompute_workshop_avg(self, workshop_tenant_id: UUID | str) -> None:
        """Recompute and persist the workshop's average rating after a write."""
        avg = repo_average_for_workshop_tenant(self.db, workshop_tenant_id)
        workshop = repo_get_workshop_by_tenant_id(self.db, workshop_tenant_id)
        if workshop:
            repo_update_workshop(self.db, workshop, {"rating_avg": avg})
