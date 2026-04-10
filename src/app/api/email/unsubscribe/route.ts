import { NextRequest, NextResponse } from 'next/server'
import { unsubscribeByToken } from '@/lib/email/unsubscribe'

/**
 * GET /api/email/unsubscribe?token=...
 *
 * Public endpoint — no auth. Unsubscribes the user identified by the
 * opaque token from non-transactional emails (drip, welcome reminders,
 * etc.). Transactional emails (verification, password reset, admin
 * notifications) are NOT affected.
 *
 * Returns a minimal HTML confirmation page. Clicking an unsubscribe link
 * in an email client opens a new tab — we render directly here rather
 * than redirecting so the user never sees a blank page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')?.trim() || ''

  if (!token) {
    return htmlResponse(renderErrorPage('Missing unsubscribe token.'), 400)
  }

  const userId = await unsubscribeByToken(token)

  if (!userId) {
    // Either the token is unknown, already used, or the DB write failed.
    // From the user's perspective "unknown" and "already unsubscribed"
    // should feel the same, so we show a generic confirmation.
    return htmlResponse(renderAlreadyUnsubscribedPage(), 200)
  }

  return htmlResponse(renderSuccessPage(), 200)
}

function htmlResponse(html: string, status: number) {
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

const SHELL_STYLES = `
  body {
    margin: 0;
    padding: 0;
    background-color: #f5f1e8;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #2a2a2a;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card {
    background-color: #ffffff;
    border: 1px solid #d4d9c9;
    border-radius: 8px;
    padding: 40px;
    max-width: 480px;
    margin: 20px;
    text-align: center;
  }
  h1 {
    font-family: Georgia, serif;
    font-weight: normal;
    font-size: 24px;
    color: #2a2a2a;
    margin: 0 0 16px 0;
  }
  p {
    font-size: 15px;
    line-height: 1.6;
    color: #4a4a4a;
    margin: 0 0 12px 0;
  }
  a.button {
    display: inline-block;
    margin-top: 16px;
    padding: 12px 24px;
    background-color: #5a7a4a;
    color: #ffffff;
    text-decoration: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
  }
  .brand {
    font-family: Georgia, serif;
    font-size: 14px;
    color: #7a7a7a;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
  }
`

function renderSuccessPage(): string {
  return /* html */ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribed — Wrenlist</title>
  <style>${SHELL_STYLES}</style>
</head>
<body>
  <div class="card">
    <div class="brand">Wrenlist</div>
    <h1>You're unsubscribed.</h1>
    <p>We won't send you any more follow-up emails. Thanks for giving Wrenlist a look.</p>
    <p>You'll still get important account emails (verification, password reset, billing).</p>
    <a class="button" href="https://app.wrenlist.com">Back to Wrenlist →</a>
  </div>
</body>
</html>`
}

function renderAlreadyUnsubscribedPage(): string {
  return /* html */ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Already unsubscribed — Wrenlist</title>
  <style>${SHELL_STYLES}</style>
</head>
<body>
  <div class="card">
    <div class="brand">Wrenlist</div>
    <h1>You're already unsubscribed.</h1>
    <p>We won't send you any more follow-up emails.</p>
    <a class="button" href="https://app.wrenlist.com">Back to Wrenlist →</a>
  </div>
</body>
</html>`
}

function renderErrorPage(message: string): string {
  return /* html */ `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribe error — Wrenlist</title>
  <style>${SHELL_STYLES}</style>
</head>
<body>
  <div class="card">
    <div class="brand">Wrenlist</div>
    <h1>Something went wrong.</h1>
    <p>${escapeHtml(message)}</p>
    <p>If you keep seeing this, reply to any email from Wrenlist and we'll sort it manually.</p>
  </div>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
