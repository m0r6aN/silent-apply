import crypto from "crypto";
import { getRedis } from "@/lib/redis";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * SilentApply auth rate limit:
 * - 3 sends per 15 minutes per email (silent throttle)
 *
 * Returns true if sending is allowed, false if throttled.
 * Fails open on Redis errors (canon: do not block legitimate users due to infra).
 */
export async function allowAuthEmailSend(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const emailHash = sha256Hex(normalized);
  const key = `sa:auth:email:${emailHash}`;

  const windowSec = 15 * 60;
  const limit = 3;

  try {
    const redis = getRedis();

    // Atomic-ish pattern with TTL:
    // INCR returns the new count.
    // If first hit, set expiration.
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSec);
    }

    return count <= limit;
  } catch (err) {
    console.error("[auth] rate limit check failed (fail-open)", err);
    return true; // fail open
  }
}
