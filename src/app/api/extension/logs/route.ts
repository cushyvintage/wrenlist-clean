import { NextRequest, NextResponse } from 'next/server'

/**
 * Extension remote logging endpoint.
 * POST: Store log entries from the extension for debugging.
 * GET: Retrieve recent log entries.
 *
 * No auth required — logs are keyed by a session ID from the extension.
 * In-memory store (resets on deploy). Good enough for debugging.
 */

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  source: string
  message: string
  data?: Record<string, unknown>
}

// In-memory ring buffer — last 200 entries, resets on deploy
const LOG_BUFFER: LogEntry[] = []
const MAX_ENTRIES = 200

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entries: LogEntry[] = Array.isArray(body) ? body : [body]

    for (const entry of entries) {
      LOG_BUFFER.push({
        timestamp: entry.timestamp || new Date().toISOString(),
        level: entry.level || 'info',
        source: entry.source || 'extension',
        message: String(entry.message || '').substring(0, 1000),
        data: entry.data ? JSON.parse(JSON.stringify(entry.data).substring(0, 2000)) : undefined,
      })
    }

    // Trim to max
    while (LOG_BUFFER.length > MAX_ENTRIES) {
      LOG_BUFFER.shift()
    }

    return NextResponse.json({ ok: true, count: LOG_BUFFER.length })
  } catch {
    return NextResponse.json({ error: 'Invalid log data' }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const level = url.searchParams.get('level') // filter by level
  const source = url.searchParams.get('source') // filter by source
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), MAX_ENTRIES)
  const clear = url.searchParams.get('clear') === 'true'

  let entries = [...LOG_BUFFER]

  if (level) entries = entries.filter((e) => e.level === level)
  if (source) entries = entries.filter((e) => e.source === source)

  // Most recent first
  entries = entries.slice(-limit).reverse()

  if (clear) {
    LOG_BUFFER.length = 0
  }

  return NextResponse.json({ entries, total: LOG_BUFFER.length })
}
