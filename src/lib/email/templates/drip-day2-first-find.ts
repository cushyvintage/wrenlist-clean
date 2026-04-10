/**
 * Drip email #1 — sent 48 hours after signup to users who haven't added
 * their first find yet. Intentionally low-pressure, signed personally by
 * Dom, and with a single clear CTA.
 *
 * Template slug: "drip_day2_first_find"
 */
export function buildDripDay2FirstFindEmail(args: {
  firstName: string | null
  appUrl: string
  unsubscribeUrl: string | null
}): { subject: string; html: string; text: string } {
  const greeting = args.firstName ? `Hi ${args.firstName},` : 'Hi there,'
  const addFindUrl = `${args.appUrl}/add-find`
  const unsubFragmentHtml = args.unsubscribeUrl
    ? ` &nbsp;·&nbsp; <a href="${args.unsubscribeUrl}" style="color:#9a9a9a;text-decoration:underline;">Unsubscribe</a>`
    : ''
  const unsubFragmentText = args.unsubscribeUrl
    ? `\n\nUnsubscribe from follow-ups: ${args.unsubscribeUrl}`
    : ''

  const subject = args.firstName
    ? `${args.firstName}, ready for your first Wrenlist find?`
    : 'Ready for your first Wrenlist find?'

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
              <img src="https://wrenlist.com/wrenlist-logo.png" alt="Wrenlist" width="48" height="48" style="display:block;margin:0 auto 10px auto;border-radius:8px;" />
              <h1 style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#2a2a2a;">Wrenlist</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px 0;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#2a2a2a;">${greeting}</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Noticed you signed up a couple of days ago but haven't added a find yet. That's totally fine — no pressure, beta's on for three months.
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                But in case you're stuck: the fastest way to get a feel for Wrenlist is to grab one thing off your shelf, snap a photo, and let the AI fill in the rest. Title, description, category, suggested price — it takes about 30 seconds.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="background-color:#5a7a4a;border-radius:6px;">
                    <a href="${addFindUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">
                      Add your first find →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#7a7a7a;">
                If something's blocking you or not clicking, hit reply and tell me — I want to fix it.
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

Noticed you signed up a couple of days ago but haven't added a find yet. That's totally fine — no pressure, beta's on for three months.

But in case you're stuck: the fastest way to get a feel for Wrenlist is to grab one thing off your shelf, snap a photo, and let the AI fill in the rest. Title, description, category, suggested price — it takes about 30 seconds.

Add your first find: ${addFindUrl}

If something's blocking you or not clicking, hit reply and tell me — I want to fix it.

— Dom${unsubFragmentText}
`

  return { subject, html, text }
}
