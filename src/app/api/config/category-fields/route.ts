import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { CategoryFieldConfig, FieldConfig, Platform } from '@/types'

// Default field config for unknown categories
const DEFAULT_FIELD_CONFIG: Record<string, FieldConfig> = {
  colour: { show: true, required: false },
  material: { show: false },
  size: { show: false },
  condition_description: { show: true, required: false },
  brand: { show: false },
}

export const GET = async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams
    const category = searchParams.get('category')
    const marketplace = (searchParams.get('marketplace') || 'vinted') as Platform

    if (!category) {
      return NextResponse.json(
        { error: 'category query parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('marketplace_category_config')
      .select('*')
      .eq('category', category.toLowerCase())
      .eq('marketplace', marketplace)
      .single()

    if (error) {
      // Return default config if category not found
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            category,
            marketplace,
            fields: DEFAULT_FIELD_CONFIG,
          },
          {
            status: 200,
            headers: {
              'Cache-Control': 'public, max-age=3600',
            },
          }
        )
      }
      throw error
    }

    // Cast the JSONB fields to correct type
    const config: CategoryFieldConfig = {
      ...data,
      fields: (data.fields as unknown as Record<string, FieldConfig>) || DEFAULT_FIELD_CONFIG,
    }

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('Error fetching category config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category configuration' },
      { status: 500 }
    )
  }
}
