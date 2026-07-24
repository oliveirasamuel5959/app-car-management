from uuid import UUID

from sqlalchemy.orm import Session

from src.models.tenant import Tenant


def repo_create_tenant(db: Session, slug: str, name: str) -> Tenant:
    tenant = Tenant(slug=slug, name=name)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


def repo_get_tenant_by_slug(db: Session, slug: str) -> Tenant | None:
    return db.query(Tenant).filter(Tenant.slug == slug).first()


def repo_get_tenant_by_id(db: Session, tenant_id: UUID | str) -> Tenant | None:
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()


def repo_get_or_create_tenant(db: Session, slug: str, name: str) -> Tenant:
    tenant = repo_get_tenant_by_slug(db, slug)
    if tenant:
        return tenant
    return repo_create_tenant(db, slug=slug, name=name)
