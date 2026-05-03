/**
 * Subscription welcome — sent the first time someone successfully pays for
 * a paid plan (Nester / Forager / Flock). Triggered by the Stripe webhook
 * on checkout.session.completed.
 *
 * Voice: warm, founder-to-founder, no corporate gloss. Highlights the
 * Founding Flock badge if applicable.
 */

type TierLabel = 'Nester' | 'Forager' | 'Flock'

export function buildSubscriptionWelcomeEmail(args: {
  firstName: string | null
  appUrl: string
  tier: TierLabel
  isFoundingMember: boolean
  findsLimit: number
}): { subject: string; html: string; text: string } {
  const greeting = args.firstName ? `Hi ${args.firstName},` : 'Hi there,'
  const onboardingUrl = `${args.appUrl}/onboarding`
  const findsUrl = `${args.appUrl}/finds`

  const foundingBadge = args.isFoundingMember
    ? `<p style="margin:0 0 24px 0;padding:12px 16px;background-color:#f5edd6;border-left:3px solid #c89a4a;font-size:14px;line-height:1.5;color:#6b4f1f;">
         <strong>Founding Flock member.</strong> Your price is locked for life — even after the standard rate kicks in on 30 June 2026.
       </p>`
    : ''

  const subject = args.isFoundingMember
    ? `You're in the Founding Flock 🌿 (${args.tier})`
    : `Welcome to ${args.tier} 🌿`

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
              <img src="${args.appUrl}/wrenlist-logo-512.png" width="56" height="56" alt="Wrenlist" style="display:block;margin:0 auto 12px auto;border:0;">
              <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:normal;color:#2a2a2a;">Wrenlist</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#7a7a7a;">The operating system for thrifters</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <h2 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:24px;font-weight:normal;color:#2a2a2a;">${greeting}</h2>
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Thank you. Genuinely. You just unlocked <strong>${args.tier}</strong> — ${args.findsLimit.toLocaleString()} finds a month, every supported marketplace, AI listing assist on every find, full margin and ROI analytics.
              </p>

              ${foundingBadge}

              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Three things to do first:
              </p>
              <ol style="margin:0 0 32px 0;padding-left:20px;font-size:15px;line-height:1.8;color:#4a4a4a;">
                <li>Connect a marketplace (Vinted, eBay, Etsy, Depop — all included)</li>
                <li>Add your first find — drop a photo and the AI does the rest</li>
                <li><a href="https://chromewebstore.google.com/detail/wrenlist-marketplace-sy/aahdngccjdbaliejnbmhbacjgecldffn" style="color:#5a7a4a;">Install the Chrome extension</a> for one-click crosslisting</li>
              </ol>

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

              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#7a7a7a;">
                <strong style="color:#4a4a4a;">One favour:</strong> if anything's broken, confusing, or you wish Wrenlist did something it doesn't — reply to this email. I'm building this for resellers like you, and I read every message.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#7a7a7a;">
                — Dom, founder
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#fafaf4;border-top:1px solid #eae6d8;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#9a9a9a;">Wrenlist · ${args.tier} plan · ${args.findsLimit.toLocaleString()} finds / month</p>
              <p style="margin:0;font-size:12px;color:#9a9a9a;">
                <a href="${args.appUrl}/billing" style="color:#5a7a4a;text-decoration:none;">Manage billing</a>
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

Thank you. Genuinely. You just unlocked ${args.tier} — ${args.findsLimit.toLocaleString()} finds a month, every supported marketplace, AI listing assist on every find, full margin and ROI analytics.

${args.isFoundingMember ? `You're a Founding Flock member — your price is locked for life, even after the standard rate kicks in on 30 June 2026.\n\n` : ''}Three things to do first:
1. Connect a marketplace (Vinted, eBay, Etsy, Depop — all included)
2. Add your first find — drop a photo and the AI does the rest
3. Install the Chrome extension for one-click crosslisting: https://chromewebstore.google.com/detail/wrenlist-marketplace-sy/aahdngccjdbaliejnbmhbacjgecldffn

Open Wrenlist: ${onboardingUrl}

One favour: if anything's broken, confusing, or you wish Wrenlist did something it doesn't — reply to this email. I'm building this for resellers like you, and I read every message.

— Dom, founder

Manage billing: ${args.appUrl}/billing
`

  return { subject, html, text }
}
