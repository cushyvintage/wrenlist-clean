'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Panel } from '@/components/wren/Panel'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { useApiCall } from '@/hooks/useApiCall'
import { fetchApi } from '@/lib/api-utils'
import type { Platform, FindCondition } from '@/types'

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
  }
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

function ShipmentBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-ink-lt text-sm">--</span>
  const key = status.toLowerCase()
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
  return slug
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' > ')
}

export default function SoldDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { data, isLoading, error, call } = useApiCall<SoldDetail>(null)

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
        <Link href="/sold" className="text-xs text-sage hover:underline">&larr; back to sold</Link>
        <div className="bg-red-lt border border-red-dk/20 rounded p-4 text-sm text-red-dk">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

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
  const photos = (data.photos || []).filter((p): p is string => !!p)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link href="/sold" className="inline-flex items-center gap-1 text-xs text-sage hover:underline">
        &larr; back to sold
      </Link>

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
          {/* Edit link */}
          <Link
            href={`/finds/${data.id}`}
            className="inline-block mt-2 text-xs text-sage hover:underline"
          >
            edit item &rarr;
          </Link>
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
          <DetailRow label="buyer">{sale.buyer || '--'}</DetailRow>
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
          {sale.serviceFee != null && (
            <DetailRow label="service fee">
              <span className="font-mono text-red-600">-£{sale.serviceFee.toFixed(2)}</span>
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
          {daysListed != null && (
            <DetailRow label="days listed">
              {daysListed} {daysListed === 1 ? 'day' : 'days'}
            </DetailRow>
          )}
        </Panel>

        {/* Item Details */}
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


      </div>

      {/* Description (full width) */}
      {data.description && (
        <Panel title="description">
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{data.description}</p>
        </Panel>
      )}
    </div>
  )
}
