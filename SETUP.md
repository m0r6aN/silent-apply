# SilentApply Local Development Setup

## Prerequisites

- Node.js 20+
- PostgreSQL (local or Azure)
- Redis (local or Azure Cache for Redis)
- Azure Communication Services account (for email)

---

## 1. Environment Configuration

### Create `.env` file

```bash
cp .env.example .env
```

### Fill in required values

#### **DATABASE_URL** (Required)

**Local PostgreSQL:**
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/silentapply
```

**Azure PostgreSQL:**
```bash
DATABASE_URL=postgresql://user:password@your-server.postgres.database.azure.com:5432/silentapply?sslmode=require
```

#### **REDIS_URL** (Required)

**Local Redis:**
```bash
REDIS_URL=redis://localhost:6379
```

**Azure Cache for Redis:**
```bash
REDIS_URL=rediss://:your-access-key@your-redis.redis.cache.windows.net:6380
```

#### **NEXTAUTH_SECRET** (Required)

Generate a secure secret:
```bash
openssl rand -base64 32
```

Then set:
```bash
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=http://localhost:3000
```

#### **Email Configuration** (Required)

Azure Communication Services SMTP:
```bash
EMAIL_SERVER_HOST=your-acs-endpoint.communication.azure.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-acs-smtp-username
EMAIL_SERVER_PASSWORD=your-acs-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

---

## 2. Database Setup

### Install dependencies

```bash
npm install
```

### Run Prisma migrations

```bash
npx prisma migrate dev
```

### Generate Prisma client

```bash
npx prisma generate
```

---

## 3. Verify Setup

### Test database connection

```bash
node test-db.js
```

### Start development server

```bash
npm run dev
```

Visit: http://localhost:3000

---

## 4. Azure Communication Services Setup

### Create ACS Resource

1. Go to Azure Portal
2. Create "Communication Services" resource
3. Navigate to "Email" → "Provision Domains"
4. Add and verify your domain (SPF, DKIM records)

### Get SMTP Credentials

1. In ACS resource, go to "Email" → "MailFrom addresses"
2. Click "Connect" → "SMTP"
3. Copy credentials to `.env`

### Verify Email Sending

Test with:
```bash
npm run test:email
```

---

## Common Issues

### `DATABASE_URL is required`

**Solution:** Ensure `.env` file exists and contains valid `DATABASE_URL`

### `Redis connection failed`

**Solution:** 
- Local: Start Redis with `redis-server`
- Azure: Verify access key and enable TLS (port 6380)

### Email not sending

**Solution:**
- Verify domain in ACS
- Check SPF/DKIM DNS records
- Confirm SMTP credentials

---

## Production Deployment

See: `docs/internal/SilentApply_Infra_Blueprint.md`

Required Azure services:
- Azure Container Apps
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Azure Communication Services (Email)
- Azure Blob Storage (optional, for resume uploads)

