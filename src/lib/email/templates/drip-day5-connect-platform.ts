/**
 * Drip email #2 — sent 5-7 days after signup to users who have added
 * at least one find but still haven't connected a marketplace.
 *
 * Template slug: "drip_day5_connect_platform"
 */
export function buildDripDay5ConnectPlatformEmail(args: {
  firstName: string | null
  appUrl: string
  unsubscribeUrl: string | null
}): { subject: string; html: string; text: string } {
  const greeting = args.firstName ? `Hi ${args.firstName},` : 'Hi there,'
  const connectUrl = `${args.appUrl}/platform-connect`
  const unsubFragmentHtml = args.unsubscribeUrl
    ? ` &nbsp;·&nbsp; <a href="${args.unsubscribeUrl}" style="color:#9a9a9a;text-decoration:underline;">Unsubscribe</a>`
    : ''
  const unsubFragmentText = args.unsubscribeUrl
    ? `\n\nUnsubscribe from follow-ups: ${args.unsubscribeUrl}`
    : ''

  const subject = 'One step away from your first sale'

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
            <td style="padding:28px 40px 20px 40px;text-align:center;border-bottom:1px solid #eae6d8;">
              <img src="https://app.wrenlist.com/wrenlist-logo-512.png" width="56" height="56" alt="Wrenlist" style="display:block;margin:0 auto 12px auto;border:0;">
              <h1 style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#2a2a2a;">Wrenlist</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px 0;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#2a2a2a;">${greeting}</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Good work adding your finds — they're sitting in Wrenlist right now, catalogued and ready.
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Next step: connect a marketplace. Wrenlist publishes to Vinted, eBay, Etsy, and more straight from your inventory, so once a platform's linked, going from "listed" to "sold" happens without you touching the marketplace UI.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="background-color:#5a7a4a;border-radius:6px;">
                    <a href="${connectUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">
                      Connect a marketplace →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#7a7a7a;">
                Vinted connects automatically via the Wrenlist Chrome extension — no API keys, no setup. eBay takes about two minutes via OAuth. The rest work the same way.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#7a7a7a;">
                — Dom
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background-color:#fafaf4;border-top:1px solid #eae6d8;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9a9a9a;">
                You're receiving this because you signed up for Wrenlist's Open Beta.${unsubFragmentHtml}
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

Good work adding your finds — they're sitting in Wrenlist right now, catalogued and ready.

Next step: connect a marketplace. Wrenlist publishes to Vinted, eBay, Etsy, and more straight from your inventory, so once a platform's linked, going from "listed" to "sold" happens without you touching the marketplace UI.

Connect a marketplace: ${connectUrl}

Vinted connects automatically via the Wrenlist Chrome extension — no API keys, no setup. eBay takes about two minutes via OAuth. The rest work the same way.

— Dom${unsubFragmentText}
`

  return { subject, html, text }
}
