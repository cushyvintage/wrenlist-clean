/**
 * Farewell email sent to a user immediately after they delete their
 * Wrenlist account. Confirms the deletion, thanks them, and invites an
 * honest reply — which lands in dom@wrenlist.com because the delete
 * route sets replyTo on the send.
 *
 * Design notes:
 * - Plain-HTML inline styles, matching welcome.ts, for cross-client fidelity
 * - No CTA button — the whole point is "you're leaving, we're not trying
 *   to win you back with a click"
 * - Soft sage/cream palette, same as every other transactional
 */
export function buildFarewellUserEmail(args: {
  firstName: string | null
}): { subject: string; html: string; text: string } {
  const greeting = args.firstName ? `Hi ${args.firstName},` : 'Hi there,'

  const subject = 'Sorry to see you go 🌿'

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
                Your Wrenlist account has been deleted, along with every find, listing, expense, and connection tied to it. Nothing is kept in the background.
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Thank you for giving it a try. Building this thing alone, for real UK resellers, means your feedback actually changes what gets built next.
              </p>

              <div style="margin:0 0 24px 0;padding:20px 24px;background-color:#faf8ef;border-left:3px solid #5a7a4a;border-radius:4px;">
                <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#2a2a2a;">
                  <strong>If there's anything I could have done better</strong> — the pricing, a missing feature, a bug that pushed you out, something the onboarding didn't make obvious — I'd really like to know.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#4a4a4a;">
                  Just hit reply. This email goes straight to me.
                </p>
              </div>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#7a7a7a;">
                — Dom, founder of Wrenlist
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#fafaf4;border-top:1px solid #eae6d8;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#9a9a9a;">Wrenlist is a SaaS for UK resellers.</p>
              <p style="margin:0;font-size:12px;color:#9a9a9a;">
                <a href="https://wrenlist.com" style="color:#5a7a4a;text-decoration:none;">wrenlist.com</a>
                &nbsp;·&nbsp;
                <a href="https://wrenlist.com/terms" style="color:#5a7a4a;text-decoration:none;">Terms</a>
                &nbsp;·&nbsp;
                <a href="https://wrenlist.com/privacy" style="color:#5a7a4a;text-decoration:none;">Privacy</a>
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

Your Wrenlist account has been deleted, along with every find, listing, expense, and connection tied to it. Nothing is kept in the background.

Thank you for giving it a try. Building this thing alone, for real UK resellers, means your feedback actually changes what gets built next.

If there's anything I could have done better — the pricing, a missing feature, a bug that pushed you out, something the onboarding didn't make obvious — I'd really like to know. Just hit reply. This email goes straight to me.

— Dom, founder of Wrenlist
`

  return { subject, html, text }
}
