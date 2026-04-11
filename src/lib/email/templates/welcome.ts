/**
 * Welcome email sent to a brand-new user right after they sign up.
 *
 * Design notes:
 * - Kept intentionally plain-HTML (inline styles only) so it renders
 *   identically across Gmail, Outlook, Apple Mail, and mobile clients.
 * - Sage/cream palette matching the app's visual identity.
 * - Single primary CTA → onboarding page. Secondary links below.
 */
export function buildWelcomeEmail(args: {
  firstName: string | null
  appUrl: string
}): { subject: string; html: string; text: string } {
  const greeting = args.firstName ? `Hi ${args.firstName},` : 'Hi there,'
  const onboardingUrl = `${args.appUrl}/onboarding`

  const subject = args.firstName
    ? `Welcome to Wrenlist, ${args.firstName} 🌿`
    : 'Welcome to Wrenlist 🌿'

  const html = /* html */ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f1e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2a2a2a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f1e8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #d4d9c9;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px 40px;text-align:center;border-bottom:1px solid #eae6d8;">
              <img src="https://app.wrenlist.com/wrenlist-logo-512.png" width="56" height="56" alt="Wrenlist" style="display:block;margin:0 auto 12px auto;border:0;">
              <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:normal;color:#2a2a2a;">Wrenlist</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#7a7a7a;">The operating system for thrifters</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <h2 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:24px;font-weight:normal;color:#2a2a2a;">${greeting}</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Welcome to Wrenlist. You're officially in the Open Beta — all features unlocked, no card needed, nothing to pay for three months.
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Here's the quickest path to your first sale: connect a marketplace, add a find (the AI will do most of the work), and publish. Less than a minute end-to-end.
              </p>

              <!-- Primary CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px 0;">
                <tr>
                  <td align="center" style="background-color:#5a7a4a;border-radius:6px;">
                    <a href="${onboardingUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">
                      Open Wrenlist →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#7a7a7a;">
                <strong style="color:#4a4a4a;">A small favour:</strong> this is Open Beta. Everything you love, everything that's broken, everything that's missing — just reply to this email. I read every message.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#7a7a7a;">
                — Dom, founder
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#fafaf4;border-top:1px solid #eae6d8;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#9a9a9a;">Wrenlist is a SaaS for UK resellers.</p>
              <p style="margin:0;font-size:12px;color:#9a9a9a;">
                <a href="${args.appUrl}" style="color:#5a7a4a;text-decoration:none;">wrenlist.com</a>
                &nbsp;·&nbsp;
                <a href="${args.appUrl}/terms" style="color:#5a7a4a;text-decoration:none;">Terms</a>
                &nbsp;·&nbsp;
                <a href="${args.appUrl}/privacy" style="color:#5a7a4a;text-decoration:none;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${greeting}

Welcome to Wrenlist. You're officially in the Open Beta — all features unlocked, no card needed, nothing to pay for three months.

Here's the quickest path to your first sale: connect a marketplace, add a find (the AI will do most of the work), and publish. Less than a minute end-to-end.

Open Wrenlist: ${onboardingUrl}

A small favour: this is Open Beta. Everything you love, everything that's broken, everything that's missing — just reply to this email. I read every message.

— Dom, founder
`

  return { subject, html, text }
}
