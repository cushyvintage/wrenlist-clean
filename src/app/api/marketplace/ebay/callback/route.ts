import { NextRequest, NextResponse } from 'next/server'

/**
 * Legacy eBay OAuth callback redirect
 * eBay RuName points here — forward to the real callback handler
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const newUrl = new URL('/api/ebay/oauth/callback' + url.search, 'https://app.wrenlist.com')
  return NextResponse.redirect(newUrl)
}
