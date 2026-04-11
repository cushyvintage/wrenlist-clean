/**
 * Test version-compare helpers
 *
 * Pure-function test for src/lib/version-compare.ts. Catches the classic
 * string-compare trap and any future regression in semver-like ordering.
 * Run via: `npm run test:version-compare`.
 *
 * Pattern matches scripts/test-ebay-token-crypto.ts — the repo has no unit
 * test runner (no jest/vitest), so we run these as standalone tsx scripts.
 */

import { compareVersions, isOutdated } from '../src/lib/version-compare'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL'
  message?: string
}

const results: TestResult[] = []

function check(name: string, actual: unknown, expected: unknown): void {
  if (actual === expected) {
    results.push({ name, status: 'PASS' })
  } else {
    results.push({
      name,
      status: 'FAIL',
      message: `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    })
  }
}

function checkSign(name: string, actual: number, expected: 'neg' | 'zero' | 'pos'): void {
  const got: 'neg' | 'zero' | 'pos' =
    actual < 0 ? 'neg' : actual > 0 ? 'pos' : 'zero'
  if (got === expected) {
    results.push({ name, status: 'PASS' })
  } else {
    results.push({
      name,
      status: 'FAIL',
      message: `expected ${expected}, got ${got} (${actual})`,
    })
  }
}

// --- compareVersions: equality ---
checkSign('equal: 0.9.0 vs 0.9.0', compareVersions('0.9.0', '0.9.0'), 'zero')
checkSign('equal: 1.0.0 vs 1.0.0', compareVersions('1.0.0', '1.0.0'), 'zero')
checkSign('equal: 0.9 vs 0.9.0 (missing trailing segment)', compareVersions('0.9', '0.9.0'), 'zero')
checkSign('equal: 0.9.0 vs 0.9 (missing trailing segment, reversed)', compareVersions('0.9.0', '0.9'), 'zero')

// --- compareVersions: the classic string-compare trap ---
// '0.9.0' as a string is > '0.10.0' (because '9' > '1' lexicographically).
// Numeric compare must return negative.
checkSign('TRAP: 0.9.0 < 0.10.0', compareVersions('0.9.0', '0.10.0'), 'neg')
checkSign('TRAP: 0.10.0 > 0.9.9', compareVersions('0.10.0', '0.9.9'), 'pos')
checkSign('TRAP: 0.2.0 < 0.11.0', compareVersions('0.2.0', '0.11.0'), 'neg')

// --- compareVersions: major version bumps ---
checkSign('major: 1.0.0 > 0.9.99', compareVersions('1.0.0', '0.9.99'), 'pos')
checkSign('major: 0.9.99 < 1.0.0', compareVersions('0.9.99', '1.0.0'), 'neg')
checkSign('major: 2.0.0 > 1.99.99', compareVersions('2.0.0', '1.99.99'), 'pos')

// --- compareVersions: minor/patch deltas ---
checkSign('patch: 0.9.1 > 0.9.0', compareVersions('0.9.1', '0.9.0'), 'pos')
checkSign('patch: 0.9.0 < 0.9.1', compareVersions('0.9.0', '0.9.1'), 'neg')
checkSign('minor: 0.10.0 > 0.9.5', compareVersions('0.10.0', '0.9.5'), 'pos')

// --- compareVersions: edge cases ---
checkSign('edge: 0.0.0 vs 0.0.0', compareVersions('0.0.0', '0.0.0'), 'zero')
checkSign('edge: single-segment 1 vs 2', compareVersions('1', '2'), 'neg')
checkSign('edge: empty string treated as 0', compareVersions('', '0.0.0'), 'zero')

// --- isOutdated: the actual consumer-facing check ---
check('isOutdated(0.8.0, 0.9.0) === true', isOutdated('0.8.0', '0.9.0'), true)
check('isOutdated(0.9.0, 0.9.0) === false (equal)', isOutdated('0.9.0', '0.9.0'), false)
check('isOutdated(0.9.1, 0.9.0) === false (newer)', isOutdated('0.9.1', '0.9.0'), false)
check('isOutdated(0.9.99, 0.10.0) === true (TRAP)', isOutdated('0.9.99', '0.10.0'), true)
check('isOutdated(1.0.0, 0.9.99) === false', isOutdated('1.0.0', '0.9.99'), false)

// --- Report ---
const passed = results.filter((r) => r.status === 'PASS').length
const failed = results.filter((r) => r.status === 'FAIL').length

console.log('\n=== version-compare test results ===\n')
for (const r of results) {
  const icon = r.status === 'PASS' ? '✓' : '✗'
  const line = `${icon} ${r.name}`
  if (r.status === 'FAIL') {
    console.log(`${line}\n    ${r.message}`)
  } else {
    console.log(line)
  }
}
console.log(`\n${passed} passed, ${failed} failed (${results.length} total)\n`)

if (failed > 0) {
  process.exit(1)
}
