from dataclasses import dataclass
import re
from uuid import UUID


@dataclass(frozen=True)
class TenantContext:
    tenant_id: UUID
    tenant_slug: str
    user_id: int


def slugify_tenant_name(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized.strip("-") or "tenant"