/**
 * Pure semver-like version comparison helpers — no React, no chrome APIs,
 * no side effects. Safe to import from anywhere (hooks, scripts, tests).
 *
 * Used by the extension-version gating in `useExtensionInfo`.
 * Tested by `scripts/test-version-compare.ts`.
 */

/**
 * Compare two dot-separated version strings segment-by-segment as integers.
 * Returns negative if a<b, 0 if equal, positive if a>b.
 * Treats missing trailing segments as 0.
 *
 * This fixes the classic string-compare trap:
 *   `'0.9.0' < '0.10.0'` as strings → false (wrong)
 *   `compareVersions('0.9.0', '0.10.0') < 0` → true (correct)
 *
 * Does NOT handle pre-release suffixes (`-beta`, `-rc1`) or build metadata
 * (`+build.123`). Wrenlist doesn't use them. If you add them later, extend
 * this function and its test — don't silently accept them.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * True if `version` is strictly below `minimum`. Used for feature gating.
 */
export function isOutdated(version: string, minimum: string): boolean {
  return compareVersions(version, minimum) < 0
}
