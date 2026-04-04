import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { CreateListingSchema, validateBody } from '@/lib/validation'
import type { Listing } from '@/types'

/**
 * GET /api/listings
 * Fetch all marketplace listings for the authenticated user
 * Sources:
 * 1. product_marketplace_data (extension-published listings) joined with finds
 * 2. finds with status in ('listed', 'sold') not yet in product_marketplace_data
 * Query params: marketplace?, status?, search?, limit?, offset?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const marketplace = searchParams.get('marketplace')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // 1. Query product_marketplace_data joined with finds
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
        error_message,
        created_at,
        updated_at,
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
          description
        )
      `)
      .eq('finds.user_id', user.id)
      .order('created_at', { ascending: false })

    if (marketplace && marketplace !== 'all') {
      query = query.eq('marketplace', marketplace)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: marketplaceListings, error: marketplaceError } = await query

    if (marketplaceError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', marketplaceError)
      }
      return ApiResponseHelper.internalError(marketplaceError.message)
    }

    // 2. Query finds with status in ('listed', 'sold')
    const { data: allFinds, error: findsError } = await supabase
      .from('finds')
      .select(
        'id, user_id, name, photos, cost_gbp, asking_price_gbp, category, brand, condition, description, status, platform_fields, created_at, updated_at'
      )
      .eq('user_id', user.id)
      .in('status', ['listed', 'sold'])
      .order('created_at', { ascending: false })

    if (findsError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', findsError)
      }
      return ApiResponseHelper.internalError(findsError.message)
    }

    // Get find IDs already in product_marketplace_data to avoid duplicates
    const findIdsInMarketplaceData = new Set((marketplaceListings || []).map((item: any) => item.find_id))

    // Filter out finds already in product_marketplace_data
    const finds = (allFinds || []).filter((find: any) => !findIdsInMarketplaceData.has(find.id))

    // 3. Map finds to ListingWithFind shape
    const findListings = finds.map((find: any) => {
      // Derive marketplace from platform_fields
      let derivedMarketplace: string = 'vinted' // default
      if (find.platform_fields && typeof find.platform_fields === 'object') {
        const fields = find.platform_fields as Record<string, any>
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
        marketplace: derivedMarketplace as any, // Type cast to Platform
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
    const allListings = [...(marketplaceListings || []), ...findListings]

    // 5. Apply filters and search
    let filtered = allListings

    if (marketplace && marketplace !== 'all') {
      filtered = filtered.filter((item: any) => item.marketplace === marketplace)
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((item: any) => item.status === status)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((item: any) => {
        const find = item.finds
        return (
          find.name.toLowerCase().includes(searchLower) ||
          (find.brand && find.brand.toLowerCase().includes(searchLower))
        )
      })
    }

    // Sort by created_at desc
    filtered.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Apply pagination after filtering/sorting
    const paginatedFiltered = filtered.slice(offset, offset + limit)

    return ApiResponseHelper.success({
      data: paginatedFiltered,
      pagination: {
        limit,
        offset,
        total: filtered.length,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/listings error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/listings
 * Create a new listing for a find
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    // Validate request body
    const validation = validateBody(CreateListingSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    const { find_id, ...listingData } = validation.data

    // Verify find exists and belongs to user
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('id')
      .eq('id', find_id)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound()
    }

    // Create listing
    const { data, error } = await supabase
      .from('listings')
      .insert([
        {
          find_id,
          user_id: user.id,
          ...listingData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.created(data as Listing)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('POST /api/listings error:', error) }    return ApiResponseHelper.internalError()
  }
}
