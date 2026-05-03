/**
 * Race a promise against a timeout. If the promise hasn't resolved by the
 * deadline, return `fallback` instead. The underlying promise keeps running
 * — Node will eventually settle it — but we stop waiting.
 *
 * Used for pre-passes in the identify pipeline: any vendor (eBay, Google
 * Vision, OpenAI) being slow shouldn't drag the whole identify call past
 * Vercel's function timeout. A slow pre-pass falls back to "no signal from
 * this layer", and the identifier proceeds with whatever else made it back.
 *
 * Pass `label` to make timeout warnings findable in logs.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label = 'unnamed',
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[withTimeout] ${label} exceeded ${ms}ms — falling back`)
      resolve(fallback)
    }, ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}
