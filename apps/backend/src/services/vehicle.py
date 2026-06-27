from sqlalchemy.exc import IntegrityError

from src.core.exceptions import DuplicateVehiclePlateError
from src.repositories.user import repo_get_user_by_id
from src.repositories.vehicle import (check_duplicate_plate,
                                      repo_create_vehicle,
                                      repo_get_vehicle_by_email)
from src.schemas.vehicle import VehicleCreate


class VehicleService:
    def __init__(self, db):
        self.db = db

    def create_vehicle(self, vehicle_in: VehicleCreate, user_id, tenant_id):
        user = repo_get_user_by_id(self.db, user_id, tenant_id)

        if not user:
            raise ValueError("User not found")

        vehicle = repo_get_vehicle_by_email(self.db, user.email, tenant_id)

        duplicate_plate = check_duplicate_plate(self.db, tenant_id, vehicle_in.plate)

        if duplicate_plate is not None:
            raise DuplicateVehiclePlateError()

        if vehicle:
            raise ValueError("User already has a vehicle")

        try:
            return repo_create_vehicle(
                self.db,
                tenant_id=tenant_id,
                user_id=user.id,
                vehicle_data=vehicle_in.dict(exclude={"user"}),
            )
        except IntegrityError:
            self.db.rollback()
            raise DuplicateVehiclePlateError()

    def get_vehicle_by_email(self, email, tenant_id):
        return repo_get_vehicle_by_email(self.db, email, tenant_id)
