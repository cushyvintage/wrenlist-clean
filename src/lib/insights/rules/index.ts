/**
 * Wren Insights — rule registry.
 *
 * Adding a new rule: create a file in this directory exporting a
 * `{name}Rule: InsightRule`, then append it here. The engine will pick
 * it up automatically. Rule `id` must match the filename (kebab-case).
 */

import type { InsightRule } from '../types'

import { agedStockRule } from './aged-stock'
import { unpricedRule } from './unpriced'
import { bestCategoryRule } from './best-category'
import { crosslistNudgeRule } from './crosslist-nudge'
import { lowStockRule } from './low-stock'

export const ALL_RULES: InsightRule[] = [
  agedStockRule,
  unpricedRule,
  bestCategoryRule,
  crosslistNudgeRule,
  lowStockRule,
]
