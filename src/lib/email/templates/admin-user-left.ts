/**
 * Internal notification sent to dom@wrenlist.com whenever a user deletes
 * their account. Mirrors the admin-new-user template pattern — low-fi,
 * table-of-facts layout, designed for a fast glance from an inbox.
 *
 * Captures the feedback form payload so we can spot patterns:
 *   - "Too expensive" spikes → pricing problem
 *   - "Just testing it out" churning at day 1 → onboarding problem
 *   - Consistent mentions of a named alternative tool → competitive gap
 */
export function buildAdminUserLeftEmail(args: {
  fullName: string | null
  email: string
  plan: string
  userId: string
  reason: string
  feedback: string | null
  alternativeTool: string | null
  leftAt: Date
}): { subject: string; html: string; text: string } {
  const displayName = args.fullName?.trim() || args.email.split('@')[0] || args.email
  const subject = `⚠️ User left Wrenlist: ${displayName} — ${args.reason}`

  const formattedTime = args.leftAt.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const feedbackHtml = args.feedback
    ? `<div style="margin-top:8px;padding:12px 16px;background-color:#faf8ef;border-left:3px solid #5a7a4a;border-radius:4px;font-size:14px;line-height:1.6;color:#2a2a2a;white-space:pre-wrap;">${escapeHtml(args.feedback)}</div>`
    : '<em style="color:#9a9a9a;">no feedback left</em>'

  const html = /* html */ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f1e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2a2a2a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f1e8;padding:32px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #d4d9c9;border-radius:8px;padding:32px;">
          <tr>
            <td style="text-align:center;padding-bottom:20px;">
              <img src="https://app.wrenlist.com/wrenlist-logo-512.png" width="40" height="40" alt="Wrenlist" style="display:inline-block;border:0;">
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0 0 8px 0;font-size:13px;color:#b04a3a;text-transform:uppercase;letter-spacing:1px;">Account deleted</p>
              <h1 style="margin:0 0 24px 0;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#2a2a2a;">
                ${escapeHtml(displayName)} left Wrenlist.
              </h1>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#4a4a4a;">
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;width:120px;vertical-align:top;">Email</td>
                  <td style="padding:8px 0;"><strong>${escapeHtml(args.email)}</strong></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;vertical-align:top;">Name</td>
                  <td style="padding:8px 0;">${args.fullName ? escapeHtml(args.fullName) : '<em style="color:#9a9a9a;">not provided</em>'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;vertical-align:top;">Plan</td>
                  <td style="padding:8px 0;">${escapeHtml(args.plan)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;vertical-align:top;">Reason</td>
                  <td style="padding:8px 0;"><strong style="color:#2a2a2a;">${escapeHtml(args.reason)}</strong></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;vertical-align:top;">Using instead</td>
                  <td style="padding:8px 0;">${args.alternativeTool ? escapeHtml(args.alternativeTool) : '<em style="color:#9a9a9a;">not provided</em>'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;vertical-align:top;">When</td>
                  <td style="padding:8px 0;">${escapeHtml(formattedTime)} (London)</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;vertical-align:top;">User ID</td>
                  <td style="padding:8px 0;font-family:ui-monospace,'SF Mono',Monaco,Menlo,monospace;font-size:12px;color:#7a7a7a;">${escapeHtml(args.userId)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;vertical-align:top;">Feedback</td>
                  <td style="padding:8px 0;">${feedbackHtml}</td>
                </tr>
              </table>

              <p style="margin:32px 0 0 0;padding-top:16px;border-top:1px solid #eae6d8;font-size:12px;color:#9a9a9a;">
                Automatic notification from <a href="https://app.wrenlist.com" style="color:#5a7a4a;text-decoration:none;">Wrenlist</a>.
                The user's data has already been permanently deleted (UK GDPR Article 17).
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Account deleted

${displayName} left Wrenlist.

Email:          ${args.email}
Name:           ${args.fullName || '(not provided)'}
Plan:           ${args.plan}
Reason:         ${args.reason}
Using instead:  ${args.alternativeTool || '(not provided)'}
When:           ${formattedTime} (London)
User ID:        ${args.userId}

Feedback:
${args.feedback || '(no feedback left)'}

The user's data has already been permanently deleted (UK GDPR Article 17).
`

  return { subject, html, text }
}

/** Tiny HTML escaper for interpolated values. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
