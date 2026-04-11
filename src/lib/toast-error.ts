import { toast } from 'sonner'

/**
 * Normalise an arbitrary thrown value into a user-friendly string and show
 * a toast. Never surfaces raw HTTP status codes, stack traces, or JSON blobs.
 *
 * Usage:
 *   try { await fetchApi('/api/finds') }
 *   catch (err) { showError(err, 'Could not load finds') }
 */
export function showError(err: unknown, fallback = 'Something went wrong. Please try again.'): void {
  const message = extractMessage(err, fallback)
  toast.error(message)
}

export function showSuccess(message: string): void {
  toast.success(message)
}

function extractMessage(err: unknown, fallback: string): string {
  if (!err) return fallback

  if (typeof err === 'string') return cleanMessage(err, fallback)

  if (err instanceof Error) return cleanMessage(err.message, fallback)

  if (typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message
    if (typeof m === 'string') return cleanMessage(m, fallback)
  }

  return fallback
}

function cleanMessage(raw: string, fallback: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return fallback

  // Strip `API error: 500 Internal Server Error` style from fetchApi wrapper.
  const apiErrorMatch = trimmed.match(/^API error:\s*(\d{3})\s*(.*)$/i)
  if (apiErrorMatch) {
    const status = apiErrorMatch[1] ?? ''
    if (status === '401') return 'You need to sign in to do that.'
    if (status === '402') return 'Plan limit reached. Upgrade to continue.'
    if (status === '403') return "You don't have permission to do that."
    if (status === '404') return 'Not found.'
    if (status === '429') return 'Too many requests — please wait a moment.'
    if (status.startsWith('5')) return 'Our servers had a hiccup. Please try again.'
    return fallback
  }

  // Reject things that look like raw JSON, HTML, or stack traces.
  if (trimmed.startsWith('{') || trimmed.startsWith('<') || trimmed.includes('\n    at ')) {
    return fallback
  }

  // Cap length so nothing cartoonish lands in the toast.
  if (trimmed.length > 200) return trimmed.slice(0, 197) + '…'

  return trimmed
}
