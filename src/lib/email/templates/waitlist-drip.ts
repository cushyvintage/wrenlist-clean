/**
 * Waitlist drip emails (Day 3, 7, 10, 14) — sent to subscribers between
 * signup and beta launch. Indie founder voice. Each builder returns
 * { subject, html, text } so the cron can hand it straight to Resend.
 *
 * All four share the same shell helper (renderShell) for layout consistency
 * — the only thing that varies is the title, body markup, and footer copy.
 */

interface DripArgs {
  firstName: string | null
  referralUrl: string
  unsubscribeUrl: string | null
}

interface BuiltEmail {
  subject: string
  html: string
  text: string
}

function renderShell(args: {
  subject: string
  preheader: string
  bodyHtml: string
  unsubscribeUrl: string | null
}): string {
  const unsubFooter = args.unsubscribeUrl
    ? `<p style="margin:8px 0 0 0;font-size:11px;color:#9a9a9a;">Don't want these? <a href="${args.unsubscribeUrl}" style="color:#9a9a9a;">Unsubscribe</a>.</p>`
    : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${args.subject}</title></head>
<body style="margin:0;padding:0;background-color:#f5f1e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2a2a2a;">
  <span style="display:none;font-size:1px;color:#f5f1e8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${args.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f1e8;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #d4d9c9;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:24px 32px 16px 32px;border-bottom:1px solid #eae6d8;">
          <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#2a2a2a;">Wrenlist</p>
        </td></tr>
        <tr><td style="padding:28px 32px 24px 32px;">${args.bodyHtml}</td></tr>
        <tr><td style="padding:18px 32px;background-color:#fafaf4;border-top:1px solid #eae6d8;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9a9a9a;"><a href="https://wrenlist.com" style="color:#5a7a4a;text-decoration:none;">wrenlist.com</a></p>
          ${unsubFooter}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function greet(firstName: string | null): string {
  return firstName ? `Hi ${firstName},` : 'Hi there,'
}

// ─────────────────────────────────────────────────────────────────────────────
// Day 3 — How it works
// ─────────────────────────────────────────────────────────────────────────────
export function buildWaitlistDripDay3(args: DripArgs): BuiltEmail {
  const subject = 'One inventory. Crosspost. Done.'
  const greeting = greet(args.firstName)

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-family:Georgia,serif;font-size:20px;font-weight:normal;color:#2a2a2a;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">Quick note on how Wrenlist actually works.</p>
    <ol style="margin:0 0 18px 0;padding-left:18px;font-size:15px;line-height:1.7;color:#3a3a3a;">
      <li><strong>Snap a photo of your find.</strong> The AI fills in title, description, category, and a price suggestion based on live comp data.</li>
      <li><strong>Pick the marketplaces you want it on.</strong> One click, every platform you sell on.</li>
      <li><strong>It sells somewhere — every other listing comes down automatically.</strong> No more "sorry, just sold!" messages.</li>
    </ol>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">That's the loop. Source, list once, sell anywhere, get on with your life.</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">In a few days I'll send a note about the people we built this for and how they're using it. Then a transparent update on where the Chrome extension is in review.</p>
    <p style="margin:0;font-size:14px;color:#7a7a7a;">— Dom</p>`

  const html = renderShell({ subject, preheader: 'How Wrenlist actually works in 3 steps.', bodyHtml, unsubscribeUrl: args.unsubscribeUrl })
  const text = `${greeting}

Quick note on how Wrenlist actually works.

1. Snap a photo of your find. The AI fills in title, description, category, and a price suggestion based on live comp data.
2. Pick the marketplaces you want it on. One click, every platform you sell on.
3. It sells somewhere — every other listing comes down automatically. No more "sorry, just sold!" messages.

That's the loop. Source, list once, sell anywhere, get on with your life.

— Dom`

  return { subject, html, text }
}

// ─────────────────────────────────────────────────────────────────────────────
// Day 7 — Who we built this for
// ─────────────────────────────────────────────────────────────────────────────
export function buildWaitlistDripDay7(args: DripArgs): BuiltEmail {
  const subject = "The kind of seller this is for"
  const greeting = greet(args.firstName)

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-family:Georgia,serif;font-size:20px;font-weight:normal;color:#2a2a2a;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">A reseller I know does roughly 30 finds a week. Charity shops on Saturday, car boot Sunday. They were tracking inventory in a Notes app. Photos in their camera roll. Listings copy-pasted between five different apps.</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">They were profitable. But every Sunday night was three hours of admin to get the week's finds online.</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;font-style:italic;border-left:3px solid #5a7a4a;padding-left:14px;">"I used to track everything in a Notes app. Wrenlist made me realise how much money I was leaving at the bottom of the pile."</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">If that sounds like your weekend, you'll like Wrenlist. The whole thing is built around getting inventory online faster so you can spend more of your weekend at the rack and less of it at the laptop.</p>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">Know a fellow reseller who'd want this? Send them your link — you both jump the beta queue:</p>
    <p style="margin:0 0 18px 0;font-size:13px;background-color:#fafaf4;border:1px dashed #d4d9c9;border-radius:4px;padding:10px 12px;color:#3a3a3a;font-family:Menlo,Consolas,monospace;word-break:break-all;">${args.referralUrl}</p>
    <p style="margin:0;font-size:14px;color:#7a7a7a;">— Dom</p>`

  const html = renderShell({ subject, preheader: 'Who Wrenlist is built for, and a friend invite.', bodyHtml, unsubscribeUrl: args.unsubscribeUrl })
  const text = `${greeting}

A reseller I know does roughly 30 finds a week. Charity shops on Saturday, car boot Sunday. They were tracking inventory in a Notes app. Listings copy-pasted between five different apps. Every Sunday night was three hours of admin.

"I used to track everything in a Notes app. Wrenlist made me realise how much money I was leaving at the bottom of the pile."

If that sounds like your weekend, you'll like Wrenlist.

Know a fellow reseller who'd want this? Send them your link — you both jump the beta queue:
${args.referralUrl}

— Dom`

  return { subject, html, text }
}

// ─────────────────────────────────────────────────────────────────────────────
// Day 10 — Where the Chrome extension is
// ─────────────────────────────────────────────────────────────────────────────
export function buildWaitlistDripDay10(args: DripArgs): BuiltEmail {
  const subject = 'Where the Chrome extension is right now'
  const greeting = greet(args.firstName)

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-family:Georgia,serif;font-size:20px;font-weight:normal;color:#2a2a2a;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">A short progress note. The Chrome extension is what makes the magic happen — it's the bit that takes a Wrenlist listing and posts it to your marketplace accounts on your behalf.</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">The extension is built. We're now in the Chrome Web Store review queue. Google's review can take anywhere from a few days to a few weeks — out of our hands.</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">The day it's approved, beta opens. You'll be one of the first emails I send.</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">In the meantime, the rest of the app is being polished daily — better photo handling, smarter category matching, faster price research. The waitlist is paying off in spades because every bit of feedback I'm getting from people on this list is shaping the launch.</p>
    <p style="margin:0;font-size:14px;color:#7a7a7a;">— Dom</p>`

  const html = renderShell({ subject, preheader: 'Where the extension is and what happens next.', bodyHtml, unsubscribeUrl: args.unsubscribeUrl })
  const text = `${greeting}

A short progress note. The Chrome extension is what makes the magic happen — it's the bit that takes a Wrenlist listing and posts it to your marketplace accounts on your behalf.

The extension is built. We're now in the Chrome Web Store review queue. Google's review can take anywhere from a few days to a few weeks — out of our hands.

The day it's approved, beta opens. You'll be one of the first emails I send.

— Dom`

  return { subject, html, text }
}

// ─────────────────────────────────────────────────────────────────────────────
// Day 14 — FAQ
// ─────────────────────────────────────────────────────────────────────────────
export function buildWaitlistDripDay14(args: DripArgs): BuiltEmail {
  const subject = "Questions you've been asking"
  const greeting = greet(args.firstName)

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-family:Georgia,serif;font-size:20px;font-weight:normal;color:#2a2a2a;">${greeting}</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">A few questions keep coming up — sharing the answers in case you've been wondering the same.</p>

    <p style="margin:0 0 6px 0;font-size:15px;font-weight:600;color:#2a2a2a;">Will it work with my marketplace?</p>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3a3a3a;">Probably. We're focused on the platforms most UK and US resellers use day to day. If you've got one we don't yet support, hit reply and tell me.</p>

    <p style="margin:0 0 6px 0;font-size:15px;font-weight:600;color:#2a2a2a;">What about my existing listings?</p>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3a3a3a;">We import them. Wrenlist becomes the source of truth for new listings going forward, and your historic stuff stays where it is.</p>

    <p style="margin:0 0 6px 0;font-size:15px;font-weight:600;color:#2a2a2a;">Is it safe to connect my marketplace accounts?</p>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3a3a3a;">We use the official OAuth flows where they exist, and the Chrome extension where they don't. We never store your marketplace passwords. We're registered with the ICO for data protection.</p>

    <p style="margin:0 0 6px 0;font-size:15px;font-weight:600;color:#2a2a2a;">What will it cost?</p>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3a3a3a;">Beta is free for everyone on this list. After beta, there'll be a paid plan — and as a thank-you for being early, you'll have a lifetime discount locked in.</p>

    <p style="margin:0 0 6px 0;font-size:15px;font-weight:600;color:#2a2a2a;">When does beta open?</p>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3a3a3a;">As soon as the Chrome extension clears Google's review queue. I'll email you the day it does.</p>

    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#3a3a3a;">Anything else? Hit reply. Genuinely — every email gets a personal response.</p>
    <p style="margin:0;font-size:14px;color:#7a7a7a;">— Dom</p>`

  const html = renderShell({ subject, preheader: 'Five questions, five plain-English answers.', bodyHtml, unsubscribeUrl: args.unsubscribeUrl })
  const text = `${greeting}

A few questions keep coming up — sharing the answers in case you've been wondering the same.

Will it work with my marketplace?
Probably. We're focused on the platforms most UK and US resellers use day to day. If you've got one we don't yet support, hit reply.

What about my existing listings?
We import them. Wrenlist becomes the source of truth for new listings going forward, and your historic stuff stays where it is.

Is it safe to connect my marketplace accounts?
We use the official OAuth flows where they exist, and the Chrome extension where they don't. We never store your marketplace passwords. We're registered with the ICO.

What will it cost?
Beta is free for everyone on this list. After beta, there'll be a paid plan — and as a thank-you for being early, you'll have a lifetime discount locked in.

When does beta open?
As soon as the Chrome extension clears Google's review queue. I'll email you the day it does.

Anything else? Hit reply.

— Dom`

  return { subject, html, text }
}
