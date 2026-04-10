/**
 * Drip email #3 — sent 14-18 days after signup to anyone who's still
 * around (regardless of whether they've added a find or connected a
 * platform). Pure feedback ask, no CTA, signed personally.
 *
 * Template slug: "drip_day14_feedback"
 */
export function buildDripDay14FeedbackEmail(args: {
  firstName: string | null
  appUrl: string
  unsubscribeUrl: string | null
}): { subject: string; html: string; text: string } {
  const greeting = args.firstName ? `Hi ${args.firstName},` : 'Hi there,'
  const unsubFragmentHtml = args.unsubscribeUrl
    ? ` &nbsp;·&nbsp; <a href="${args.unsubscribeUrl}" style="color:#9a9a9a;text-decoration:underline;">Unsubscribe</a>`
    : ''
  const unsubFragmentText = args.unsubscribeUrl
    ? `\n\nUnsubscribe from follow-ups: ${args.unsubscribeUrl}`
    : ''

  const subject = args.firstName
    ? `Quick question for you, ${args.firstName}`
    : 'Quick question for you'

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
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px 0;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#2a2a2a;">${greeting}</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                You've had Wrenlist for a couple of weeks now. I wanted to check in — not to sell you on anything, I just want to know what's working and what isn't.
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                <strong>One question:</strong> if you had to describe Wrenlist to another reseller in one sentence, what would you say? And if it's "I haven't really used it yet", that's fine too — tell me why.
              </p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#4a4a4a;">
                Just hit reply. Every beta user's answer shapes what I build next.
              </p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#4a4a4a;">
                Thanks for being here,
              </p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#4a4a4a;">
                Dom
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

You've had Wrenlist for a couple of weeks now. I wanted to check in — not to sell you on anything, I just want to know what's working and what isn't.

One question: if you had to describe Wrenlist to another reseller in one sentence, what would you say? And if it's "I haven't really used it yet", that's fine too — tell me why.

Just hit reply. Every beta user's answer shapes what I build next.

Thanks for being here,
Dom${unsubFragmentText}
`

  return { subject, html, text }
}
