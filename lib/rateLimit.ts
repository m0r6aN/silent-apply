/**
 * SilentApply Rate Limiting (Canon-Compliant)
 *
 * All rate limits are QUIET:
 * - No CAPTCHAs
 * - No "you are blocked" messages
 * - Silent suppression on abuse
 *
 * Fails open on Redis errors (do not block legitimate users due to infra).
 */

import crypto from 'crypto';
import { getRedis } from '@/lib/redis';

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds
}

/**
 * Generic rate limiter with quiet semantics
 */
async function checkRateLimit(
  keyPrefix: string,
  identifier: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const identifierHash = sha256Hex(identifier);
  const key = `${keyPrefix}:${identifierHash}`;

  try {
    const redis = getRedis();
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSec);
    }

    const ttl = await redis.ttl(key);

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetIn: ttl > 0 ? ttl : windowSec,
    };
  } catch (err) {
    console.error(`[rateLimit] ${keyPrefix} check failed (fail-open)`, err);
    // Fail open
    return {
      allowed: true,
      remaining: limit,
      resetIn: windowSec,
    };
  }
}

/**
 * Q&A rate limit per profile
 * Canon: Progressive quiet throttling
 * - 10 questions per 15 minutes per profile
 */
export async function allowQAQuestion(profileId: string): Promise<RateLimitResult> {
  return checkRateLimit('sa:qa:profile', profileId, 10, 15 * 60);
}

/**
 * Q&A rate limit per IP
 * Canon: Progressive quiet throttling
 * - 20 questions per 15 minutes per IP
 */
export async function allowQAQuestionByIP(ip: string): Promise<RateLimitResult> {
  return checkRateLimit('sa:qa:ip', ip, 20, 15 * 60);
}

/**
 * Booking hold rate limit per profile
 * Canon: Prevent calendar sniping
 * - 5 holds per 15 minutes per profile
 */
export async function allowBookingHold(profileId: string): Promise<RateLimitResult> {
  return checkRateLimit('sa:booking:profile', profileId, 5, 15 * 60);
}

/**
 * Booking hold rate limit per IP
 * Canon: Prevent abuse
 * - 10 holds per 15 minutes per IP
 */
export async function allowBookingHoldByIP(ip: string): Promise<RateLimitResult> {
  return checkRateLimit('sa:booking:ip', ip, 10, 15 * 60);
}

/**
 * Get client IP from request headers
 * Handles common proxy headers
 */
export function getClientIP(headers: Headers): string {
  // Try common proxy headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}
