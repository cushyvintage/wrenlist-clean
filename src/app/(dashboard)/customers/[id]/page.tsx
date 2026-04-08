'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Panel } from '@/components/wren/Panel'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { useApiCall } from '@/hooks/useApiCall'
import { fetchApi } from '@/lib/api-utils'
import type { Customer, Platform } from '@/types'

interface OrderItem {
  id: string
  name: string
  photos: string[] | null
  sold_price_gbp: number | null
  sold_at: string | null
  category: string | null
  grossAmount: number | null
  orderDate: string | null
}

interface CustomerDetailResponse {
  customer: Customer
  orders: OrderItem[]
}

function formatDate(d: string | null): string {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const { data, isLoading, error, call } = useApiCall<CustomerDetailResponse>(null)
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  useEffect(() => {
    call(() => fetchApi<CustomerDetailResponse>(`/api/customers/${id}`))
  }, [call, id])

  useEffect(() => {
    if (data?.customer) {
      setNotes(data.customer.notes || '')
      document.title = `${data.customer.full_name || data.customer.username || 'Customer'} | Wrenlist`
    }
  }, [data])

  const saveNotes = useCallback(async () => {
    setNotesSaving(true)
    try {
      await fetchApi(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } finally {
      setNotesSaving(false)
    }
  }, [id, notes])

  if (isLoading) return <div className="text-center py-16 text-ink-lt">Loading...</div>

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/customers" className="text-xs text-sage hover:underline">&larr; back to customers</Link>
        <div className="bg-red-lt border border-red-dk/20 rounded p-4 text-sm text-red-dk">{error}</div>
      </div>
    )
  }

  if (!data) return null

  const { customer: c, orders } = data
  const daysSinceFirst = c.first_order_at
    ? Math.round((Date.now() - new Date(c.first_order_at).getTime()) / 86400000)
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/customers" className="inline-flex items-center gap-1 text-xs text-sage hover:underline">
        &larr; back to customers
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center text-cream text-xl font-serif flex-shrink-0">
          {(c.full_name || c.username || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-serif text-ink">{c.full_name || c.username || 'Unknown'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <MarketplaceIcon platform={c.marketplace as Platform} size="sm" />
            {c.username && <span className="text-xs text-ink-lt">@{c.username}</span>}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-lt">
            {c.email && <a href={`mailto:${c.email}`} className="text-sage hover:underline">{c.email}</a>}
            {c.phone && <span>{c.phone}</span>}
          </div>
          {c.total_orders >= 2 && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Repeat customer &middot; {c.total_orders} orders &middot; £{Number(c.total_spent_gbp).toFixed(2)} total
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Stats */}
        <Panel title="overview">
          <div className="flex justify-between items-baseline py-2 border-b border-border">
            <span className="text-xs text-ink-lt">total orders</span>
            <span className="text-sm font-mono">{c.total_orders}</span>
          </div>
          <div className="flex justify-between items-baseline py-2 border-b border-border">
            <span className="text-xs text-ink-lt">total spent</span>
            <span className="text-sm font-mono">£{Number(c.total_spent_gbp).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline py-2 border-b border-border">
            <span className="text-xs text-ink-lt">first order</span>
            <span className="text-sm">{formatDate(c.first_order_at)}</span>
          </div>
          <div className="flex justify-between items-baseline py-2 border-b border-border">
            <span className="text-xs text-ink-lt">last order</span>
            <span className="text-sm">{formatDate(c.last_order_at)}</span>
          </div>
          {daysSinceFirst != null && (
            <div className="flex justify-between items-baseline py-2">
              <span className="text-xs text-ink-lt">customer for</span>
              <span className="text-sm">{daysSinceFirst} days</span>
            </div>
          )}
        </Panel>

        {/* Address */}
        <Panel title="shipping address">
          {c.address_line1 ? (
            <div className="text-sm text-ink leading-relaxed">
              {c.full_name && <p className="font-medium">{c.full_name}</p>}
              <p>{c.address_line1}</p>
              {c.address_line2 && <p>{c.address_line2}</p>}
              <p>{[c.city, c.postcode].filter(Boolean).join(', ')}</p>
              {c.country && <p>{c.country}</p>}
            </div>
          ) : (
            <p className="text-sm text-ink-lt">No address on file</p>
          )}
        </Panel>
      </div>

      {/* Notes */}
      <Panel title="notes">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about this customer..."
          className="w-full text-sm border border-border rounded p-2 min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-sage bg-white"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={saveNotes}
            disabled={notesSaving}
            className="px-3 py-1 text-xs font-medium rounded border border-sage text-sage hover:bg-sage hover:text-white transition disabled:opacity-50"
          >
            {notesSaving ? 'Saving...' : 'Save notes'}
          </button>
          {notesSaved && <span className="text-xs text-green-600">Saved</span>}
        </div>
      </Panel>

      {/* Order History */}
      {orders.length > 0 && (
        <Panel title={`order history (${orders.length})`}>
          <div className="space-y-0">
            {orders.map(o => (
              <Link
                key={o.id}
                href={`/sold/${o.id}`}
                className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-cream-md transition px-1 -mx-1 rounded"
              >
                {o.photos?.[0] ? (
                  <Image src={o.photos[0]} alt="" width={36} height={36} className="rounded object-cover" style={{ width: 36, height: 36 }} unoptimized />
                ) : (
                  <div className="w-9 h-9 rounded bg-cream-dk flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{o.name}</p>
                  <p className="text-xs text-ink-lt">{formatDate(o.orderDate || o.sold_at)}</p>
                </div>
                <span className="text-sm font-mono text-ink">
                  £{(o.grossAmount ?? o.sold_price_gbp ?? 0).toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
