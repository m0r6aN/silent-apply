const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile(".env");
    }
  } catch {}
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false"
      ? { rejectUnauthorized: false }
      : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful");

    // Try a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);

    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection error:", error instanceof Error ? error.message : String(error));
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

testConnection();
