# Deployment

SilentApply is a Next.js 16 application. It requires PostgreSQL, Redis, and SMTP.
The MVP checklist targets Azure Container Apps, but any Node.js host works.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (with `extensions.vector` if using resume chunk embeddings)
- Redis (TLS recommended in production)
- SMTP relay (for magic-link email)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all required values.
See `.env.example` for documentation on each variable.

**Required:**
- `DATABASE_URL`
- `REDIS_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM`

**Optional:**
- `DIRECT_URL` — for Prisma migrations through a pgbouncer or connection pooler
- `STRIPE_*` — only if the paid tier is active
- `KEON_*` — for optional governance receipts on AI-assisted actions

## Database Migrations

```sh
# Run migrations against the database
npx prisma migrate deploy

# Or for development
npx prisma migrate dev
```

Prisma reads `DATABASE_URL` (or `DIRECT_URL` if set) from the environment.
The config file `prisma.config.ts` handles this automatically.

## Build and Start

```sh
npm install
npm run build
npm start
```

For development:
```sh
npm run dev
```

## Azure Container Apps

1. Build the Docker image (or let the CI pipeline build it):

```sh
docker build -t silentapply .
```

2. Push to Azure Container Registry:

```sh
az acr login --name <acr-name>
docker tag silentapply <acr-name>.azurecr.io/silentapply:latest
docker push <acr-name>.azurecr.io/silentapply:latest
```

3. Create or update the Container App:

```sh
az containerapp update \
  --name silentapply \
  --resource-group <rg> \
  --image <acr-name>.azurecr.io/silentapply:latest
```

4. Set environment variables via the Azure portal or CLI:

```sh
az containerapp secret set --name silentapply --resource-group <rg> \
  --secrets database-url=<value> redis-url=<value> ...

az containerapp update --name silentapply --resource-group <rg> \
  --set-env-vars DATABASE_URL=secretref:database-url ...
```

## File Uploads

Resume files are stored in `uploads/resumes/`. In production, this directory
must be mounted as a persistent volume or replaced with blob storage (Azure Blob,
S3, etc.).

For Azure Container Apps: mount an Azure Files share at `/app/uploads`.

## Keon MCP Gateway (optional)

To enable governance receipts for Q&A and resume parsing:

1. Set `KEON_GOVERNANCE_ENABLED=true`
2. Set `KEON_MCP_GATEWAY_ENDPOINT` to the gateway URL
3. Set `KEON_MCP_API_KEY`, `KEON_MCP_TENANT_ID`

The app degrades gracefully if the gateway is unavailable. Q&A and resume
parsing continue to work using local bounded behavior. No governance receipt
is claimed for that action.

## Health Check

There is no dedicated health endpoint yet. Use `/` (homepage) or add one at
`/api/health` for load balancer checks.

## Remaining Limitations

- Resume files are stored on local disk. Use persistent storage or blob in production.
- No Dockerfile is included yet — add one for containerized deployments.
- Booking notification emails are not implemented (requires email template for candidates).
- `ResumeChunk.embedding` uses `Unsupported("extensions.vector")` — semantic search is not active.
- The paid tier (Stripe) is wired but not fully implemented.
