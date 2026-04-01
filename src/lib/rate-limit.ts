// Rate limiting for API routes
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
// Falls back to no-op if not configured (local dev)

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let ratelimit: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 req/min default
  })
}

export async function checkRateLimit(identifier: string, limit?: number): Promise<{ success: boolean; reset: number }> {
  if (!ratelimit) return { success: true, reset: 0 } // No-op if not configured

  // Create a new limiter with custom limit if provided
  let limiter = ratelimit

  if (limit) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, "1 m"),
    })
  }

  const result = await limiter.limit(identifier)
  return { success: result.success, reset: result.reset }
}
