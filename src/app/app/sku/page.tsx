'use client'

import { Panel } from '@/components/wren/Panel'
import { useState } from 'react'

interface SKUEntry {
  id: string
  sku: string
  barcode: string
  itemName: string
  category: string
  price: number
  createdAt: string
}

const mockSKUs: SKUEntry[] = [
  {
    id: '1',
    sku: 'WR-DNM-260329-001',
    barcode: '5901234123457',
    itemName: "Levi's 501 Denim — 32W",
    category: 'denim',
    price: 45.00,
    createdAt: '29 Mar 2026',
  },
  {
    id: '2',
    sku: 'WR-CLO-260328-001',
    barcode: '5901234123458',
    itemName: 'Carhartt Detroit Jacket — M',
    category: 'clothing',
    price: 145.00,
    createdAt: '28 Mar 2026',
  },
  {
    id: '3',
    sku: 'WR-FTW-260327-001',
    barcode: '5901234123459',
    itemName: 'Nike Air Max 90 — UK 10',
    category: 'footwear',
    price: 95.00,
    createdAt: '27 Mar 2026',
  },
  {
    id: '4',
    sku: 'WR-BAG-260326-001',
    barcode: '5901234123460',
    itemName: 'Vintage leather tote bag',
    category: 'bags',
    price: 65.00,
    createdAt: '26 Mar 2026',
  },
]

const categoryCodeMap: Record<string, string> = {
  'denim': 'DNM',
  'clothing': 'CLO',
  'footwear': 'FTW',
  'bags': 'BAG',
  'accessories': 'ACC',
  'vintage': 'VTG',
}

export default function SKUPage() {
  const [pattern, setPattern] = useState('WR-{CAT}-{DATE}-{SEQ}')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSKUs = mockSKUs.filter(sku =>
    sku.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.barcode.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Left: SKU Configuration */}
        <div className="space-y-4">
          <Panel title="SKU pattern" action={{ text: "save changes" }}>
            <div className="p-5 space-y-4">
              {/* Pattern Template */}
              <div>
                <label className="block text-xs font-medium text-ink-lt uppercase tracking-wide mb-2">
                  pattern template
                </label>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full px-3 py-2 bg-cream-md border border-sage/14 rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-sage"
                />
                <div className="text-xs text-ink-lt mt-2">
                  Tokens: {'{CAT}'} = category, {'{DATE}'} = YYMMDD, {'{SEQ}'} = sequence, {'{BRAND}'} = brand initials
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-xs font-medium text-ink-lt uppercase tracking-wide mb-2">
                  preview
                </label>
                <div className="font-mono text-lg px-3 py-2 bg-cream-md border border-sage/14 rounded text-ink tracking-wider">
                  WR-DNM-260329-042
                </div>
              </div>

              {/* Category Codes */}
              <div>
                <label className="block text-xs font-medium text-ink-lt uppercase tracking-wide mb-2">
                  category codes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(categoryCodeMap).map(([cat, code]) => (
                    <div key={cat} className="flex justify-between items-center px-3 py-2 bg-cream-md border border-sage/14 rounded text-sm">
                      <span className="text-ink-lt capitalize">{cat}</span>
                      <span className="font-mono font-medium text-ink">{code}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {/* Barcode Settings */}
          <Panel title="barcode format" action={{ text: "configure" }}>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-lt uppercase tracking-wide mb-2">
                  barcode type
                </label>
                <select className="w-full px-3 py-2 bg-cream-md border border-sage/14 rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-sage">
                  <option>EAN-13 (standard)</option>
                  <option>Code-128</option>
                  <option>UPC-A</option>
                  <option>QR Code</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-lt uppercase tracking-wide mb-2">
                  auto-generate barcodes?
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="barcode-auto" defaultChecked />
                    <span className="text-sm text-ink">Yes, for each SKU</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="barcode-auto" />
                    <span className="text-sm text-ink">Manual entry</span>
                  </label>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right: Recent SKUs */}
        <div>
          <Panel title="recent SKUs">
            <div className="p-5 space-y-3 border-b border-sage/14">
              <input
                type="text"
                placeholder="search SKU, barcode, or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-cream-md border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:ring-1 focus:ring-sage"
              />
            </div>

            <div className="divide-y divide-sage/14 max-h-96 overflow-y-auto">
              {filteredSKUs.map((sku) => (
                <div key={sku.id} className="p-4 hover:bg-cream-md transition">
                  <div className="font-medium text-ink text-sm mb-1">{sku.itemName}</div>
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="text-ink-lt">SKU</div>
                      <div className="font-mono text-ink font-medium">{sku.sku}</div>
                    </div>
                    <div>
                      <div className="text-ink-lt">Barcode</div>
                      <div className="font-mono text-ink text-xs">{sku.barcode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-ink-lt">{sku.category}</div>
                      <div className="font-mono text-ink font-medium">£{sku.price.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="text-xs text-ink-lt mt-2">Created {sku.createdAt}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Export */}
      <div className="bg-cream-md border border-sage/14 rounded p-4 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-ink">Export SKU data</h3>
          <p className="text-sm text-ink-lt mt-1">Download all SKUs and barcodes in CSV format for backup or import to third-party tools.</p>
        </div>
        <button className="px-4 py-2 border border-sage/22 bg-white text-ink rounded text-sm font-medium hover:bg-cream-md transition flex-shrink-0">
          ↓ Export CSV
        </button>
      </div>
    </div>
  )
}
