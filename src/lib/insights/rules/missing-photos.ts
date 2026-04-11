/**
 * Missing photos — drafts or listed finds with empty/null photos array.
 * Listed-without-photos is urgent (buyers never click); drafts are just
 * a hygiene tip.
 */

import type { Insight, InsightRule } from '../types'

function hasNoPhotos(photos: string[] | null): boolean {
  return !photos || photos.length === 0
}

export const missingPhotosRule: InsightRule = {
  id: 'missing-photos',
  priority: 80,
  // Explicit return type because two branches emit different meta shapes
  // and TS can't collapse them into the Record<string, number|string>
  // index signature without the annotation. Same trick as unpriced.ts.
  evaluate(ctx): Insight | null {
    const missing = ctx.finds.filter(
      (f) => (f.status === 'listed' || f.status === 'draft') && hasNoPhotos(f.photos),
    )
    if (missing.length === 0) return null

    const listedMissing = missing.filter((f) => f.status === 'listed')

    if (listedMissing.length > 0) {
      return {
        key: 'missing-photos',
        type: 'alert',
        priority: 80,
        text: `${listedMissing.length} listed item${listedMissing.length === 1 ? '' : 's'} ${listedMissing.length === 1 ? 'has' : 'have'} no photos. Buyers won't even click — this is killing your sell-through.`,
        cta: { text: `add photos (${missing.length}) →`, href: '/finds?status=listed' },
        meta: { listed: listedMissing.length, total: missing.length },
      }
    }

    if (missing.length >= 3) {
      return {
        key: 'missing-photos',
        type: 'tip',
        priority: 50,
        text: `${missing.length} drafts have no photos yet. Snap them in batch — it's the fastest way to get listings live.`,
        cta: { text: `add photos (${missing.length}) →`, href: '/finds?status=draft' },
        meta: { drafts: missing.length },
      }
    }

    return null
  },
}
