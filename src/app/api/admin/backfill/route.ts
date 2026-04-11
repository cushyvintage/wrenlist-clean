import { NextRequest } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { createClient } from '@supabase/supabase-js'
import { getLeafCategoryByVintedId } from '@/data/marketplace-category-map'
import { findColourByVintedId } from '@/data/unified-colours'

/**
 * POST /api/admin/backfill
 * Backfill leaf categories + colours for old Vinted imports that have
 * catalogId/color_ids in vintedMetadata but top-level category and null colour.
 */
export const POST = withAdminAuth(async (_req: NextRequest, user) => {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all finds with Vinted catalogId
  const { data: finds, error } = await supabase
    .from('finds')
    .select('id, category, colour, platform_fields')
    .eq('user_id', user.id)
    .not('platform_fields->vinted->catalogId', 'is', null)
    .limit(2000)

  if (error) return ApiResponseHelper.internalError(error.message)

  let categoryFixed = 0
  let colourFixed = 0
  let skipped = 0

  for (const find of finds || []) {
    const pf = find.platform_fields as Record<string, unknown>
    const vinted = (pf?.vinted ?? {}) as Record<string, unknown>
    const meta = (vinted.vintedMetadata ?? {}) as Record<string, unknown>
    const catalogId = vinted.catalogId as number | null
    const colorIds = (meta.color_ids ?? []) as number[]

    const updates: Record<string, unknown> = {}

    // Backfill leaf category from catalogId
    const topLevelCategories = new Set(['other', 'home_garden', 'collectibles', 'books_media', 'clothing', 'sports_outdoors', 'electronics', 'toys_games', 'art', 'antiques', 'baby_toddler', 'craft_supplies', 'health_beauty', 'musical_instruments', 'pet_supplies', 'vehicles_parts'])
    if (catalogId && topLevelCategories.has(find.category || '')) {
      const leaf = getLeafCategoryByVintedId(String(catalogId))
      if (leaf && leaf !== find.category) {
        updates.category = leaf
        categoryFixed++
      }
    }

    // Backfill colour from color_ids
    if (!find.colour && colorIds.length > 0) {
      const firstColorId = colorIds[0]
      if (firstColorId === undefined) continue
      const colour = findColourByVintedId(firstColorId)
      if (colour) {
        updates.colour = colour.label
        const newPf = { ...pf }
        const shared = { ...((pf?.shared ?? {}) as Record<string, unknown>), colour: colour.label } as Record<string, unknown>
        if (colorIds[1]) {
          const secondary = findColourByVintedId(colorIds[1])
          if (secondary) shared.secondaryColour = secondary.label
        }
        const newVinted = { ...vinted, primaryColor: firstColorId } as Record<string, unknown>
        if (colorIds[1]) newVinted.secondaryColor = colorIds[1]
        newPf.shared = shared
        newPf.vinted = newVinted
        updates.platform_fields = newPf
        colourFixed++
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('finds').update(updates).eq('id', find.id)
    } else {
      skipped++
    }
  }

  return ApiResponseHelper.success({
    total: finds?.length || 0,
    categoryFixed,
    colourFixed,
    skipped,
  })
})
