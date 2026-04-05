'use client'

import { useState } from 'react'
import type { VintedStoredMetadata } from '@/types/vinted-metadata'
import {
  COLOR_MAP,
  PACKAGE_SIZE_MAP,
  ATTR_DECODERS,
  decodeAttribute,
  attributeLabel,
} from '@/lib/vinted-attribute-maps'

interface VintedMetadataPanelProps {
  metadata: VintedStoredMetadata
}

export default function VintedMetadataPanel({ metadata }: VintedMetadataPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const colorsDisplay = metadata.color_titles?.length
    ? metadata.color_titles.join(', ')
    : metadata.color_ids?.length
      ? metadata.color_ids.map((id) => COLOR_MAP[id] ?? String(id)).join(', ')
      : '—'

  const packageDisplay = metadata.package_size_id
    ? `${PACKAGE_SIZE_MAP[metadata.package_size_id] ?? String(metadata.package_size_id)}${metadata.shipping?.weight_grams ? ` (${(metadata.shipping.weight_grams / 1000).toFixed(1)} kg)` : ''}`
    : '—'

  const statusDisplay = metadata.is_draft || metadata.status_id === 2 ? 'Draft' : 'Active'

  return (
    <div
      className="p-4 rounded"
      style={{
        backgroundColor: '#EDE8DE',
        borderWidth: '1px',
        borderColor: 'rgba(61,92,58,.14)',
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition"
        type="button"
      >
        <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
          Vinted Data
        </p>
        <span className="text-xs" style={{ color: '#8A9E88' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          className="mt-3 space-y-1.5 border-t pt-3"
          style={{ borderColor: 'rgba(61,92,58,.14)' }}
        >
          {/* Category */}
          {metadata.catalog_id && (
            <MetaRow label="Category" value={String(metadata.catalog_id)} />
          )}

          {/* Brand */}
          {(metadata.brand_title || metadata.brand_id) && (
            <MetaRow
              label="Brand"
              value={
                metadata.brand_title
                  ? `${metadata.brand_title}${metadata.brand_id ? ` (${metadata.brand_id})` : ''}`
                  : metadata.brand_id
                    ? String(metadata.brand_id)
                    : '—'
              }
            />
          )}

          {/* Colours */}
          <MetaRow label="Colours" value={colorsDisplay} />

          {/* Size */}
          {metadata.size_id && (
            <MetaRow
              label="Size"
              value={
                metadata.size_title ? `${metadata.size_title} (${metadata.size_id})` : String(metadata.size_id)
              }
            />
          )}

          {/* Package */}
          <MetaRow label="Package" value={packageDisplay} />

          {/* ISBN */}
          {metadata.isbn && <MetaRow label="ISBN" value={metadata.isbn} />}

          {/* Item Attributes */}
          {metadata.item_attributes?.map((attr, idx) => (
            <MetaRow
              key={idx}
              label={attributeLabel(attr.code)}
              value={decodeAttribute(attr.code, attr.ids)}
            />
          ))}

          {/* Status */}
          <MetaRow label="Status" value={statusDisplay} />
        </div>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 text-xs" style={{ color: '#8A9E88' }}>
        {label}
      </span>
      <span className="text-xs flex-1 break-words" style={{ color: '#1E2E1C' }}>
        {value}
      </span>
    </div>
  )
}
