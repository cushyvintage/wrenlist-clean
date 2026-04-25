/**
 * Waitlist welcome email — sent immediately after a user joins the pre-launch waitlist.
 * Indie founder voice. Validates the problem, sets expectations, hands them a referral link.
 */
export function buildWaitlistWelcomeEmail(args: {
  firstName: string | null
  painPoint: string | null
  referralUrl: string
  unsubscribeUrl: string | null
}): { subject: string; html: string; text: string } {
  const greeting = args.firstName ? `Hi ${args.firstName},` : 'Hi there,'

  // Echo their pain back at them when we have one — small touch, big "they get me" moment.
  const painLine = formatPainLine(args.painPoint)

  const subject = "You're on the list — here's why I built Wrenlist"

  const unsubFooter = args.unsubscribeUrl
    ? `<p style="margin:8px 0 0 0;font-size:11px;color:#9a9a9a;">Don't want these emails? <a href="${args.unsubscribeUrl}" style="color:#9a9a9a;">Unsubscribe</a>.</p>`
    : ''

  const html = /* html */ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f1e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2a2a2a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f1e8;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #d4d9c9;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:32px 40px 24px 40px;text-align:center;border-bottom:1px solid #eae6d8;">
          <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:normal;color:#2a2a2a;">Wrenlist</h1>
          <p style="margin:4px 0 0 0;font-size:13px;color:#7a7a7a;">For people who sell what they find</p>
        </td></tr>

        <tr><td style="padding:36px 40px 28px 40px;">
          <h2 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#2a2a2a;">${greeting}</h2>

          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#3a3a3a;">
            You're in. Welcome.
          </p>

          ${painLine}

          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#3a3a3a;">
            Quick story on why this exists. I sell vintage on the side. I love the sourcing part — the treasure hunt. What I don't love is then spending another evening copying the same listing into multiple apps, fighting with category pickers, and forgetting to take down the listing on one platform when it sells on another.
          </p>

          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#3a3a3a;">
            Wrenlist is the tool I wished existed. One inventory. Crosspost in a click. Auto-delist when something sells. Tax-ready records at year-end.
          </p>

          <p style="margin:0 0 24px 0;font-size:16px;line-height:1.65;color:#3a3a3a;">
            We're putting the finishing touches on the Chrome extension and waiting on the store review. Should be a few weeks. I'll keep you posted with a few short emails between now and beta launch — what we're building, why, and how it'll fit into your selling routine.
          </p>

          <!-- Referral block -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;background-color:#fafaf4;border:1px solid #eae6d8;border-radius:6px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#5a7a4a;letter-spacing:.04em;text-transform:uppercase;">Bring a friend, both win</p>
              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.55;color:#4a4a4a;">
                Share your link. When a fellow reseller signs up, you both jump the beta queue and get a lifetime discount when paid plans launch.
              </p>
              <p style="margin:0 0 12px 0;font-size:13px;background-color:#ffffff;border:1px dashed #d4d9c9;border-radius:4px;padding:10px 12px;color:#3a3a3a;font-family:Menlo,Consolas,monospace;word-break:break-all;">
                ${args.referralUrl}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="background-color:#5a7a4a;border-radius:4px;">
                  <a href="${args.referralUrl}" style="display:inline-block;padding:10px 18px;font-size:13px;font-weight:500;color:#ffffff;text-decoration:none;">Share your link →</a>
                </td></tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#7a7a7a;">
            Hit reply on this email any time — tell me what platforms you sell on, what's broken in your current setup, what you wish existed. I read every message. That feedback shapes the roadmap.
          </p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#7a7a7a;">— Dom, Wrenlist</p>
        </td></tr>

        <tr><td style="padding:20px 40px;background-color:#fafaf4;border-top:1px solid #eae6d8;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9a9a9a;">
            <a href="https://wrenlist.com" style="color:#5a7a4a;text-decoration:none;">wrenlist.com</a>
          </p>
          ${unsubFooter}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = `${greeting}

You're in. Welcome.

Quick story on why this exists. I sell vintage on the side. I love the sourcing part — the treasure hunt. What I don't love is spending another evening copying the same listing into multiple apps, fighting with category pickers, and forgetting to take down a listing when it sells elsewhere.

Wrenlist is the tool I wished existed. One inventory. Crosspost in a click. Auto-delist when something sells. Tax-ready records at year-end.

We're putting the finishing touches on the Chrome extension and waiting on the store review. Should be a few weeks. I'll keep you posted with a few short emails between now and beta launch.

BRING A FRIEND, BOTH WIN
Share your link. When a fellow reseller signs up, you both jump the beta queue and get a lifetime discount when paid plans launch.

${args.referralUrl}

Hit reply any time — tell me what's broken in your current setup. I read every message.

— Dom, Wrenlist
`

  return { subject, html, text }
}

function formatPainLine(painPoint: string | null): string {
  if (!painPoint) return ''
  const map: Record<string, string> = {
    relisting: "You said relisting manually across multiple apps is the thing that's killing you. Same. That's exactly what we're fixing.",
    category: "You said category confusion is the worst part. We've spent months mapping every platform's taxonomy so you don't have to.",
    time: "You said the time it takes to list eats into the part of selling you actually enjoy. Same here.",
    shipping: "You said shipping logistics is the headache. Postage labels, tracking, packaging — we're tackling that too.",
    other: "You mentioned a frustration we want to dig into — I'll be back in touch soon.",
  }
  const line = map[painPoint]
  if (!line) return ''
  return `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#3a3a3a;font-style:italic;border-left:3px solid #5a7a4a;padding-left:14px;">${line}</p>`
}
