/**
 * Weekly digest — Sunday morning email summarising the last 7 days of
 * activity and the current top Wren insights.
 *
 * Design notes follow the other Wrenlist email templates:
 * - Inline styles only (Gmail/Outlook/Apple compatibility)
 * - Sage/cream palette matching the app
 * - Single primary CTA → dashboard. Insight cards link into specific
 *   filters so the user can act in one click.
 */

interface DigestInsight {
  key: string
  type: 'alert' | 'tip' | 'info'
  text: string
  cta: { text: string; href: string }
}

interface DigestWeekStats {
  itemsSold: number
  itemsAdded: number
  revenue: number
  profit: number
}

// Inline-style palette per insight type. Email clients require hex
// colours, not Tailwind classes, so this lives separately from
// InsightCard's Tailwind styles.
const INSIGHT_EMAIL_PALETTE = {
  alert: { bg: '#fef3e2', border: '#facc66', label: '#b45309' },
  tip: { bg: '#eef5ec', border: '#a7c7a4', label: '#3d5c3a' },
  info: { bg: '#f5f1e8', border: '#d4d9c9', label: '#7a7a7a' },
} as const

export function buildWeeklyDigestEmail(args: {
  firstName: string | null
  appUrl: string
  weekStats: DigestWeekStats
  insights: DigestInsight[]
  unsubscribeUrl: string | null
}): { subject: string; html: string; text: string } {
  const greeting = args.firstName ? `Hi ${args.firstName},` : 'Hi there,'
  const dashboardUrl = `${args.appUrl}/dashboard`

  const headlineLine =
    args.weekStats.itemsSold > 0
      ? `${args.weekStats.itemsSold} sold for £${args.weekStats.revenue.toFixed(0)} · £${args.weekStats.profit.toFixed(0)} profit`
      : args.weekStats.itemsAdded > 0
      ? `${args.weekStats.itemsAdded} new finds added this week`
      : 'A quieter week — time for a sourcing run?'

  const subject = `Wren weekly — ${headlineLine}`

  const insightCardsHtml = args.insights
    .map((insight) => {
      const c = INSIGHT_EMAIL_PALETTE[insight.type]
      const ctaUrl = insight.cta.href.startsWith('http')
        ? insight.cta.href
        : `${args.appUrl}${insight.cta.href}`
      return `
        <tr>
          <td style="padding:0 0 12px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.bg};border:1px solid ${c.border};border-radius:6px;">
              <tr>
                <td style="padding:16px 20px;">
                  <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${c.label};font-weight:600;margin-bottom:6px;">Wren insight · ${insight.type}</div>
                  <div style="font-family:Georgia,serif;font-style:italic;font-size:15px;color:#2a2a2a;line-height:1.5;margin-bottom:10px;">“${insight.text}”</div>
                  <a href="${ctaUrl}" style="font-size:12px;color:#5a7a4a;text-decoration:underline;">${insight.cta.text}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    })
    .join('')

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
              <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#2a2a2a;">Your week on Wrenlist</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#7a7a7a;">Wren insights · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 32px 40px;">
              <h2 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:20px;font-weight:normal;color:#2a2a2a;">${greeting}</h2>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#4a4a4a;">
                ${headlineLine}.
              </p>

              <!-- Week stats strip -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                <tr>
                  <td width="25%" style="padding:12px;background-color:#fafaf4;border:1px solid #eae6d8;border-radius:4px;text-align:center;">
                    <div style="font-size:20px;font-weight:600;color:#2a2a2a;">${args.weekStats.itemsAdded}</div>
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#9a9a9a;margin-top:2px;">Sourced</div>
                  </td>
                  <td width="2%"></td>
                  <td width="25%" style="padding:12px;background-color:#fafaf4;border:1px solid #eae6d8;border-radius:4px;text-align:center;">
                    <div style="font-size:20px;font-weight:600;color:#2a2a2a;">${args.weekStats.itemsSold}</div>
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#9a9a9a;margin-top:2px;">Sold</div>
                  </td>
                  <td width="2%"></td>
                  <td width="25%" style="padding:12px;background-color:#fafaf4;border:1px solid #eae6d8;border-radius:4px;text-align:center;">
                    <div style="font-size:20px;font-weight:600;color:#2a2a2a;">£${args.weekStats.revenue.toFixed(0)}</div>
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#9a9a9a;margin-top:2px;">Sales</div>
                  </td>
                  <td width="2%"></td>
                  <td width="25%" style="padding:12px;background-color:#fafaf4;border:1px solid #eae6d8;border-radius:4px;text-align:center;">
                    <div style="font-size:20px;font-weight:600;color:${args.weekStats.profit >= 0 ? '#3d5c3a' : '#b91c1c'};">£${args.weekStats.profit.toFixed(0)}</div>
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#9a9a9a;margin-top:2px;">Profit</div>
                  </td>
                </tr>
              </table>

              <!-- Insights -->
              <h3 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:16px;font-weight:normal;color:#2a2a2a;">This week, Wren noticed</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${insightCardsHtml || '<tr><td style="font-size:14px;color:#7a7a7a;font-style:italic;padding:12px 0;">Nothing urgent — inventory looks healthy.</td></tr>'}
              </table>

              <!-- Primary CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 16px 0;">
                <tr>
                  <td align="center" style="background-color:#5a7a4a;border-radius:6px;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">
                      Open your dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#7a7a7a;">
                Replies go straight to Dom. Tell me what's working, what's missing, what's broken.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#fafaf4;border-top:1px solid #eae6d8;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#9a9a9a;">Wrenlist — the operating system for thrifters.</p>
              <p style="margin:0;font-size:12px;color:#9a9a9a;">
                <a href="${args.appUrl}" style="color:#5a7a4a;text-decoration:none;">wrenlist.com</a>
                ${args.unsubscribeUrl ? `&nbsp;·&nbsp;<a href="${args.unsubscribeUrl}" style="color:#5a7a4a;text-decoration:none;">Unsubscribe</a>` : ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const textInsights = args.insights.length > 0
    ? args.insights.map((i) => `- ${i.text}`).join('\n')
    : '- Nothing urgent — inventory looks healthy.'

  const text = `${greeting}

${headlineLine}.

This week:
  Sourced: ${args.weekStats.itemsAdded}
  Sold: ${args.weekStats.itemsSold}
  Sales: £${args.weekStats.revenue.toFixed(0)}
  Profit: £${args.weekStats.profit.toFixed(0)}

This week, Wren noticed:
${textInsights}

Open your dashboard: ${dashboardUrl}

Replies go straight to Dom. Tell me what's working, what's missing, what's broken.
${args.unsubscribeUrl ? `\nUnsubscribe: ${args.unsubscribeUrl}\n` : ''}`

  return { subject, html, text }
}
