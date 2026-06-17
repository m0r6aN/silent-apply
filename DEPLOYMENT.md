# Deployment

SilentApply is a Next.js 16 application. It requires PostgreSQL, Redis, an email
provider, and blob storage. The production target is Azure Container Apps using
the managed Azure services below, but any Node.js host works.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ — **Neon** serverless Postgres (works with the `@prisma/adapter-pg`
  driver adapter with no code changes). `extensions.vector` only if using resume
  chunk embeddings.
- Redis (TLS) — **Azure Cache for Redis** (`rediss://` on port 6380)
- Email — **Azure Communication Services** (resource `ecs-silentapply`) for
  magic-link sign-in and booking confirmation emails
- Blob storage — **Azure Blob Storage** for durable resume uploads

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all required values.
See `.env.example` for documentation on each variable.

**Required:**
- `DATABASE_URL` — Neon pooled connection string
- `DIRECT_URL` — Neon direct (non-pooled) connection string, used by Prisma migrations
- `REDIS_URL` — Azure Cache for Redis (`rediss://...:6380`)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ACS_EMAIL_CONNECTION_STRING` — Azure Communication Services (`ecs-silentapply`)
- `EMAIL_FROM` — verified sender on the connected email domain
- `AZURE_STORAGE_CONNECTION_STRING` — storage account for resume blobs
- `AZURE_STORAGE_CONTAINER` — blob container name (default `resumes`)

**Optional:**
- `STRIPE_*` — only if the paid tier is active
- `KEON_*` — for optional governance receipts on AI-assisted actions
- `DATABASE_SSL_REJECT_UNAUTHORIZED=false` — local dev with self-signed certs only

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

Resume files are stored in **Azure Blob Storage** (`lib/storage.ts`). Set
`AZURE_STORAGE_CONNECTION_STRING` (and optionally `AZURE_STORAGE_CONTAINER`,
default `resumes`). The container is private; downloads are always proxied
server-side through the resume routes so visibility gating is enforced — blob
URLs are never handed to recruiters directly.

If `AZURE_STORAGE_CONNECTION_STRING` is unset, the app falls back to local disk
(`uploads/resumes/`). That is for local development only — local files do not
survive a container restart or redeploy.

## Keon MCP Gateway (optional)

To enable governance receipts for Q&A and resume parsing:

1. Set `KEON_GOVERNANCE_ENABLED=true`
2. Set `KEON_MCP_GATEWAY_ENDPOINT` to the gateway URL
3. Set `KEON_MCP_API_KEY`, `KEON_MCP_TENANT_ID`

The app degrades gracefully if the gateway is unavailable. Q&A and resume
parsing continue to work using local bounded behavior. No governance receipt
is claimed for that action.

## Health Check

`GET /api/health` returns `{ ok: true, ts }` with HTTP 200 when the app and
database are reachable, and HTTP 503 if the database ping fails. No auth required.
Point the Container App liveness/readiness probe at this path.

## Domain and DNS

`silentapply.ai` points at the deployed Container App:

1. In the DNS registrar, add records for `silentapply.ai` and `www.silentapply.ai`
   pointing at the Container App ingress (CNAME to the app FQDN, or the registrar's
   apex/ALIAS equivalent for the root domain).
2. Add the custom domain to the Container App and bind a managed certificate
   (Azure Container Apps issues/renews via its managed certificate flow):
   ```sh
   az containerapp hostname add --name silentapply --resource-group <rg> \
     --hostname silentapply.ai
   az containerapp hostname bind --name silentapply --resource-group <rg> \
     --hostname silentapply.ai --environment <env> --validation-method CNAME
   ```
3. Set `NEXTAUTH_URL=https://silentapply.ai` so magic-link callback URLs are correct.
4. Verify the email domain in Azure Communication Services and confirm magic-link
   emails arrive with the production callback URL.

## Remaining Limitations

- `ResumeChunk.embedding` uses `Unsupported("extensions.vector")` — semantic search is not active.
- The paid tier (Stripe) is wired but not fully implemented.
