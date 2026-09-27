FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

WORKDIR /app

COPY apps/backend/pyproject.toml apps/backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY apps/backend/src ./src
COPY apps/backend/migrations ./migrations
COPY apps/backend/alembic.ini apps/backend/README.md ./
COPY apps/backend/entrypoint.sh ./entrypoint.sh
COPY apps/backend/static ./static
RUN uv sync --frozen --no-dev

FROM python:3.12-slim AS runtime

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/alembic.ini /app/alembic.ini
COPY --from=builder /app/static /app/static
COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh

RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/uploads \
    && chmod +x /app/entrypoint.sh \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 5500

ENTRYPOINT ["/app/entrypoint.sh"]
