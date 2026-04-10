'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Archive, Printer, Trash2, Package, Activity } from 'lucide-react'
import { unwrapApiResponse } from '@/lib/api-utils'
import type { Stash, Find, StashActivity } from '@/types'

interface StashDetailResponse {
  stash: Stash
  finds: Find[]
  pagination: { total: number; limit: number; offset: number }
}

type ActivityRow = StashActivity & { find: { id: string; name: string } | null }

export default function StashDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<StashDetailResponse | null>(null)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'finds' | 'activity'>('finds')
  const [working, setWorking] = useState(false)

  const PAGE_SIZE = 100
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, actRes] = await Promise.all([
        fetch(`/api/stashes/${id}?limit=${PAGE_SIZE}&offset=0`),
        fetch(`/api/stashes/${id}/activity`),
      ])
      const json = await res.json()
      const detail = unwrapApiResponse<StashDetailResponse>(json)
      if (!res.ok || !detail) {
        setError(json.error || 'Stash not found')
        setLoading(false)
        return
      }
      setData(detail)

      if (actRes.ok) {
        const actJson = await actRes.json()
        const rows = unwrapApiResponse<ActivityRow[]>(actJson) ?? []
        setActivity(rows)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadMore = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const currentLen = data?.finds.length ?? 0
      const res = await fetch(`/api/stashes/${id}?limit=${PAGE_SIZE}&offset=${currentLen}`)
      const json = await res.json()
      const detail = unwrapApiResponse<StashDetailResponse>(json)
      if (res.ok && detail) {
        setData((prev) => prev ? { ...detail, finds: [...prev.finds, ...detail.finds] } : detail)
      }
    } finally {
      setLoadingMore(false)
    }
  }, [id, data, loadingMore])

  useEffect(() => { load() }, [load])

  async function toggleArchive() {
    if (!data) return
    setWorking(true)
    try {
      await fetch(`/api/stashes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !data.stash.archived_at }),
      })
      load()
    } finally {
      setWorking(false)
    }
  }

  async function removeFind(findId: string) {
    setWorking(true)
    try {
      await fetch('/api/finds/bulk-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findIds: [findId], stashId: null }),
      })
      load()
    } finally {
      setWorking(false)
    }
  }

  if (loading) return <div className="p-6 text-sage-dim text-sm">Loading…</div>
  if (error) return <div className="p-6 text-red-600 text-sm">{error}</div>
  if (!data) return null

  const { stash, finds, pagination } = data
  const overCapacity = stash.capacity !== null && pagination.total > stash.capacity

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/stashes" className="inline-flex items-center gap-1 text-xs text-sage-dim hover:text-sage mb-4">
        <ArrowLeft className="w-3 h-3" /> All stashes
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-sage" />
            <h1 className="text-2xl font-semibold text-ink truncate">{stash.name}</h1>
            {stash.archived_at && (
              <span className="text-xs bg-sage-dim/10 text-sage-dim px-2 py-0.5 rounded">Archived</span>
            )}
          </div>
          {stash.note && <p className="text-sm text-sage-dim mt-1">{stash.note}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-sage-dim">
            <span>{pagination.total} {pagination.total === 1 ? 'item' : 'items'}</span>
            {stash.capacity !== null && (
              <span className={overCapacity ? 'text-red-600 font-medium' : ''}>
                capacity: {stash.capacity}{overCapacity ? ' (over)' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/stashes/${id}/label`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-sage/22 rounded hover:bg-cream-md"
            title="Print label"
          >
            <Printer className="w-3.5 h-3.5" /> Label
          </Link>
          <button
            onClick={toggleArchive}
            disabled={working}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-sage/22 rounded hover:bg-cream-md disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" /> {stash.archived_at ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-sage/14 mb-4">
        <button
          onClick={() => setTab('finds')}
          className={`px-4 py-2 text-sm border-b-2 ${tab === 'finds' ? 'border-sage text-sage font-medium' : 'border-transparent text-sage-dim'}`}
        >
          Items ({pagination.total})
        </button>
        <button
          onClick={() => setTab('activity')}
          className={`px-4 py-2 text-sm border-b-2 inline-flex items-center gap-1 ${tab === 'activity' ? 'border-sage text-sage font-medium' : 'border-transparent text-sage-dim'}`}
        >
          <Activity className="w-3.5 h-3.5" /> Recent activity{activity.length > 0 ? ` (${activity.length})` : ''}
        </button>
      </div>

      {tab === 'finds' && (
        finds.length === 0 ? (
          <div className="bg-white rounded-lg border border-sage/14 p-8 text-center text-sm text-sage-dim">
            No items in this stash yet.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-sage/14 divide-y divide-sage/10">
              {finds.map((f) => (
                <div key={f.id} className="p-3 flex items-center justify-between gap-3">
                  <Link href={`/finds/${f.id}`} className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate hover:text-sage">{f.name}</div>
                    <div className="text-xs text-sage-dim truncate">
                      {f.sku ?? 'no sku'} · {f.status}
                    </div>
                  </Link>
                  <button
                    onClick={() => removeFind(f.id)}
                    disabled={working}
                    className="p-2 text-sage-dim hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    title="Remove from stash"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {finds.length < pagination.total && (
              <div className="mt-3 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-xs border border-sage/22 rounded hover:bg-cream-md disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : `Load more (${pagination.total - finds.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )
      )}

      {tab === 'activity' && (
        activity.length === 0 ? (
          <div className="bg-white rounded-lg border border-sage/14 p-8 text-center text-sm text-sage-dim">
            No activity yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-sage/14 divide-y divide-sage/10">
            {activity.map((a) => (
              <div key={a.id} className="p-3 text-sm flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className={`inline-block text-[10px] uppercase font-medium px-1.5 py-0.5 rounded mr-2 ${
                    a.action === 'added' ? 'bg-green-100 text-green-700' :
                    a.action === 'removed' ? 'bg-red-100 text-red-700' :
                    a.action === 'merged' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{a.action}</span>
                  <span className="text-ink">{a.find?.name ?? '(deleted item)'}</span>
                  {a.note && <span className="text-xs text-sage-dim ml-2">{a.note}</span>}
                </div>
                <span className="text-xs text-sage-dim flex-shrink-0">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
