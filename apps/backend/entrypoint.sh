#!/bin/sh
set -eu

alembic upgrade head
# Trust the reverse proxy in front of us (the frontend Nginx, Azure Container
# Apps ingress) so X-Forwarded-For/Proto/Host are honoured. FastAPI builds
# absolute redirects — e.g. the 307 it emits for a missing trailing slash — from
# those headers, so without this they come back with the internal scheme.
exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-5500}" \
    --proxy-headers --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-*}"
