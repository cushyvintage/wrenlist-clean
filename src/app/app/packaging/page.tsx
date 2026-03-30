'use client'

import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { useState } from 'react'

interface Material {
  id: string
  name: string
  sku: string
  category: 'mailers' | 'protection' | 'boxes' | 'presentation' | 'branding'
  inStock: number
  minStock: number
  costPerUnit: number
  supplier: string
  level: 'low' | 'ok'
}

const mockMaterials: Material[] = [
  {
    id: '1',
    name: 'Poly mailers 12×16"',
    sku: 'PKG-PM-1216',
    category: 'mailers',
    inStock: 8,
    minStock: 50,
    costPerUnit: 0.22,
    supplier: 'Packhub',
    level: 'low',
  },
  {
    id: '2',
    name: 'Bubble wrap medium',
    sku: 'PKG-BW-MD',
    category: 'protection',
    inStock: 1,
    minStock: 3,
    costPerUnit: 4.80,
    supplier: 'Amazon',
    level: 'low',
  },
  {
    id: '3',
    name: 'Cardboard boxes — small',
    sku: 'PKG-BOX-SM',
    category: 'boxes',
    inStock: 34,
    minStock: 20,
    costPerUnit: 0.65,
    supplier: 'Staples',
    level: 'ok',
  },
  {
    id: '4',
    name: 'Tissue paper — white',
    sku: 'PKG-TP-WH',
    category: 'presentation',
    inStock: 200,
    minStock: 50,
    costPerUnit: 0.05,
    supplier: 'Wickes',
    level: 'ok',
  },
  {
    id: '5',
    name: 'Wrenlist thank-you cards',
    sku: 'PKG-CARD-WR',
    category: 'branding',
    inStock: 85,
    minStock: 30,
    costPerUnit: 0.12,
    supplier: 'Moo.com',
    level: 'ok',
  },
]

const costByCategory = {
  'clothing (standard)': 0.32,
  'footwear': 0.68,
  'bags / accessories': 0.44,
}

export default function PackagingPage() {
  const [searchTerm] = useState('')

  const filteredMaterials = mockMaterials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lowStockCount = mockMaterials.filter(m => m.level === 'low').length
  const totalMaterials = mockMaterials.length
  const monthlySpend = mockMaterials.reduce((sum, m) => sum + (m.inStock * m.costPerUnit), 0)
  const avgCostPerItem = 0.38
  const itemsShipped = 127

  const getStockPercentage = (inStock: number, minStock: number) => {
    return Math.min(100, (inStock / minStock) * 100)
  }

  const getCategoryColor = (level: 'low' | 'ok') => {
    return level === 'low' ? 'text-red-500' : 'text-sage'
  }

  return (
    <div className="space-y-6">
      {/* Alert */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 bg-red-lt border border-red/20 rounded-md p-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
            <circle cx="8" cy="8" r="7" stroke="#C0392B" strokeWidth="1.3" />
            <path d="M8 5v4M8 11v.5" stroke="#C0392B" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-red">
            <strong>{lowStockCount} packaging materials</strong> are running low — <strong>Bubble wrap (medium)</strong> and <strong>Poly mailers 12×16"</strong> need reordering.
          </span>
          <button className="ml-auto text-xs font-medium px-3 py-2 bg-red text-white rounded hover:bg-red-dk transition">
            reorder now
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="materials tracked"
          value={totalMaterials}
          delta="across 4 categories"
          suffix=""
        />
        <StatCard
          label="monthly spend"
          value={Math.round(monthlySpend * 100) / 100}
          prefix="£"
          delta={`£${avgCostPerItem} avg per item`}
          suffix=""
        />
        <StatCard
          label="items shipped"
          value={itemsShipped}
          delta="this month"
          suffix=""
        />
        <StatCard
          label="low stock alerts"
          value={lowStockCount}
          delta={lowStockCount > 0 ? 'reorder needed' : 'all good'}
          suffix=""
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Stock table */}
        <div className="col-span-2">
          <Panel title="stock levels" action={{ text: "update stock" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-sage-dim font-medium border-b border-sage/14">
                  <tr>
                    <th className="text-left py-3 px-0">material</th>
                    <th className="text-left py-3 px-0">category</th>
                    <th className="text-left py-3 px-0">in stock</th>
                    <th className="text-left py-3 px-0">min stock</th>
                    <th className="text-left py-3 px-0">level</th>
                    <th className="text-right py-3 px-0">cost / unit</th>
                    <th className="text-left py-3 px-0">supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/14">
                  {filteredMaterials.map((material) => (
                    <tr key={material.id} className="hover:bg-cream-md transition">
                      <td className="py-3 px-0">
                        <div className="font-medium text-ink">{material.name}</div>
                        <div className="text-xs text-sage-dim">SKU: {material.sku}</div>
                      </td>
                      <td className="py-3 px-0 text-ink-lt text-xs capitalize">{material.category}</td>
                      <td className={`py-3 px-0 text-sm ${material.level === 'low' ? 'text-red' : 'text-ink'}`}>
                        {material.inStock} {material.category === 'protection' ? 'roll' : 'left'}
                      </td>
                      <td className="py-3 px-0 font-mono text-xs text-sage-dim">{material.minStock}</td>
                      <td className="py-3 px-0">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-sage/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${material.level === 'low' ? 'bg-amber' : 'bg-sage'}`}
                              style={{ width: `${getStockPercentage(material.inStock, material.minStock)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${getCategoryColor(material.level)}`}>
                            {material.level.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-0 font-mono text-ink">{material.costPerUnit.toFixed(2)}</td>
                      <td className="py-3 px-0 text-xs text-sage-dim">{material.supplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Right: Cost breakdown */}
        <div className="space-y-4">
          <Panel title="cost per item sold">
            <div className="space-y-3 text-sm p-4">
              {Object.entries(costByCategory).map(([category, cost]) => (
                <div key={category} className="flex justify-between">
                  <span className="text-ink-lt">{category}</span>
                  <span className="font-mono">{cost.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-sage/14 pt-3 font-medium text-ink">
                <span>avg per item</span>
                <span className="font-mono">{avgCostPerItem.toFixed(2)}</span>
              </div>
            </div>
          </Panel>

          <Panel title="link to find types" action={{ text: "configure" }}>
            <div className="p-4 text-xs text-ink-lt leading-relaxed">
              Packaging is automatically matched to find categories. Footwear uses small boxes + bubble wrap. Clothing uses poly mailers + tissue paper.
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
