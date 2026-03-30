/**
 * Marketplace API Retry Logic
 * Handles rate limiting, transient errors, and exponential backoff
 */

export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  shouldRetry?: (error: unknown, attemptNumber: number) => boolean
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
}

/**
 * Platform-specific retry configurations
 * Each platform has different rate limiting behaviors
 */
export const PLATFORM_RETRY_CONFIG: Record<string, RetryConfig> = {
  vinted: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    shouldRetry: (error, attempt) => {
      // Retry on 429 (rate limit) and 5xx errors
      if (error instanceof Error) {
        const message = error.message
        return message.includes('429') || message.includes('5')
      }
      return attempt < 3
    },
  },

  ebay: {
    maxRetries: 5,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    shouldRetry: (error, attempt) => {
      // eBay is stricter with rate limits
      if (error instanceof Error) {
        const message = error.message
        return message.includes('429') || message.includes('5')
      }
      return attempt < 5
    },
  },

  etsy: {
    maxRetries: 4,
    initialDelayMs: 1500,
    maxDelayMs: 45000,
    backoffMultiplier: 2,
    shouldRetry: (error, attempt) => {
      if (error instanceof Error) {
        const message = error.message
        return message.includes('429') || message.includes('5')
      }
      return attempt < 4
    },
  },

  shopify: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 20000,
    backoffMultiplier: 2,
    shouldRetry: (error, attempt) => {
      if (error instanceof Error) {
        const message = error.message
        return message.includes('429') || message.includes('5')
      }
      return attempt < 3
    },
  },
}

/**
 * Sleep utility for delays between retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(
  initialDelay: number,
  multiplier: number,
  maxDelay: number,
  attemptNumber: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attemptNumber)
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * (0.8 + Math.random() * 0.4)
  return Math.min(jitter, maxDelay)
}

/**
 * Retry wrapper with exponential backoff
 * Handles transient API failures gracefully
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      const shouldRetry = config.shouldRetry
        ? config.shouldRetry(error, attempt)
        : attempt < config.maxRetries

      if (!shouldRetry) {
        throw error
      }

      // Calculate delay and wait
      const delayMs = calculateBackoffDelay(
        config.initialDelayMs,
        config.backoffMultiplier,
        config.maxDelayMs,
        attempt
      )

      console.warn(
        `Attempt ${attempt + 1}/${config.maxRetries + 1} failed. Retrying in ${Math.round(delayMs)}ms...`,
        error instanceof Error ? error.message : error
      )

      await sleep(delayMs)
    }
  }

  throw new Error(
    `Failed after ${config.maxRetries + 1} attempts: ${
      lastError instanceof Error ? lastError.message : 'Unknown error'
    }`
  )
}

/**
 * Batch retry for multiple operations
 * Useful for syncing multiple listings with retry logic
 */
export async function retryBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ results: R[]; errors: Array<{ item: T; error: unknown }> }> {
  const results: R[] = []
  const errors: Array<{ item: T; error: unknown }> = []

  for (const item of items) {
    try {
      const result = await retryWithBackoff(() => fn(item), config)
      results.push(result)
    } catch (error) {
      errors.push({ item, error })
    }
  }

  return { results, errors }
}

/**
 * Create a rate-limited queue for API operations
 * Prevents overwhelming APIs with concurrent requests
 */
export class RateLimitedQueue {
  private queue: Array<() => Promise<unknown>> = []
  private processing = false
  private delayMs: number

  constructor(requestsPerSecond: number = 1) {
    this.delayMs = Math.round(1000 / requestsPerSecond)
  }

  /**
   * Add task to queue
   */
  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.process()
    })
  }

  /**
   * Process queue items with rate limiting
   */
  private async process(): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        try {
          await task()
        } catch (error) {
          console.error('Queue task error:', error)
        }
        await sleep(this.delayMs)
      }
    }

    this.processing = false
  }
}

/**
 * Circuit breaker for API endpoints
 * Prevents cascading failures when APIs are down
 */
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime: number | null = null
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failureThreshold: number
  private resetTimeoutMs: number

  constructor(failureThreshold: number = 5, resetTimeoutMs: number = 60000) {
    this.failureThreshold = failureThreshold
    this.resetTimeoutMs = resetTimeoutMs
  }

  /**
   * Execute wrapped function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If circuit is open, check if we should half-open
    if (this.state === 'open') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open - API endpoint unavailable')
      }
    }

    try {
      const result = await fn()

      // Success - reset the circuit
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failureCount = 0
        this.lastFailureTime = null
      }

      return result
    } catch (error) {
      // Failure - increment counter and potentially open circuit
      this.failureCount += 1
      this.lastFailureTime = Date.now()

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open'
      }

      throw error
    }
  }

  /**
   * Get circuit state (for monitoring)
   */
  getState(): string {
    return this.state
  }

  /**
   * Reset circuit manually
   */
  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.lastFailureTime = null
  }
}
