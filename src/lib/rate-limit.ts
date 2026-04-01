// Rate limiting for API routes
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
// Falls back to no-op if not configured (local dev)

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let redis: Redis | null = null
const limiters = new Map<number, Ratelimit>()

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

function getLimiter(requestsPerMinute: number): Ratelimit | null {
  const r = getRedis()
  if (!r) return null
  if (!limiters.has(requestsPerMinute)) {
    limiters.set(requestsPerMinute, new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(requestsPerMinute, "1 m"),
    }))
  }
  return limiters.get(requestsPerMinute)!
}

export async function checkRateLimit(
  identifier: string,
  requestsPerMinute = 20
): Promise<{ success: boolean; reset: number }> {
  const limiter = getLimiter(requestsPerMinute)
  if (!limiter) return { success: true, reset: 0 } // No-op if not configured
  const result = await limiter.limit(identifier)
  return { success: result.success, reset: result.reset }
}
