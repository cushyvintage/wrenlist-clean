import { withAuth } from '@/lib/with-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import type { PriceResearchRecord } from '@/types'

// GET /api/price-research/history — fetch user's recent price research
export const GET = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)

  const { data, error } = await supabase
    .from('price_research_history')
    .select('id, query, title, description, suggested_price, best_platform, ebay_avg, vinted_avg, source, image_url, raw_response, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('GET /api/price-research/history error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success(data as PriceResearchRecord[])
})

// POST /api/price-research/history — save a research result
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { query, title, description, suggested_price, best_platform, ebay_avg, vinted_avg, source, image_url, raw_response } = body

  if (!query) {
    return ApiResponseHelper.badRequest('query is required')
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('price_research_history')
    .insert([{
      user_id: user.id,
      query,
      title: title || null,
      description: description || null,
      suggested_price: suggested_price || null,
      best_platform: best_platform || null,
      ebay_avg: ebay_avg || null,
      vinted_avg: vinted_avg || null,
      source: source || 'text',
      image_url: image_url || null,
      raw_response: raw_response || null,
    }])
    .select('id, query, title, description, suggested_price, best_platform, ebay_avg, vinted_avg, source, image_url, raw_response, created_at')
    .single()

  if (error) {
    console.error('POST /api/price-research/history error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.created(data as PriceResearchRecord)
})

// DELETE /api/price-research/history?id=uuid — delete a history entry
export const DELETE = withAuth(async (req, user) => {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return ApiResponseHelper.badRequest('id is required')
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('price_research_history')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('DELETE /api/price-research/history error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success({ deleted: true })
})
