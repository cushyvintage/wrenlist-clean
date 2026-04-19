import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

interface ListingFindJoin {
  id: string
  user_id: string
  name: string
  photos: string[] | null
  cost_gbp: number | null
  asking_price_gbp: number | null
  category: string | null
  brand: string | null
  condition: string | null
  description: string | null
  status: string
  platform_fields: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

interface FindSummary {
  id: string
  user_id: string
  name: string
  photos: string[] | null
  cost_gbp: number | null
  asking_price_gbp: number | null
  category: string | null
  brand: string | null
  condition: string | null
  description: string | null
}

interface MarketplaceListing {
  id: string
  find_id: string
  marketplace: string
  platform_listing_id: string | null
  platform_listing_url: string | null
  listing_price: number | null
  status: string
  fields: Record<string, unknown> | null
  error_message: string | null
  created_at: string
  updated_at: string
  finds: FindSummary | FindSummary[]
}

/**
 * GET /api/listings
 * Fetch all marketplace listings for the authenticated user
 * Sources:
 * 1. product_marketplace_data (extension-published listings) joined with finds
 * 2. finds with status in ('listed', 'sold') not yet in product_marketplace_data
 * Query params: marketplace?, status?, search?, limit?, offset?
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(req.url)
    const marketplace = searchParams.get('marketplace')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '5000', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // 1. Query product_marketplace_data joined with finds — paginate to bypass
    // Supabase's default 1000-row REST cap.
    const PAGE_SIZE = 1000
    type MarketplaceListingRow = MarketplaceListing
    const marketplaceListings: MarketplaceListingRow[] = []
    for (let off = 0; ; off += PAGE_SIZE) {
      let query = supabase
        .from('product_marketplace_data')
        .select(`
          id,
          find_id,
          marketplace,
          platform_listing_id,
          platform_listing_url,
          listing_price,
          status,
          fields,
          error_message,
          created_at,
          updated_at,
          platform_listed_at,
          finds!inner (
            id,
            user_id,
            name,
            photos,
            cost_gbp,
            asking_price_gbp,
            category,
            brand,
            condition,
            description,
            sourced_at
          )
        `)
        .eq('finds.user_id', user.id)
        .order('created_at', { ascending: false })
        .range(off, off + PAGE_SIZE - 1)
      if (marketplace && marketplace !== 'all') query = query.eq('marketplace', marketplace)
      if (status && status !== 'all') query = query.eq('status', status)
      const { data: page, error: pageErr } = await query
      if (pageErr) {
        if (process.env.NODE_ENV !== 'production') console.error('Supabase error:', pageErr)
        return ApiResponseHelper.internalError(pageErr.message)
      }
      if (!page || page.length === 0) break
      marketplaceListings.push(...(page as unknown as MarketplaceListingRow[]))
      if (page.length < PAGE_SIZE) break
    }

    // 2. Query finds with status in ('listed', 'sold') — also paginated
    type FindRow = { id: string; user_id: string; name: string; photos: string[] | null; cost_gbp: number | null; asking_price_gbp: number | null; category: string | null; brand: string | null; condition: string | null; description: string | null; status: string; platform_fields: Record<string, unknown> | null; created_at: string; updated_at: string }
    const allFinds: FindRow[] = []
    for (let off = 0; ; off += PAGE_SIZE) {
      const { data: page, error: pageErr } = await supabase
        .from('finds')
        .select('id, user_id, name, photos, cost_gbp, asking_price_gbp, category, brand, condition, description, status, platform_fields, created_at, updated_at')
        .eq('user_id', user.id)
        .in('status', ['listed', 'sold'])
        .order('created_at', { ascending: false })
        .range(off, off + PAGE_SIZE - 1)
      if (pageErr) {
        if (process.env.NODE_ENV !== 'production') console.error('Supabase error:', pageErr)
        return ApiResponseHelper.internalError(pageErr.message)
      }
      if (!page || page.length === 0) break
      allFinds.push(...(page as FindRow[]))
      if (page.length < PAGE_SIZE) break
    }

    // Get find IDs already in product_marketplace_data to avoid duplicates
    const typedMarketplaceListings = marketplaceListings
    const findIdsInMarketplaceData = new Set(typedMarketplaceListings.map((item) => item.find_id))

    // Filter out finds already in product_marketplace_data
    const typedFinds = allFinds as unknown as ListingFindJoin[]
    const finds = typedFinds.filter((find) => !findIdsInMarketplaceData.has(find.id))

    // 3. Map finds to ListingWithFind shape
    const findListings = finds.map((find) => {
      // Derive marketplace from platform_fields
      let derivedMarketplace: string = 'vinted' // default
      if (find.platform_fields && typeof find.platform_fields === 'object') {
        const fields = find.platform_fields as Record<string, unknown>
        // Try selectedPlatforms array first
        const selectedPlatforms = fields.selectedPlatforms
        if (Array.isArray(selectedPlatforms) && selectedPlatforms.length > 0) {
          const firstPlatform = String(selectedPlatforms[0])
          if (firstPlatform && ['vinted', 'ebay', 'etsy', 'shopify'].includes(firstPlatform)) {
            derivedMarketplace = firstPlatform
          }
        } else {
          // Fall back to first key in platform_fields
          const keys = Object.keys(fields)
          if (keys.length > 0) {
            const firstKey = keys[0]
            if (firstKey && ['vinted', 'ebay', 'etsy', 'shopify'].includes(firstKey)) {
              derivedMarketplace = firstKey
            }
          }
        }
      }

      return {
        id: `find-${find.id}`,
        find_id: find.id,
        marketplace: derivedMarketplace,
        platform_listing_id: null,
        platform_listing_url: null,
        platform_category_id: null,
        listing_price: find.asking_price_gbp,
        fields: {},
        status: find.status,
        error_message: null,
        last_synced_at: null,
        created_at: find.created_at,
        updated_at: find.updated_at,
        finds: {
          id: find.id,
          name: find.name,
          photos: find.photos || [],
          cost_gbp: find.cost_gbp,
          asking_price_gbp: find.asking_price_gbp,
          category: find.category,
          brand: find.brand,
          condition: find.condition,
        },
      }
    })

    // 4. Merge both arrays
    const allListings = [...typedMarketplaceListings, ...findListings]

    // 5. Apply filters and search
    let filtered = allListings

    if (marketplace && marketplace !== 'all') {
      filtered = filtered.filter((item) => item.marketplace === marketplace)
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((item) => item.status === status)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((item) => {
        const find = Array.isArray(item.finds) ? item.finds[0] : item.finds
        if (!find) return false
        return (
          find.name.toLowerCase().includes(searchLower) ||
          (find.brand && find.brand.toLowerCase().includes(searchLower))
        )
      })
    }

    // Sort by created_at desc
    filtered.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Apply pagination after filtering/sorting
    const paginatedFiltered = filtered.slice(offset, offset + limit)

    return ApiResponseHelper.success(paginatedFiltered)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/listings error:', error)
    }
    return ApiResponseHelper.internalError()
  }
})

