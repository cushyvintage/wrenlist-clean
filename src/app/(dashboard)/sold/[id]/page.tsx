'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Panel } from '@/components/wren/Panel'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import DeleteConfirmModal from '@/components/inventory/DeleteConfirmModal'
import { useApiCall } from '@/hooks/useApiCall'
import { fetchApi, parseApiError } from '@/lib/api-utils'
import { getCategoryNode } from '@/data/marketplace-category-map'
import type { Platform, FindCondition, Customer } from '@/types'

interface SoldDetail {
  id: string
  name: string
  category: string | null
  brand: string | null
  size: string | null
  colour: string | null
  condition: FindCondition | null
  description: string | null
  cost_gbp: number | null
  asking_price_gbp: number | null
  sold_price_gbp: number | null
  sourced_at: string | null
  sold_at: string | null
  photos: string[] | null
  sku: string | null
  source_type: string | null
  source_name: string | null
  created_at: string
  sale: {
    marketplace: string
    platformListingId: string | null
    platformListingUrl: string | null
    listingPrice: number | null
    buyer: string | null
    shipmentStatus: string | null
    grossAmount: number | null
    serviceFee: number | null
    netAmount: number | null
    trackingNumber: string | null
    carrier: string | null
    shippingCost: number | null
    taxAmount: number | null
    discount: number | null
    refundAmount: number | null
    buyerPaid: number | null
    isGift: boolean
    giftMessage: string | null
    receiptItems: Array<{
      transactionId?: string; listingId?: string; title?: string
      imageUrl?: string; cost?: number; quantity?: number; isCancelled?: boolean
      review?: { rating: number; text?: string; date?: string; url?: string }
    }> | null
    shippingAddress: {
      name?: string | null; firstLine?: string | null; secondLine?: string | null;
      city?: string | null; state?: string | null; country?: string | null; zip?: string | null;
    } | null
    orderDate: string | null
  }
  customer: Customer | null
}

const CONDITION_LABELS: Record<string, string> = {
  new_with_tags: 'New with tags',
  new_without_tags: 'New without tags',
  very_good: 'Very good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

const SHIPMENT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
  'in transit': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'In Transit' },
  'label sent': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Label Sent' },
  shipped: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Shipped' },
  refunded: { bg: 'bg-red-100', text: 'text-red-800', label: 'Refunded' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
}

/** Normalise Vinted status strings like "Package delivered." → "delivered" */
function normaliseShipmentStatus(raw: string): string {
  const s = raw.toLowerCase().replace(/\.$/, '').trim()
  if (s.includes('delivered')) return 'delivered'
  if (s.includes('in transit') || s.includes('on its way')) return 'in transit'
  if (s.includes('label sent') || s.includes('shipping label')) return 'label sent'
  if (s.includes('shipped')) return 'shipped'
  if (s.includes('refund')) return 'refunded'
  if (s.includes('cancel')) return 'cancelled'
  return s
}

function ShipmentBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-ink-lt text-sm">--</span>
  const key = normaliseShipmentStatus(status)
  const style = SHIPMENT_STYLES[key] || { bg: 'bg-cream', text: 'text-ink-lt', label: status }
  return (
    <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-border last:border-0">
      <span className="text-xs text-ink-lt">{label}</span>
      <span className="text-sm text-ink text-right">{children}</span>
    </div>
  )
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '--'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCategory(slug: string | null): string {
  if (!slug) return '--'
  const node = getCategoryNode(slug)
  return node?.label || slug.replace(/_/g, ' ')
}

export default function SoldDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { data, isLoading, error, call } = useApiCall<SoldDetail>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      setDeleteError(null)
      const res = await fetch(`/api/sold/${id}`, { method: 'DELETE' })
      if (!res.ok) await parseApiError(res, 'Failed to delete')
      router.push('/sold')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    call(() => fetchApi<SoldDetail>(`/api/sold/${id}`))
  }, [call, id])

  useEffect(() => {
    if (data) document.title = `${data.name} — Sold | Wrenlist`
  }, [data])

  if (isLoading) {
    return <div className="text-center py-16 text-ink-lt">Loading...</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/sold" className="text-xs text-sage hover:text-ink inline-flex items-center gap-1">&larr; Back to Sold</Link>
        <div className="bg-red-lt border border-red-dk/20 rounded p-4 text-sm text-red-dk">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  if (deleteConfirm) {
    return (
      <DeleteConfirmModal
        itemName={data.name}
        message="This will permanently delete this sold record. This action cannot be undone."
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    )
  }

  const { sale } = data
  const profit = sale.netAmount != null && data.cost_gbp != null
    ? sale.netAmount - data.cost_gbp
    : data.sold_price_gbp != null && data.cost_gbp != null
      ? data.sold_price_gbp - data.cost_gbp
      : null
  const marginPct = data.sold_price_gbp && data.cost_gbp
    ? Math.round(((data.sold_price_gbp - data.cost_gbp) / data.sold_price_gbp) * 100)
    : null
  const daysListed = data.sourced_at && data.sold_at
    ? Math.round((new Date(data.sold_at).getTime() - new Date(data.sourced_at).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const roiPct = profit != null && data.cost_gbp && data.cost_gbp > 0
    ? Math.round((profit / data.cost_gbp) * 100)
    : null
  const photos = (data.photos || []).filter((p): p is string => !!p)
  const hasItemDetails = !!(data.brand || data.size || data.colour || data.condition || data.source_type || data.sourced_at || data.asking_price_gbp != null)

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/sold" className="text-xs text-sage hover:text-ink mb-4 inline-flex items-center gap-1">&larr; Back to Sold</Link>

      {/* Profit highlight */}
      {profit != null && (
        <div className={`flex items-center justify-between rounded-md border px-5 py-3 ${
          profit > 0 ? 'bg-green-50 border-green-200' : profit < 0 ? 'bg-red-50 border-red-200' : 'bg-cream border-border'
        }`}>
          <div>
            <span className="text-xs text-ink-lt">profit on this sale</span>
            <span className={`ml-3 text-xl font-mono font-semibold ${
              profit > 0 ? 'text-green-700' : profit < 0 ? 'text-red-700' : 'text-ink'
            }`}>
              {profit >= 0 ? '+' : ''}£{profit.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {marginPct != null && (
              <span className="text-ink-lt">{marginPct}% margin</span>
            )}
            {roiPct != null && (
              <span className="text-ink-lt">{roiPct}% ROI</span>
            )}
          </div>
        </div>
      )}

      {/* Header: photos + title */}
      <div className="flex gap-5">
        {/* Photo */}
        {photos.length > 0 ? (
          <div className="flex gap-2 flex-shrink-0">
            <Image
              src={photos[0]!}
              alt={data.name}
              width={120}
              height={120}
              className="rounded-md object-cover"
              style={{ width: 120, height: 120 }}
              unoptimized
            />
            {photos.length > 1 && (
              <div className="flex flex-col gap-2">
                {photos.slice(1, 4).map((url, i) => url ? (
                  <Image
                    key={i}
                    src={url}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded object-cover"
                    style={{ width: 36, height: 36 }}
                    unoptimized
                  />
                ) : null)}
                {photos.length > 4 && (
                  <span className="text-[10px] text-ink-lt text-center">+{photos.length - 4}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="w-[120px] h-[120px] rounded-md bg-cream-dk flex-shrink-0" />
        )}

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-serif text-ink leading-tight">{data.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            {sale.marketplace !== 'unknown' && (
              <MarketplaceIcon platform={sale.marketplace as Platform} size="sm" />
            )}
            <span className="text-xs text-ink-lt">{formatCategory(data.category)}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-lt">
            {data.sku && <span>SKU: <span className="font-mono text-ink">{data.sku}</span></span>}
            {sale.platformListingId && (
              <span>ID: <span className="font-mono text-ink">{sale.platformListingId}</span></span>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={`/finds/${data.id}`}
              className="text-xs text-sage hover:underline"
            >
              edit item &rarr;
            </Link>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-xs text-red-600 hover:underline"
            >
              delete
            </button>
          </div>
        </div>
      </div>

      {/* Panels grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Order Summary */}
        <Panel title="order summary">
          <DetailRow label="sold date">{formatDate(data.sold_at)}</DetailRow>
          <DetailRow label="marketplace">
            <span className="inline-flex items-center gap-1.5">
              {sale.marketplace !== 'unknown' && (
                <MarketplaceIcon platform={sale.marketplace as Platform} size="sm" />
              )}
              {sale.marketplace}
            </span>
          </DetailRow>
          <DetailRow label="buyer">
            {data.customer ? (
              <Link href={`/customers/${data.customer.id}`} className="text-sage hover:underline">
                {data.customer.full_name || data.customer.username || sale.buyer || '--'}
              </Link>
            ) : (
              sale.buyer || '--'
            )}
          </DetailRow>
          {sale.platformListingUrl && (
            <DetailRow label="listing">
              <a
                href={sale.platformListingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage hover:underline"
              >
                view on {sale.marketplace} &rarr;
              </a>
            </DetailRow>
          )}
          <DetailRow label="shipment">
            <ShipmentBadge status={sale.shipmentStatus} />
          </DetailRow>
          {sale.trackingNumber && (
            <DetailRow label="tracking">
              <span className="font-mono text-xs">{sale.trackingNumber}</span>
            </DetailRow>
          )}
          {sale.carrier && (
            <DetailRow label="carrier">{sale.carrier}</DetailRow>
          )}
          {sale.isGift && (
            <DetailRow label="gift">
              <span className="text-xs">
                {sale.giftMessage ? `"${sale.giftMessage}"` : 'Yes'}
              </span>
            </DetailRow>
          )}
        </Panel>

        {/* Financials */}
        <Panel title="financials">
          <DetailRow label="sold price">
            <span className="font-mono font-medium">
              {data.sold_price_gbp != null ? `£${data.sold_price_gbp.toFixed(2)}` : '--'}
            </span>
          </DetailRow>
          {sale.grossAmount != null && (
            <DetailRow label="gross amount">
              <span className="font-mono">£{sale.grossAmount.toFixed(2)}</span>
            </DetailRow>
          )}
          {sale.serviceFee != null && sale.serviceFee > 0 && sale.grossAmount != null && sale.netAmount != null && sale.grossAmount !== sale.netAmount && (
            <DetailRow label="service fee">
              <span className="font-mono text-red-600">-£{sale.serviceFee.toFixed(2)}</span>
            </DetailRow>
          )}
          {sale.shippingCost != null && sale.shippingCost > 0 && (
            <DetailRow label="shipping">
              <span className="font-mono">+£{sale.shippingCost.toFixed(2)}</span>
            </DetailRow>
          )}
          {sale.taxAmount != null && sale.taxAmount > 0 && (
            <DetailRow label="tax">
              <span className="font-mono text-ink-lt">£{sale.taxAmount.toFixed(2)}</span>
            </DetailRow>
          )}
          {sale.discount != null && sale.discount > 0 && (
            <DetailRow label="discount">
              <span className="font-mono text-amber-600">-£{sale.discount.toFixed(2)}</span>
            </DetailRow>
          )}
          {sale.refundAmount != null && sale.refundAmount > 0 && (
            <DetailRow label="refund">
              <span className="font-mono text-red-600">-£{sale.refundAmount.toFixed(2)}</span>
            </DetailRow>
          )}
          {sale.netAmount != null && (
            <DetailRow label="net received">
              <span className="font-mono font-medium">£{sale.netAmount.toFixed(2)}</span>
            </DetailRow>
          )}
          <DetailRow label="cost price">
            <span className="font-mono">
              {data.cost_gbp != null ? `£${data.cost_gbp.toFixed(2)}` : '--'}
            </span>
          </DetailRow>
          <DetailRow label="profit">
            <span className={`font-mono font-medium ${profit != null && profit > 0 ? 'text-green-600' : profit != null && profit < 0 ? 'text-red-600' : ''}`}>
              {profit != null ? `£${profit.toFixed(2)}` : '--'}
            </span>
          </DetailRow>
          <DetailRow label="margin">
            <span className={`font-mono ${marginPct != null && marginPct > 0 ? 'text-green-600' : ''}`}>
              {marginPct != null ? `${marginPct}%` : '--'}
            </span>
          </DetailRow>
          {roiPct != null && (
            <DetailRow label="ROI">
              <span className={`font-mono ${roiPct > 0 ? 'text-green-600' : roiPct < 0 ? 'text-red-600' : ''}`}>
                {roiPct}%
              </span>
            </DetailRow>
          )}
          {daysListed != null && (
            <DetailRow label="days listed">
              {daysListed} {daysListed === 1 ? 'day' : 'days'}
            </DetailRow>
          )}
        </Panel>

        {/* Customer */}
        {data.customer && (
          <Panel title="customer">
            <div className="flex items-start gap-3 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-cream text-sm font-serif flex-shrink-0">
                {(data.customer.full_name || data.customer.username || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{data.customer.full_name || data.customer.username}</p>
                {data.customer.email && (
                  <a href={`mailto:${data.customer.email}`} className="text-xs text-sage hover:underline block">{data.customer.email}</a>
                )}
                {data.customer.phone && <p className="text-xs text-ink-lt">{data.customer.phone}</p>}
              </div>
            </div>
            {data.customer.address_line1 && (
              <div className="py-2 border-b border-border text-xs text-ink leading-relaxed">
                <p>{data.customer.address_line1}</p>
                {data.customer.address_line2 && <p>{data.customer.address_line2}</p>}
                <p>{[data.customer.city, data.customer.postcode].filter(Boolean).join(', ')}</p>
                {data.customer.country && <p>{data.customer.country}</p>}
              </div>
            )}
            {data.customer.total_orders > 1 && (
              <div className="py-2 border-b border-border">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-800">
                  Repeat customer &middot; {data.customer.total_orders} orders &middot; £{Number(data.customer.total_spent_gbp).toFixed(2)}
                </span>
              </div>
            )}
            <div className="pt-2">
              <Link href={`/customers/${data.customer.id}`} className="text-xs text-sage hover:underline">
                view customer &rarr;
              </Link>
            </div>
          </Panel>
        )}

        {/* Shipping address from sale data (when customer has no address stored) */}
        {!data.customer?.address_line1 && sale.shippingAddress && (sale.shippingAddress.firstLine || sale.shippingAddress.city) && (
          <Panel title="shipping address">
            <div className="text-xs text-ink leading-relaxed">
              {sale.shippingAddress.name && <p className="font-medium">{sale.shippingAddress.name}</p>}
              {sale.shippingAddress.firstLine && <p>{sale.shippingAddress.firstLine}</p>}
              {sale.shippingAddress.secondLine && <p>{sale.shippingAddress.secondLine}</p>}
              <p>{[sale.shippingAddress.city, sale.shippingAddress.state, sale.shippingAddress.zip].filter(Boolean).join(', ')}</p>
              {sale.shippingAddress.country && <p>{sale.shippingAddress.country}</p>}
            </div>
          </Panel>
        )}

        {/* Item Details */}
        {hasItemDetails && (
          <Panel title="item details">
            {data.brand && <DetailRow label="brand">{data.brand}</DetailRow>}
            {data.size && <DetailRow label="size">{data.size}</DetailRow>}
            {data.colour && <DetailRow label="colour">{data.colour}</DetailRow>}
            {data.condition && (
              <DetailRow label="condition">
                {CONDITION_LABELS[data.condition] || data.condition}
              </DetailRow>
            )}
            {data.source_type && (
              <DetailRow label="sourced from">
                {data.source_name
                  ? `${data.source_name} (${data.source_type.replace(/_/g, ' ')})`
                  : data.source_type.replace(/_/g, ' ')}
              </DetailRow>
            )}
            {data.sourced_at && (
              <DetailRow label="sourced date">{formatDate(data.sourced_at)}</DetailRow>
            )}
            {data.asking_price_gbp != null && (
              <DetailRow label="asking price">
                <span className="font-mono">£{data.asking_price_gbp.toFixed(2)}</span>
              </DetailRow>
            )}
          </Panel>
        )}
      </div>

      {/* Reviews from receipt items (full width) */}
      {sale.receiptItems?.some((i) => i.review) && (
        <Panel title="buyer review">
          {sale.receiptItems!.filter((i) => i.review).map((item, idx) => (
            <div key={idx} className="py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-sm">
                  {'★'.repeat(item.review!.rating)}{'☆'.repeat(5 - item.review!.rating)}
                </span>
                <span className="text-xs text-ink-lt">
                  {item.review!.date ? formatDate(item.review!.date) : ''}
                </span>
              </div>
              {item.review!.text && (
                <p className="text-sm text-ink mt-1 italic">&ldquo;{item.review!.text}&rdquo;</p>
              )}
              {item.title && sale.receiptItems!.filter((i) => i.review).length > 1 && (
                <p className="text-xs text-ink-lt mt-1">Re: {item.title}</p>
              )}
            </div>
          ))}
        </Panel>
      )}

      {/* Description (full width) */}
      {data.description && (
        <Panel title="description">
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{data.description}</p>
        </Panel>
      )}
    </div>
  )
}
