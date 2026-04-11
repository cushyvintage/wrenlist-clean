/**
 * Sidebar navigation SVG icons — 14x14 stroke icons matching the original design.
 * All icons use currentColor so they inherit the sidebar text colour.
 */

const s = { strokeWidth: 1.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const NavIcons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" {...s} />
      <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" {...s} />
      <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" {...s} />
      <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" {...s} />
    </svg>
  ),
  finds: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M2 3h10M2 7h10M2 11h6" stroke="currentColor" {...s} />
    </svg>
  ),
  'add-find': (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M7 1v12M1 7h12" stroke="currentColor" {...s} />
    </svg>
  ),
  listings: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M1 3h12M1 7h8M1 11h5" stroke="currentColor" {...s} />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M1 11L4 7l3 2 3-4 2 2" stroke="currentColor" {...s} />
    </svg>
  ),
  insights: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M7 1v1M7 12v1M1 7h1M12 7h1M3 3l.7.7M10.3 10.3l.7.7M3 11l.7-.7M10.3 3.7l.7-.7" stroke="currentColor" {...s} />
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth={1.1} />
    </svg>
  ),
  'price-research': (
    <svg viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth={1.1} />
      <path d="M9 9l3 3" stroke="currentColor" {...s} />
    </svg>
  ),
  sold: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M2 11L5 5l3 4 2-3 2 2" stroke="currentColor" {...s} />
    </svg>
  ),
  sourcing: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M7 1L1 5v8h12V5L7 1z" stroke="currentColor" strokeWidth={1.1} strokeLinejoin="round" fill="none" />
      <path d="M5 13V8h4v5" stroke="currentColor" strokeWidth={1.1} />
    </svg>
  ),
  suppliers: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M1 10L4 4l3 3 3-5 3 4" stroke="currentColor" {...s} />
      <path d="M1 13h12" stroke="currentColor" {...s} />
    </svg>
  ),
  expenses: (
    <svg viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="10" rx="1" stroke="currentColor" strokeWidth={1.1} />
      <path d="M1 5h12M4 8h2M4 10h3" stroke="currentColor" {...s} />
    </svg>
  ),
  mileage: (
    <svg viewBox="0 0 14 14" fill="none">
      <circle cx="4" cy="10" r="2" stroke="currentColor" strokeWidth={1.1} />
      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth={1.1} />
      <path d="M6 10h2M2 7V5l3-3h4l2 3v2" stroke="currentColor" {...s} />
    </svg>
  ),
  tax: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M2 2h10v10H2zM5 5h4M5 7h4M5 9h2" stroke="currentColor" {...s} />
    </svg>
  ),
  import: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" {...s} />
      <path d="M2 11h10" stroke="currentColor" {...s} />
    </svg>
  ),
  scanner: (
    <svg viewBox="0 0 14 14" fill="none">
      <rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" {...s} />
      <path d="M4 5v4M6 5v4M8 5v4M10 5v4" stroke="currentColor" {...s} />
    </svg>
  ),
  'platform-connect': (
    <svg viewBox="0 0 14 14" fill="none">
      <circle cx="5" cy="7" r="3" stroke="currentColor" strokeWidth={1.1} />
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth={1.1} />
    </svg>
  ),
  billing: (
    <svg viewBox="0 0 14 14" fill="none">
      <rect x="1" y="3" width="12" height="9" rx="1" stroke="currentColor" strokeWidth={1.1} />
      <path d="M1 6h12" stroke="currentColor" {...s} />
      <path d="M3 9h3" stroke="currentColor" {...s} />
    </svg>
  ),
  jobs: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M2 3h3v8H2zM6 5h3v6H6zM10 1h3v11h-3z" stroke="currentColor" {...s} />
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 14 14" fill="none">
      <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth={1.1} />
      <path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" {...s} />
      <circle cx="10" cy="5" r="1.5" stroke="currentColor" strokeWidth={1.1} />
      <path d="M10 8.5c1.7 0 3 1.3 3 3" stroke="currentColor" {...s} />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 14 14" fill="none">
      <path d="M2 1h10l-1 9H3L2 1z" stroke="currentColor" {...s} />
      <circle cx="5" cy="12" r="1" stroke="currentColor" strokeWidth={1.1} />
      <circle cx="10" cy="12" r="1" stroke="currentColor" strokeWidth={1.1} />
    </svg>
  ),
  templates: (
    <svg viewBox="0 0 14 14" fill="none">
      <rect x="2" y="1" width="10" height="12" rx="1" stroke="currentColor" strokeWidth={1.1} />
      <path d="M5 4h4M5 7h4M5 10h2" stroke="currentColor" {...s} />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth={1.1} />
      <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.5 2.5l1.4 1.4M10.1 10.1l1.4 1.4M2.5 11.5l1.4-1.4M10.1 3.9l1.4-1.4" stroke="currentColor" {...s} />
    </svg>
  ),
}
