/**
 * Shared refund detection for Vinted sale status strings.
 *
 * Vinted's /my_orders returns verbose status strings like:
 *   - "Not sent. Buyer refunded."  → refunded
 *   - "Buyer refunded"              → refunded
 *   - "Package delivered."          → not refunded
 *
 * Mirrors the logic in src/app/(dashboard)/sold/page.tsx normalizeStatus,
 * but scoped to just the refund detection so both UI and sync-sales agree.
 */
export function isRefundedStatus(raw: string | null | undefined): boolean {
  if (!raw) return false
  const lower = raw.toLowerCase()
  // "Not sent. Buyer refunded." — seller never shipped, buyer got money back
  if (lower.includes('not sent') && lower.includes('refund')) return true
  // "Buyer refunded" — any other refund scenario
  if (lower.includes('refund') && !lower.includes('sent')) return true
  return false
}
