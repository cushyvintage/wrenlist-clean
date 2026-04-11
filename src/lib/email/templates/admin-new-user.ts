/**
 * Internal notification sent to the Wrenlist admin email address whenever
 * a brand-new user signs up. Low-fi by design — we want the signal, not
 * a polished marketing email.
 */
export function buildAdminNewUserEmail(args: {
  fullName: string | null
  email: string
  signupMethod: 'email' | 'google' | 'github' | string
  userId: string
  signedUpAt: Date
}): { subject: string; html: string; text: string } {
  const displayName = args.fullName?.trim() || args.email.split('@')[0] || args.email
  const subject = `🌿 New Wrenlist signup: ${displayName}`

  const formattedTime = args.signedUpAt.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

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
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border:1px solid #d4d9c9;border-radius:8px;padding:32px;">
          <tr>
            <td style="text-align:center;padding-bottom:20px;">
              <img src="https://app.wrenlist.com/wrenlist-logo-512.png" width="40" height="40" alt="Wrenlist" style="display:inline-block;border:0;">
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0 0 8px 0;font-size:13px;color:#7a7a7a;text-transform:uppercase;letter-spacing:1px;">New signup</p>
              <h1 style="margin:0 0 24px 0;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#2a2a2a;">
                ${escapeHtml(displayName)} just joined Wrenlist.
              </h1>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#4a4a4a;">
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;width:100px;">Email</td>
                  <td style="padding:8px 0;"><strong>${escapeHtml(args.email)}</strong></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;">Name</td>
                  <td style="padding:8px 0;">${args.fullName ? escapeHtml(args.fullName) : '<em style="color:#9a9a9a;">not provided</em>'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;">Method</td>
                  <td style="padding:8px 0;">${escapeHtml(args.signupMethod)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;">When</td>
                  <td style="padding:8px 0;">${escapeHtml(formattedTime)} (London)</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9a9a9a;">User ID</td>
                  <td style="padding:8px 0;font-family:ui-monospace,'SF Mono',Monaco,Menlo,monospace;font-size:12px;color:#7a7a7a;">${escapeHtml(args.userId)}</td>
                </tr>
              </table>

              <p style="margin:32px 0 0 0;padding-top:16px;border-top:1px solid #eae6d8;font-size:12px;color:#9a9a9a;">
                Automatic notification from <a href="https://app.wrenlist.com" style="color:#5a7a4a;text-decoration:none;">Wrenlist</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `New Wrenlist signup

${displayName} just joined.

Email:   ${args.email}
Name:    ${args.fullName || '(not provided)'}
Method:  ${args.signupMethod}
When:    ${formattedTime} (London)
User ID: ${args.userId}
`

  return { subject, html, text }
}

/** Tiny HTML escaper for interpolated values in email templates. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
