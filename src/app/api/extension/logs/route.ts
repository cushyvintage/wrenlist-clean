import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'

/**
 * Extension remote logging endpoint.
 * POST: Store log entries from the extension — errors/warnings persisted to DB, all to in-memory buffer.
 * GET: Retrieve recent log entries from DB (persistent) or in-memory buffer.
 */

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  source: string
  message: string
  data?: Record<string, unknown>
}

// In-memory ring buffer for all levels (fast retrieval, resets on deploy)
const LOG_BUFFER: LogEntry[] = []
const MAX_ENTRIES = 200

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    const entries: LogEntry[] = Array.isArray(body) ? body : [body]

    // Always store in memory buffer
    for (const entry of entries) {
      LOG_BUFFER.push({
        timestamp: entry.timestamp || new Date().toISOString(),
        level: entry.level || 'info',
        source: entry.source || 'extension',
        message: String(entry.message || '').substring(0, 1000),
        data: entry.data ? JSON.parse(JSON.stringify(entry.data).substring(0, 2000)) : undefined,
      })
    }
    while (LOG_BUFFER.length > MAX_ENTRIES) {
      LOG_BUFFER.shift()
    }

    // Persist errors and warnings to DB (fire-and-forget)
    const persistable = entries.filter((e) => e.level === 'error' || e.level === 'warn' || e.source === 'queue')
    if (persistable.length > 0) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      supabaseAdmin
        .from('extension_logs')
        .insert(
          persistable.map((entry) => ({
            user_id: user.id,
            level: entry.level || 'info',
            source: entry.source || 'extension',
            message: String(entry.message || '').substring(0, 1000),
            data: entry.data || {},
          }))
        )
        .then(({ error }) => {
          if (error) console.warn('[ExtensionLogs] DB persist failed:', error.message)
        })
    }

    return NextResponse.json({ ok: true, count: LOG_BUFFER.length })
  } catch {
    return NextResponse.json({ error: 'Invalid log data' }, { status: 400 })
  }
})

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const level = url.searchParams.get('level')
  const source = url.searchParams.get('source')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), MAX_ENTRIES)
  const persistent = url.searchParams.get('persistent') === 'true'
  const clear = url.searchParams.get('clear') === 'true'

  // If persistent=true, read from DB instead of in-memory
  if (persistent) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    let query = supabaseAdmin
      .from('extension_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (level) query = query.eq('level', level)
    if (source) query = query.eq('source', source)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entries: data, total: data?.length || 0, source: 'database' })
  }

  // Default: in-memory buffer
  let entries = [...LOG_BUFFER]
  if (level) entries = entries.filter((e) => e.level === level)
  if (source) entries = entries.filter((e) => e.source === source)
  entries = entries.slice(-limit).reverse()

  if (clear) {
    LOG_BUFFER.length = 0
  }

  return NextResponse.json({ entries, total: LOG_BUFFER.length, source: 'memory' })
}
