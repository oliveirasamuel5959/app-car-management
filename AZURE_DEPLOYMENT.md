# Azure Deployment Runbook

This project deploys two containers to Azure App Service:

- `car-backend`: FastAPI and Uvicorn on port `5500`
- `car-frontend`: React static build and Nginx on port `4200`

PostgreSQL runs on Azure Database for PostgreSQL Flexible Server. Images are
stored in Azure Container Registry and deployed by GitHub Actions.

## 1. Prerequisites

Install Docker, Azure CLI, and GitHub CLI. Sign in to Azure and select the
subscription that should receive the resources:

```bash
az login
az account list --output table
az account set --subscription "<SUBSCRIPTION_ID>"
```

Set local shell variables. Names for ACR and App Services must be globally
unique in Azure:

```bash
LOCATION="<azure-region>"
ACR_NAME="<globally-unique-acr-name>"
```

## 2. Resource Groups

```bash
az group create --name rg-car-platform --location "$LOCATION"
az group create --name rg-car-staging --location "$LOCATION"
az group create --name rg-car-production --location "$LOCATION"
```

## 3. Container Registry

```bash
az acr create \
  --resource-group rg-car-platform \
  --name "$ACR_NAME" \
  --sku Standard \
  --admin-enabled false
```

Get the registry login server:

```bash
az acr show \
  --resource-group rg-car-platform \
  --name "$ACR_NAME" \
  --query loginServer \
  --output tsv
```

## 4. PostgreSQL Flexible Server

Create separate servers for staging and production. Use a strong password and
store it in Azure App Service settings or Key Vault, never in Git.

```bash
az postgres flexible-server create \
  --resource-group rg-car-staging \
  --name "<unique-staging-postgres-name>" \
  --location "$LOCATION" \
  --database-name car_db \
  --admin-user "<postgres-admin-user>" \
  --admin-password "<strong-password>" \
  --version 16 \
  --tier Burstable \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --backup-retention 7 \
  --public-access 0.0.0.0
```

Repeat for production with a production SKU and longer backup retention.
`0.0.0.0` allows Azure services; add the developer IP only when direct local
database access is required:

```bash
az postgres flexible-server firewall-rule create \
  --resource-group rg-car-staging \
  --name "<staging-postgres-name>" \
  --rule-name AllowDeveloper \
  --start-ip-address "<YOUR_PUBLIC_IP>" \
  --end-ip-address "<YOUR_PUBLIC_IP>"
```

Azure connection strings must use:

```text
postgresql://USER:PASSWORD@SERVER.postgres.database.azure.com:5432/car_db?sslmode=require
```

## 5. App Service Plans and Apps

Create Linux plans:

```bash
az appservice plan create \
  --resource-group rg-car-staging \
  --name asp-car-staging \
  --is-linux \
  --sku B1

az appservice plan create \
  --resource-group rg-car-production \
  --name asp-car-production \
  --is-linux \
  --sku P1v3
```

Create four App Services with a temporary public image, then replace the image
through GitHub Actions:

```bash
az webapp create \
  --resource-group rg-car-staging \
  --plan asp-car-staging \
  --name car-backend-staging \
  --deployment-container-image-name nginx:alpine
```

Create the other staging and production frontend/backend apps similarly.

Configure ports:

```bash
az webapp config appsettings set \
  --resource-group "<resource-group>" \
  --name "<backend-app-name>" \
  --settings WEBSITES_PORT=5500 WEBSITES_ENABLE_APP_SERVICE_STORAGE=true

az webapp config appsettings set \
  --resource-group "<resource-group>" \
  --name "<frontend-app-name>" \
  --settings WEBSITES_PORT=4200
```

## 6. Managed Identity and ACR Pull

Assign a system identity to each App Service and grant it `AcrPull`:

```bash
az webapp identity assign \
  --resource-group "<resource-group>" \
  --name "<app-name>"

PRINCIPAL_ID=$(az webapp identity show \
  --resource-group "<resource-group>" \
  --name "<app-name>" \
  --query principalId \
  --output tsv)

ACR_ID=$(az acr show \
  --resource-group rg-car-platform \
  --name "$ACR_NAME" \
  --query id \
  --output tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --scope "$ACR_ID" \
  --role AcrPull
```

Enable managed identity image pulls for every App Service:

```bash
APP_CONFIG_ID=$(az webapp config show \
  --resource-group "<resource-group>" \
  --name "<app-name>" \
  --query id \
  --output tsv)

az resource update \
  --ids "$APP_CONFIG_ID" \
  --set properties.acrUseManagedIdentityCreds=true
```

## 7. App Settings

Backend settings must include:

```text
DATABASE_URL=postgresql://...?sslmode=require
JWT_SECRET_KEY=<secret>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
CORS_ORIGINS=https://<frontend-app>.azurewebsites.net
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOW_HEADERS=*
FRONTEND_URL=https://<frontend-app>.azurewebsites.net
UPLOAD_DIRECTORY=/home/uploads
WEBSITES_PORT=5500
```

Frontend settings must include:

```text
BACKEND_URL=https://<backend-app>.azurewebsites.net
WEBSITES_PORT=4200
```

Set application secrets with `az webapp config appsettings set` or Azure Key
Vault references. Do not put production secrets in GitHub workflow files.

## 8. GitHub OIDC

Create an Entra application and service principal. The image-build job runs
before the environment-specific deployment jobs, so add federated credentials
for the source branches as well as the protected environments:

```text
repo:<OWNER>/<REPOSITORY>:ref:refs/heads/develop
repo:<OWNER>/<REPOSITORY>:ref:refs/heads/main
repo:<OWNER>/<REPOSITORY>:environment:staging
repo:<OWNER>/<REPOSITORY>:environment:production
```

Grant the deployment identity:

- `AcrPush` on the registry
- `Website Contributor` on the application resources

Create GitHub environments named `staging` and `production`. Require manual
reviewers for `production`.

Required repository-level GitHub secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

Required GitHub variables:

```text
ACR_NAME
ACR_LOGIN_SERVER
```

Environment-scoped variables:

```text
AZURE_RESOURCE_GROUP
AZURE_FRONTEND_APP_NAME
AZURE_BACKEND_APP_NAME
AZURE_FRONTEND_URL
AZURE_BACKEND_URL
```

## 9. Deployment Flow

The workflow in `.github/workflows/deploy.yml` uses:

- `develop` for automatic staging deployment
- `main` for production deployment
- GitHub production environment approval before production deployment
- Git SHA image tags
- Backend deployment before frontend deployment
- `/health` and frontend URL smoke tests

Run local validation first:

```bash
cp .env.example .env
docker compose config
docker compose up --build
```

## 10. Rollback

Record the previous image SHA before every production deployment. To roll back,
point both App Services to the previous images:

```bash
az webapp config container set \
  --resource-group "<resource-group>" \
  --name "<backend-app-name>" \
  --docker-custom-image-name "<acr>.azurecr.io/car-backend:<previous-sha>" \
  --docker-registry-server-url "https://<acr>.azurecr.io"
```

Repeat for the frontend and restart both applications. Database migrations must
remain backward-compatible; automatic database downgrades are not part of the
rollback procedure.

## Azure Container Apps

1. Create azure container registry and enable access keys admin:

```bash
az acr create --resource-group rg-drivepluss-app --name acrdriveplussapp --sku Basic --location westus2
```

2. Login to acr created:

```bash
az acr login --name acrdriveplussapp
```

3. Build and push docker image to acr:

```bash
az acr login --name acrdriveplussapp
docker build -t acrdriveplussapp.azurecr.io/<image_name>:<tag> -f ./path_to_dockerfile/Dockerfile .
docker push acrdriveplussapp.azurecr.io/<image_name>:<tag>
```

4. Create azure app container environment

```bash
az containerapp env create --name driveplusscontainerenv --resource-group rg-drivepluss-app --location westus2
```

5. Create azure container app

```bash
az containerapp create --name backend
```