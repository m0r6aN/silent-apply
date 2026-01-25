Locked. **Option B** is the right call if SilentApply is going to feel inevitable instead of “mostly working.” 😄

Here’s the **sleep-like-a-baby** blueprint: Azure Postgres (Burstable) + Azure Cache for Redis + ACA, wired canon-clean.

---

# ✅ SilentApply Infra Blueprint (ACA + Postgres Flexible + Azure Redis)

## 1) Azure Resources (minimal, production-viable)

### Resource Group

* `rg-silentapply-prod` (and later `rg-silentapply-dev`)

### Networking

* `vnet-silentapply`

  * `subnet-aca` (delegated to ACA environment)
  * `subnet-private-endpoints`
  * `subnet-db` (if needed for Postgres private access)

**Goal:** app containers talk privately to Postgres/Redis.

### Compute

* **Azure Container Apps Environment**

  * `acae-silentapply`
  * Internal service-to-service comms supported
  * External ingress only for the web app

### Data

* **Azure Database for PostgreSQL – Flexible Server (Burstable)**

  * smallest burstable tier that meets your needs
  * private networking / firewall restricted to VNet (preferred)

* **Azure Cache for Redis**

  * Start **Basic** if you’re cost-sensitive; **Standard** if you want HA features later
  * TLS on (`rediss://`)

### Email sending

* Use your existing **Azure Communication Services Email** for outbound transactional email (magic links).

---

# 2) Environment Variables (Canon + NextAuth + Prisma)

In ACA app secrets/env:

### NextAuth

* `NEXTAUTH_URL=https://silentapply.ai`
* `NEXTAUTH_SECRET=<32+ bytes random>`
* `AUTH_TRUST_HOST=true` (sometimes needed in edge deployments; optional)

### Database

* `DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require`

### Redis

* `REDIS_URL=rediss://:<access_key>@<redis_host>:6380`

### Email (ACS Email)

Depends on how you call it, but typically:

* `ACS_CONNECTION_STRING=endpoint=https://...;accesskey=...`
* `EMAIL_FROM=no-reply@silentapply.ai` (or whatever sender you verify)

---

# 3) Canon Auth Tightening (NextAuth + Redis)

## Rate limit policy (locked)

* **3 sends / 15 minutes / email**
* Silent throttle on 4th attempt:

  * UI still “succeeds”
  * no email sent

## Redis key design

* Key: `sa:auth:email:<sha256(lower(email))>`
* TTL: 900 seconds
* Counter increments per attempt

### Pseudocode enforcement

* increment counter with TTL (atomic)
* if `count > 3` → return without sending

---

# 4) NextAuth Config (What to set)

In `app/api/auth/[...nextauth]/route.ts`:

### Pages

* `signIn: "/continue"`
* `verifyRequest: "/continue/check-email"`

### Email provider

* `maxAge: 15 * 60`
* custom `sendVerificationRequest` with:

  * canon email copy
  * redis throttle
  * *no thrown errors on rate limit*

### Cookies (recommended defaults)

* HttpOnly, Secure, SameSite=Lax
* NextAuth generally handles this; just ensure you’re not overriding weirdly.

---

# 5) Azure “don’t get cute” rules (reliability posture)

## Postgres

* Use SSL required (`sslmode=require`)
* Keep connections under control

  * Prisma can spike connections during dev; later you can add pooling (pgBouncer) if needed
* Backups: keep defaults; tune later

## Redis

* Use TLS (6380 / `rediss://`)
* Use it for:

  * rate limits
  * request throttles
  * short-lived abuse flags

Do **not** store canonical business data in Redis.

---

# 6) Deployment shape in ACA

### `silentapply-web`

* Next.js app (includes NextAuth routes)
* external ingress ON
* connects privately to DB/Redis

Optional later:

* `silentapply-worker` (for async tasks like booking emails, etc.)

---