'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  cost_gbp: number | null
  sold_at: string | null
  category: string | null
  grossAmount: number
  netAmount: number
  serviceFee: number
  profit: number
  orderDate: string | null
}

interface PnL {
  totalRevenue: number
  totalFees: number
  totalNet: number
  totalCost: number
  totalProfit: number
}

interface CustomerDetailResponse {
  customer: Customer
  orders: OrderItem[]
  pnl: PnL
}

function formatDate(d: string | null): string {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data, isLoading, error, call } = useApiCall<CustomerDetailResponse>(null)
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      setDeleteError(null)
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/customers')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

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
        <Link href="/customers" className="text-xs text-sage hover:text-ink inline-flex items-center gap-1">&larr; Back to Customers</Link>
        <div className="bg-red-lt border border-red-dk/20 rounded p-4 text-sm text-red-dk">{error}</div>
      </div>
    )
  }

  if (!data) return null

  if (deleteConfirm) {
    const customerName = data.customer.full_name || data.customer.username || 'this customer'
    return (
      <div className="max-w-2xl mx-auto">
        <div
          className="p-8 rounded text-center"
          style={{
            backgroundColor: '#FFF9F3',
            borderWidth: '1px',
            borderColor: 'rgba(196,138,58,.2)',
          }}
        >
          <h2 className="text-lg font-medium mb-2" style={{ color: '#1E2E1C' }}>
            Delete &ldquo;{customerName}&rdquo;?
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6B7D6A' }}>
            This will permanently delete this customer record. This action cannot be undone.
          </p>
          {deleteError && (
            <p className="text-sm text-red-600 mb-4">{deleteError}</p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                borderWidth: '1px',
                borderColor: 'rgba(61,92,58,.22)',
                backgroundColor: 'transparent',
                color: '#3D5C3A',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#C4883A', color: '#FFF9F3' }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { customer: c, orders, pnl } = data
  const daysSinceFirst = c.first_order_at
    ? Math.round((Date.now() - new Date(c.first_order_at).getTime()) / 86400000)
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/customers" className="text-xs text-sage hover:text-ink mb-4 inline-flex items-center gap-1">&larr; Back to Customers</Link>

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
          <div className="mt-2">
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-xs text-red-600 hover:underline"
            >
              delete customer
            </button>
          </div>
        </div>
      </div>

      {/* P&L highlight */}
      {pnl && pnl.totalRevenue > 0 && (
        <div className={`flex items-center justify-between rounded-md border px-5 py-3 ${
          pnl.totalProfit > 0 ? 'bg-green-50 border-green-200' : pnl.totalProfit < 0 ? 'bg-red-50 border-red-200' : 'bg-cream border-border'
        }`}>
          <div>
            <span className="text-xs text-ink-lt">profit from this customer</span>
            <span className={`ml-3 text-xl font-mono font-semibold ${
              pnl.totalProfit > 0 ? 'text-green-700' : pnl.totalProfit < 0 ? 'text-red-700' : 'text-ink'
            }`}>
              {pnl.totalProfit >= 0 ? '+' : ''}£{pnl.totalProfit.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-lt">
            <span>£{pnl.totalRevenue.toFixed(2)} revenue</span>
            {pnl.totalFees > 0 && <span>£{pnl.totalFees.toFixed(2)} fees</span>}
            <span>£{pnl.totalCost.toFixed(2)} cost</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Stats */}
        <Panel title="overview">
          <div className="flex justify-between items-baseline py-2 border-b border-border">
            <span className="text-xs text-ink-lt">total orders</span>
            <span className="text-sm font-mono">{c.total_orders}</span>
          </div>
          <div className="flex justify-between items-baseline py-2 border-b border-border">
            <span className="text-xs text-ink-lt">total revenue</span>
            <span className="text-sm font-mono">£{(pnl?.totalRevenue ?? Number(c.total_spent_gbp)).toFixed(2)}</span>
          </div>
          {pnl && pnl.totalFees > 0 && (
            <div className="flex justify-between items-baseline py-2 border-b border-border">
              <span className="text-xs text-ink-lt">platform fees</span>
              <span className="text-sm font-mono text-red-600">-£{pnl.totalFees.toFixed(2)}</span>
            </div>
          )}
          {pnl && (
            <div className="flex justify-between items-baseline py-2 border-b border-border">
              <span className="text-xs text-ink-lt">net received</span>
              <span className="text-sm font-mono">£{pnl.totalNet.toFixed(2)}</span>
            </div>
          )}
          {pnl && (
            <div className="flex justify-between items-baseline py-2 border-b border-border">
              <span className="text-xs text-ink-lt">total cost</span>
              <span className="text-sm font-mono">£{pnl.totalCost.toFixed(2)}</span>
            </div>
          )}
          {pnl && (
            <div className="flex justify-between items-baseline py-2 border-b border-border">
              <span className="text-xs text-ink-lt">profit</span>
              <span className={`text-sm font-mono font-medium ${pnl.totalProfit > 0 ? 'text-green-600' : pnl.totalProfit < 0 ? 'text-red-600' : ''}`}>
                £{pnl.totalProfit.toFixed(2)}
              </span>
            </div>
          )}
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
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-mono text-ink block">
                    £{o.grossAmount.toFixed(2)}
                  </span>
                  <span className={`text-[11px] font-mono ${o.profit > 0 ? 'text-green-600' : o.profit < 0 ? 'text-red-600' : 'text-ink-lt'}`}>
                    {o.profit >= 0 ? '+' : ''}£{o.profit.toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
