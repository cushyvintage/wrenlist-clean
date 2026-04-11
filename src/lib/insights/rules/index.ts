/**
 * Wren Insights — rule registry.
 *
 * Adding a new rule: create a file in this directory exporting a
 * `{name}Rule: InsightRule`, then append it here. The engine sorts by
 * type+priority at runtime, so the order in this list is purely cosmetic.
 * Rule `id` must match the filename (kebab-case).
 */

import type { InsightRule } from '../types'

import { agedStockRule } from './aged-stock'
import { unpricedRule } from './unpriced'
import { missingPhotosRule } from './missing-photos'
import { taxDeadlineRule } from './tax-deadline'
import { priceDriftRule } from './price-drift'
import { sourcingRoiRule } from './sourcing-roi'
import { bestCategoryRule } from './best-category'
import { slowCategoriesRule } from './slow-categories'
import { crosslistNudgeRule } from './crosslist-nudge'
import { costConcentrationRule } from './cost-concentration'
import { lowStockRule } from './low-stock'
import { listingStreakRule } from './listing-streak'

export const ALL_RULES: InsightRule[] = [
  agedStockRule,
  unpricedRule,
  missingPhotosRule,
  taxDeadlineRule,
  priceDriftRule,
  sourcingRoiRule,
  bestCategoryRule,
  slowCategoriesRule,
  crosslistNudgeRule,
  costConcentrationRule,
  lowStockRule,
  listingStreakRule,
]
