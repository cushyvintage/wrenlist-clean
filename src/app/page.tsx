import LandingPage from './(marketing)/landing/page'

/**
 * Root URL (wrenlist.com / app.wrenlist.com).
 *
 * Renders the marketing landing page directly so first-time visitors see
 * content immediately — no client-side auth check, no "Loading..." flash.
 * Authenticated users are redirected to /dashboard by middleware.ts before
 * any HTML for this route is sent, so they never briefly see this page.
 *
 * This file deliberately stays a server component — the landing-page
 * children are themselves marked 'use client', so the interactive parts
 * still hydrate on the client.
 */
export default function Home() {
  return <LandingPage />
}
