import { Resend } from 'resend'

/**
 * Resend email client — instantiated lazily so it's only constructed when
 * actually needed (avoids failing at module load if the env var isn't set
 * during a partial deployment).
 */
let cachedClient: Resend | null = null

function getClient(): Resend | null {
  if (cachedClient) return cachedClient

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is not set — email will not be sent')
    return null
  }

  cachedClient = new Resend(apiKey)
  return cachedClient
}

export interface SendEmailArgs {
  to: string | string[]
  subject: string
  html: string
  /** Plain-text fallback. If omitted, Resend strips tags from the HTML. */
  text?: string
  /** Override the default from address. */
  from?: string
  /** Optional reply-to. */
  replyTo?: string
  /** Tags for Resend analytics. */
  tags?: Array<{ name: string; value: string }>
}

const DEFAULT_FROM =
  process.env.EMAIL_FROM || 'Wrenlist <dom@wrenlist.com>'

/**
 * Send a single transactional email via Resend.
 *
 * Returns { ok: true, id } on success, { ok: false, error } on failure.
 * Never throws — email sends should not block the caller's main flow
 * (signup, onboarding, etc.). Log failures and move on.
 */
export async function sendEmail(
  args: SendEmailArgs,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const client = getClient()
  if (!client) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const { data, error } = await client.emails.send({
      from: args.from || DEFAULT_FROM,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
      tags: args.tags,
    })

    if (error) {
      console.error('[email] Resend API error:', error)
      return { ok: false, error: error.message || 'Unknown Resend error' }
    }

    if (!data?.id) {
      return { ok: false, error: 'Resend returned no message id' }
    }

    return { ok: true, id: data.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[email] sendEmail threw:', err)
    return { ok: false, error: message }
  }
}
