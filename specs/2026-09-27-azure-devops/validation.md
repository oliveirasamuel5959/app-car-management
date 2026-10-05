# Validation: Azure DevOps Deployment

Last Updated: 2026-10-05
Branch: feature/2026-09-27-azure-devops
Status: In Progress

Purpose: Define the evidence required to confirm that the project is locally
reproducible, containerized, deployable to Azure, and safely released through
GitHub Actions. References [requirements.md](requirements.md) and
[plan.md](plan.md).

## V1 — Container artifacts

- [x] Backend Dockerfile exists and builds.
- [x] Frontend Dockerfile exists and builds.
- [x] Nginx template exists.
- [x] Backend entrypoint exists.
- [x] Root `.dockerignore` exists.
- [x] Images do not copy `.env` files.

```bash
docker build -f apps/backend/Dockerfile .
docker build -f apps/web/Dockerfile .
```

Regression evidence recorded on 2026-10-05: frontend CD uses repository-root
context (`.`), matching the Dockerfile COPY paths. The local full frontend
image build passed, including the Nginx template COPY. Docker still reports
four `SecretsUsedInArgOrEnv` warnings for the browser-facing Maps API key and
Stripe publishable key; these did not fail the full build. Maps keys must be
restricted to approved HTTP referrers and APIs. A GitHub Actions rerun and ACR
push remain unverified.

## V2 — Backend runtime

- [x] `GET /health` returns `200`.
- [x] CORS is environment-driven.
- [x] Alembic uses runtime `DATABASE_URL`.
- [x] Backend binds to port `5500`.
- [x] Migrations apply successfully.
- [x] Backend pytest suite passes.

```bash
cd apps/backend
uv run pytest -q
uv run alembic upgrade head
```

## V3 — Frontend and Nginx

- [x] No hardcoded `http://localhost:5500` remains in frontend source.
- [x] API and WebSocket URLs are deployment-safe.
- [x] Nginx serves the React application.
- [x] Nginx proxies REST routes and WebSockets.
- [x] React Router refreshes work.
- [x] Frontend check, tests, and build pass.

```bash
cd apps/web
npm run check
npm run test
npm run build
```

## V4 — Local Compose

- [x] `.env.example` documents required variables.
- [x] Compose configuration is valid.
- [x] PostgreSQL has a persistent named volume.
- [x] Backend waits for database health.
- [x] Migrations run against Compose PostgreSQL.
- [x] Frontend loads on port `4200`.
- [x] Backend health responds on port `5500`.
- [ ] Login, upload, and authenticated WebSocket smoke tests pass.

```bash
docker compose config
docker compose up --build
curl http://localhost:5500/health
curl http://localhost:4200
```

## V5 — Azure resources

- [ ] Staging and production resource groups exist.
- [ ] ACR exists.
- [ ] Both PostgreSQL Flexible Servers exist.
- [ ] Both databases contain `car_db`.
- [ ] Four App Services exist.
- [ ] App Service identities have `AcrPull`.
- [ ] PostgreSQL backups and SSL are configured.
- [ ] Application logging is enabled.

## V6 — CI workflow

- [ ] Pull requests run backend tests.
- [ ] Pull requests run frontend check, tests, and build.
- [ ] Pull requests validate Compose.
- [ ] Both images build in GitHub Actions.
- [ ] Images are tagged with the Git SHA.
- [ ] No secrets appear in workflow logs.

## V7 — Staging deployment

- [ ] GitHub authenticates to Azure through OIDC.
- [ ] Images are pushed to ACR.
- [ ] App Services use the expected SHA images.
- [ ] Backend migrations complete.
- [ ] Backend health responds.
- [ ] Frontend loads through its Azure URL.
- [ ] REST and WebSocket traffic work through Nginx.
- [ ] Login, payment test mode, and uploads are verified.

```bash
curl https://<staging-backend>.azurewebsites.net/health
curl https://<staging-frontend>.azurewebsites.net
```

## V8 — Production release

- [ ] Production requires GitHub environment approval.
- [ ] Production uses a separate database and secrets.
- [ ] Production CORS allows only the production frontend.
- [ ] Production database uses `sslmode=require`.
- [ ] Production smoke tests pass.
- [ ] Previous image tags are recorded for rollback.

## V9 — Rollback

- [ ] Previous backend image remains in ACR.
- [ ] Previous frontend image remains in ACR.
- [ ] Both App Services can be pointed to the previous SHA.
- [ ] App Services restart successfully after rollback.
- [ ] Database migration limitations are documented.

## V10 — Records

- [ ] `CHANGELOG.md` is updated.
- [ ] `ROADMAP.md` Phase 8 references Azure.
- [ ] `ARCHITECTURE.md` references App Service, ACR, and Flexible Server.
- [ ] `TECH-STACK.md` references Azure as the deployment target.
- [ ] `README.md` contains local Compose and Azure deployment instructions.
- [ ] Deferred Blob Storage and private networking work is documented.

## Full validation flow

```bash
docker compose config
docker compose up --build

curl http://localhost:5500/health
curl http://localhost:4200

cd apps/backend
uv run pytest -q
uv run alembic upgrade head

cd ../web
npm run check
npm run test
npm run build

cd ../..
docker build -f apps/backend/Dockerfile .
docker build -f apps/web/Dockerfile .
```

Local evidence recorded on 2026-09-27: both images built, all three Compose
services became healthy, PostgreSQL migrations reached Alembic head
`894ad4d4a168`, `/health` returned `200`, frontend REST proxying returned the
backend validation response, Nginx configuration passed `nginx -t`, and an
invalid WebSocket token was rejected through the Nginx proxy.

The phase closes when V1 through V10 pass, staging and production smoke tests
succeed, and all existing test suites remain green.
