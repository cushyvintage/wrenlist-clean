import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

interface OldestItem {
  name: string
  days_listed: number
  category: string | null
}

interface AgingAnalytics {
  aged_30: number
  aged_60: number
  oldest_item: OldestItem | null
}

export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const userId = user.id

    // Fetch all listed finds
    const { data: finds, error: findsError } = await supabase
      .from('finds')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'listed')

    if (findsError) {
      console.error('Error fetching finds:', findsError)
      return NextResponse.json({ error: 'Failed to fetch finds' }, { status: 500 })
    }

    if (!finds || finds.length === 0) {
      return NextResponse.json({
        aged_30: 0,
        aged_60: 0,
        oldest_item: null,
      } as AgingAnalytics)
    }

    const now = new Date()
    let aged30Count = 0
    let aged60Count = 0
    let oldestFind = null
    let maxDaysListed = 0

    finds.forEach((find) => {
      // Calculate days listed from updated_at (when status changed to 'listed')
      const listedDate = new Date(find.updated_at)
      const daysListed = Math.floor(
        (now.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysListed >= 30) {
        aged30Count++
      }
      if (daysListed >= 60) {
        aged60Count++
      }

      // Track oldest item
      if (daysListed > maxDaysListed) {
        maxDaysListed = daysListed
        oldestFind = {
          name: find.name,
          days_listed: daysListed,
          category: find.category,
        }
      }
    })

    const result: AgingAnalytics = {
      aged_30: aged30Count,
      aged_60: aged60Count,
      oldest_item: oldestFind,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics aging error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
