run:
	uv run uvicorn src.main:app --host 0.0.0.0 --port 5500 --reload --log-level info

migrations:
	uv run alembic revision --autogenerate -m "$(msg)"

migrate:
	uv run alembic upgrade head

# Rollback
downgrade:
	uv run alembic downgrade -1

format:
	uv run ruff format .
	uv run ruff check --fix .