from src.schemas.services_history import ServiceHistoryCreate, ServiceHistoryRead


def calculate_next_service_mileage(current_mileage: int) -> int:
    """Calculate the next service mileage based on the current mileage."""
    # Example logic: next service is due every 10,000 miles
    if current_mileage is None:
        raise ValueError("Vehicle mileage is required to calculate next service")
    return current_mileage + 10000