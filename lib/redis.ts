import { Redis } from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __saRedis: Redis | undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

/**
 * Redis client (singleton) for SilentApply.
 * Uses REDIS_URL (recommended: rediss://... for Azure Cache for Redis).
 */
export function getRedis(): Redis {
  if (global.__saRedis) return global.__saRedis;

  const url = requireEnv("REDIS_URL");
  const redis = new Redis(url, {
    // Azure Cache for Redis: keep connections stable
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redis.on("error", (err) => {
    // Quiet logging only. Do not throw; auth must remain calm.
    console.error("[redis] error", err?.message ?? err);
  });

  global.__saRedis = redis;
  return redis;
}
