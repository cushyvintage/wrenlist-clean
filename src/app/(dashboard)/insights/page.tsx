'use client'

/**
 * Insight history page — shows the last 100 insights Wren surfaced to
 * this user, with their clicked/dismissed state. Used to close the loop
 * on Wren's second-brain UX: the user can see what nudges they got,
 * what they acted on, and what they ignored.
 */

import { useEffect, useState } from 'react'
import { Panel } from '@/components/wren/Panel'
import { unwrapApiResponse } from '@/lib/api-utils'

type InsightType = 'alert' | 'tip' | 'info'

interface InsightEvent {
  id: string
  insight_key: string
  insight_text: string
  type: InsightType
  meta: Record<string, number | string> | null
  shown_at: string
  clicked_at: string | null
  dismissed_at: string | null
}

type StatusFilter = 'all' | 'clicked' | 'dismissed' | 'ignored'

const TYPE_STYLES: Record<InsightType, { bg: string; border: string; label: string }> = {
  alert: { bg: 'bg-amber-50', border: 'border-amber-200', label: 'text-amber-700' },
  tip: { bg: 'bg-sage-lt/20', border: 'border-sage/14', label: 'text-sage-dk' },
  info: { bg: 'bg-cream-md', border: 'border-sage/14', label: 'text-ink-lt' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function statusOf(ev: InsightEvent): StatusFilter {
  if (ev.clicked_at) return 'clicked'
  if (ev.dismissed_at) return 'dismissed'
  return 'ignored'
}

export default function InsightsHistoryPage() {
  const [events, setEvents] = useState<InsightEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/insights/history?limit=100')
        if (!res.ok) throw new Error('Failed to load history')
        const json = await res.json()
        const response = unwrapApiResponse<{ events: InsightEvent[] }>(json)
        setEvents(response?.events ?? [])
      } catch (err) {
        console.error('Failed to load insight history:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const filtered = events.filter((ev) => filter === 'all' || statusOf(ev) === filter)

  // Group by day for the rendered list
  const groups = new Map<string, InsightEvent[]>()
  for (const ev of filtered) {
    const key = dayKey(ev.shown_at)
    const list = groups.get(key) ?? []
    list.push(ev)
    groups.set(key, list)
  }

  const counts = {
    all: events.length,
    clicked: events.filter((e) => e.clicked_at).length,
    dismissed: events.filter((e) => e.dismissed_at).length,
    ignored: events.filter((e) => !e.clicked_at && !e.dismissed_at).length,
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl italic font-normal mb-2" style={{ color: '#1E2E1C' }}>
          Insight history
        </h1>
        <p className="text-sm" style={{ color: '#6B7D6A' }}>
          Every insight Wren has surfaced to you, and what you did about it.
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'clicked', 'dismissed', 'ignored'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors capitalize whitespace-nowrap ${
              filter === f
                ? 'bg-sage-pale border border-sage text-sage'
                : 'bg-cream-md border border-sage/22 text-ink-lt hover:bg-cream'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-sage/10 rounded animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Panel title="No insights yet">
          <p className="text-sm text-ink-lt">
            Wren will start logging insights here as you add finds and sell items.
          </p>
        </Panel>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, dayEvents]) => (
            <div key={day}>
              <div className="text-[11px] uppercase tracking-wider font-medium mb-3" style={{ color: '#8A9E88' }}>
                {day}
              </div>
              <div className="space-y-3">
                {dayEvents.map((ev) => {
                  const style = TYPE_STYLES[ev.type]
                  const status = statusOf(ev)
                  return (
                    <div
                      key={ev.id}
                      className={`${style.bg} border ${style.border} rounded-md p-4`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className={`text-[10px] uppercase tracking-widest font-medium mb-1 ${style.label}`}>
                            {ev.type} · {ev.insight_key}
                          </div>
                          <div className="font-serif italic text-sm text-ink leading-relaxed">
                            &ldquo;{ev.insight_text}&rdquo;
                          </div>
                        </div>
                        <div className="text-[11px] text-ink-lt whitespace-nowrap flex-shrink-0">
                          {formatDate(ev.shown_at)}
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-ink-lt flex items-center gap-3">
                        {status === 'clicked' && <span className="text-sage font-medium">✓ acted on</span>}
                        {status === 'dismissed' && <span>× dismissed</span>}
                        {status === 'ignored' && <span className="italic">no action</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
