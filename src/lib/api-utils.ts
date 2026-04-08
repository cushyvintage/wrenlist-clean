/**
 * Unwrap ApiResponseHelper envelope.
 * Handles multiple nesting levels: { data: { data: T } }, { data: T }, or raw T
 */
export function unwrapApiResponse<T>(result: unknown): T {
  if (!result || typeof result !== 'object') {
    return result as T
  }

  const obj = result as { data?: unknown }

  // Check if result has a `data` property
  if ('data' in obj && obj.data !== null && typeof obj.data === 'object') {
    const inner = obj.data as { data?: unknown }

    // Check for double-wrapped response
    if ('data' in inner) {
      return inner.data as T
    }

    // Single-wrapped response
    return inner as T
  }

  // No wrapper, return as-is
  return result as T
}

/**
 * Type-safe API fetch wrapper with automatic response unwrapping
 */
export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  return unwrapApiResponse<T>(json)
}

/**
 * Parse an error response body and throw with the API's error message.
 * Falls back to `fallback` if the body isn't JSON or doesn't contain `error`.
 */
export async function parseApiError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}))
  throw new Error((body as { error?: string }).error || fallback)
}
