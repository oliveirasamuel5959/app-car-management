from datetime import datetime, timedelta

next_service_intervals = {
    "oil_change": {"mileage": 10000, "days": 365},
    "tire_rotation": {"mileage": 15000, "days": 365},
    "tire_replacement": {"mileage": 50000, "days": 1825},
    "brake_service": {"mileage": 30000, "days": 1095},
    "battery_replacement": {"mileage": 60000, "days": 2190},
    "air_filter": {"mileage": 15000, "days": 365},
    "transmission_service": {"mileage": 60000, "days": 2190},
    "coolant_flush": {"mileage": 30000, "days": 1095},
    "belt_replacement": {"mileage": 60000, "days": 2190},
    "inspection": {"mileage": 15000, "days": 365},
    "other": {"mileage": 10000, "days": 180},
}


def calculate_next_service_mileage(current_mileage: int, service_type: str) -> int:
    """Calculate the next service mileage based on the current mileage."""
    if current_mileage is None:
        raise ValueError("Vehicle mileage is required to calculate next service")

    if service_type not in next_service_intervals:
        raise ValueError(f"Unknown service type: {service_type}")

    interval = next_service_intervals[service_type]
    next_service_mileage = current_mileage + interval["mileage"]
    return next_service_mileage


def calculate_next_service_date(serviced_at: datetime, service_type: str) -> datetime:
    """Calculate the next service date based on the last serviced date."""
    if serviced_at is None:
        raise ValueError("Service date is required to calculate next service date")

    last_service_date = (
        serviced_at
        if isinstance(serviced_at, datetime)
        else datetime.fromisoformat(serviced_at)
    )

    if service_type not in next_service_intervals:
        raise ValueError(f"Unknown service type: {service_type}")

    interval = next_service_intervals[service_type]
    next_service_date = last_service_date + timedelta(days=interval["days"])

    return next_service_date
