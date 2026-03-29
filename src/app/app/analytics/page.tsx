'use client'

import { useState } from 'react'
import { StatCard } from '@/components/wren/StatCard'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'

type TimePeriod = 'month' | '3months' | 'all'

// Mock data
const monthlyData = [
  { month: 'Oct', revenue: 1300, percentage: 40 },
  { month: 'Nov', revenue: 1800, percentage: 55 },
  { month: 'Dec', revenue: 1600, percentage: 48 },
  { month: 'Jan', revenue: 2000, percentage: 62 },
  { month: 'Feb', revenue: 2300, percentage: 70 },
  { month: 'Mar', revenue: 3200, percentage: 100, highlight: true },
]

const platformData = [
  { platform: 'eBay UK', revenue: 1420, percentage: 44 },
  { platform: 'Vinted', revenue: 980, percentage: 30 },
  { platform: 'Etsy', revenue: 580, percentage: 18 },
  { platform: 'Shopify', revenue: 260, percentage: 8 },
]

const sourceData = [
  { source: 'House clearances', revenue: 1280, margin: 94, days: '8.2' },
  { source: 'Charity shops', revenue: 940, margin: 67, days: '13.1' },
  { source: 'Car boots', revenue: 620, margin: 82, days: '10.4' },
  { source: 'Online hauls', revenue: 400, margin: 71, days: '14.6' },
]

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between pb-4 border-b border-sage/14">
        <h1 className="font-serif text-2xl italic text-ink">analytics</h1>
        <div className="flex gap-2">
          {[
            { value: 'month' as const, label: 'this month' },
            { value: '3months' as const, label: '3 months' },
            { value: 'all' as const, label: 'all time' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimePeriod(value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                timePeriod === value
                  ? 'bg-sage-pale border border-sage text-sage'
                  : 'bg-white border border-sage/14 text-ink-lt hover:bg-cream-md'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total revenue"
          value="£3,240"
          delta="+18% vs last month"
          suffix=""
        />
        <StatCard label="Avg margin" value="68%" delta="up from 61%" suffix="" />
        <StatCard
          label="Items sold"
          value="34"
          delta="avg £95.29 per item"
          suffix=""
        />
      </div>

      {/* Charts and tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly revenue chart - spans 2 columns */}
        <div className="lg:col-span-2">
          <Panel title="monthly revenue">
            <div className="space-y-4">
              {/* Bar chart */}
              <div className="flex items-end gap-2 h-40 px-2">
                {monthlyData.map((item) => (
                  <div
                    key={item.month}
                    className="flex-1 flex flex-col items-center gap-1.5"
                  >
                    {/* Value label */}
                    <div
                      className={`text-xs font-mono font-medium ${
                        item.highlight ? 'text-sage' : 'text-ink-md'
                      }`}
                    >
                      £{(item.revenue / 1000).toFixed(1)}k
                    </div>

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t ${
                        item.highlight ? 'bg-sage' : 'bg-sage-pale'
                      }`}
                      style={{ height: `${item.percentage}%` }}
                    />

                    {/* Month label */}
                    <div
                      className={`text-xs font-medium ${
                        item.highlight ? 'text-sage' : 'text-ink-lt'
                      }`}
                    >
                      {item.month} {item.highlight ? '↑' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* By Platform table */}
        <Panel title="by platform">
          <table className="w-full text-sm">
            <tbody>
              {platformData.map((item, idx) => (
                <tr
                  key={item.platform}
                  className={`border-b border-sage/14 ${
                    idx === platformData.length - 1 ? 'border-0' : ''
                  }`}
                >
                  <td className="py-3 px-3 text-ink-md">{item.platform}</td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    £{item.revenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs font-medium text-sage-lt">
                    {item.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Bottom section - By Source + Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Source table - spans 2 columns */}
        <div className="lg:col-span-2">
          <Panel title="by source">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-sage-dim font-medium border-b border-sage/14">
                <tr>
                  <th className="text-left py-3 px-3">source</th>
                  <th className="text-right py-3 px-3">revenue</th>
                  <th className="text-right py-3 px-3">avg margin</th>
                  <th className="text-right py-3 px-3">avg days</th>
                </tr>
              </thead>
              <tbody>
                {sourceData.map((item, idx) => (
                  <tr
                    key={item.source}
                    className={`border-b border-sage/14 ${
                      idx === sourceData.length - 1 ? 'border-0' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-ink-md">{item.source}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      £{item.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-medium text-green-700">
                      {item.margin}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      {item.days}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Insight card */}
        <InsightCard
          text="House clearances deliver 40% faster sell-through and 27 points more margin than charity shops. Your next sourcing trip should prioritise them."
          link={{ text: 'view sourcing recommendations →', onClick: () => {} }}
        />
      </div>
    </div>
  )
}
