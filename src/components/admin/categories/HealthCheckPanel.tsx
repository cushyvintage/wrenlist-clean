'use client'

import { useState, useEffect, useMemo } from 'react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { Platform } from '@/types'

interface Issue {
  type: 'missing_mapping' | 'non_leaf' | 'missing_required_fields' | 'no_field_requirements'
  platform: string
  detail: string
}

type Priority = 'critical' | 'high' | 'medium' | 'low'

interface HealthCategory {
  value: string
  label: string
  top_level: string
  issues: Issue[]
  score: number
  usage_count: number
  priority?: Priority
}

interface HealthData {
  total: number
  healthy: number
  withIssues: number
  totalIssues: number
  issuesByType: Record<string, number>
  criticalIssues: number
  highPriorityIssues: number
  unusedWithIssues: number
  totalUsedCategories: number
  categories: HealthCategory[]
}

interface HealthCheckPanelProps {
  onSelectCategory: (value: string) => void
}

const PRIORITY_BADGES: Record<Priority, { label: string; className: string }> = {
  critical: { label: 'CRITICAL', className: 'px-1.5 py-0.5 text-[10px] bg-red-100 text-red-800 rounded' },
  high: { label: 'HIGH', className: 'px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded' },
  medium: { label: 'MEDIUM', className: 'px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-800 rounded' },
  low: { label: 'LOW', className: 'px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded' },
}

const ISSUE_LABELS: Record<string, { label: string; color: string }> = {
  missing_mapping: { label: 'Missing mapping', color: 'bg-amber-100 text-amber-800' },
  non_leaf: { label: 'Non-leaf ID', color: 'bg-red-100 text-red-800' },
  missing_required_fields: { label: 'Missing fields', color: 'bg-orange-100 text-orange-800' },
  no_field_requirements: { label: 'No field rules', color: 'bg-purple-100 text-purple-800' },
}

export default function HealthCheckPanel({ onSelectCategory }: HealthCheckPanelProps) {
  const [data, setData] = useState<HealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetch('/api/admin/categories/health?issues_only=true')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.categories.filter((cat) => {
      if (!filterType && !filterPlatform) return true
      return cat.issues.some((issue) => {
        if (filterType && issue.type !== filterType) return false
        if (filterPlatform && issue.platform !== filterPlatform) return false
        return true
      })
    })
  }, [data, filterType, filterPlatform])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-sage/14 p-4">
        <div className="animate-pulse h-4 w-48 bg-cream-md rounded" />
      </div>
    )
  }

  if (!data) return null

  const healthPct = data.total > 0 ? Math.round((data.healthy / data.total) * 100) : 0

  return (
    <div className="bg-white rounded-lg border border-sage/14 overflow-hidden">
      {/* Summary header */}
      <div className="px-4 py-3 border-b border-sage/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-ink">Publish Health Check</h3>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-cream-md rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${healthPct >= 90 ? 'bg-emerald-500' : healthPct >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${healthPct}%` }}
              />
            </div>
            <span className="text-xs text-sage-dim">{data.healthy}/{data.total} healthy</span>
          </div>
        </div>
        <span className="text-xs text-sage-dim">
          {data.criticalIssues > 0 && <span className="text-red-700 font-medium">{data.criticalIssues} critical</span>}
          {data.criticalIssues > 0 && data.highPriorityIssues > 0 && ' \u00b7 '}
          {data.highPriorityIssues > 0 && <span className="text-amber-700 font-medium">{data.highPriorityIssues} high</span>}
          {(data.criticalIssues > 0 || data.highPriorityIssues > 0) && data.unusedWithIssues > 0 && ' \u00b7 '}
          {data.unusedWithIssues > 0 && `${data.unusedWithIssues} low`}
          {data.criticalIssues === 0 && data.highPriorityIssues === 0 && data.unusedWithIssues === 0 && `${data.withIssues} categories with ${data.totalIssues} issues`}
        </span>
      </div>

      {/* Issue type chips (filter) */}
      <div className="px-4 py-2 border-b border-sage/7 flex flex-wrap gap-1.5">
        <button
          onClick={() => { setFilterType(null); setFilterPlatform(null) }}
          className={`px-2 py-1 rounded text-xs transition-colors ${
            !filterType && !filterPlatform ? 'bg-sage text-white' : 'bg-cream-md text-sage-dim hover:bg-cream'
          }`}
        >
          All ({data.totalIssues})
        </button>
        {Object.entries(data.issuesByType).map(([type, count]) => {
          const meta = ISSUE_LABELS[type]
          return (
            <button
              key={type}
              onClick={() => { setFilterType(filterType === type ? null : type); setFilterPlatform(null) }}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filterType === type ? 'ring-2 ring-sage/50' : ''
              } ${meta?.color ?? 'bg-cream-md text-sage-dim'}`}
            >
              {meta?.label ?? type} ({count})
            </button>
          )
        })}
        <span className="text-sage/30 mx-1">|</span>
        {(['ebay', 'vinted', 'shopify', 'depop'] as Platform[]).map((p) => (
          <button
            key={p}
            onClick={() => { setFilterPlatform(filterPlatform === p ? null : p); setFilterType(null) }}
            className={`px-1.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              filterPlatform === p ? 'bg-sage/10 ring-2 ring-sage/50' : 'bg-cream-md text-sage-dim hover:bg-cream'
            }`}
          >
            <MarketplaceIcon platform={p} size="sm" />
          </button>
        ))}
      </div>

      {/* Issue list */}
      <div className="max-h-64 overflow-y-auto divide-y divide-sage/7">
        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-sage-dim">
            {data.withIssues === 0 ? 'All categories are publish-ready!' : 'No issues match this filter.'}
          </div>
        ) : (
          filtered.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onSelectCategory(cat.value)}
              className="w-full text-left px-4 py-2 hover:bg-cream/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-ink truncate">{cat.label}</span>
                  {cat.priority && (
                    <span className={PRIORITY_BADGES[cat.priority].className}>
                      {PRIORITY_BADGES[cat.priority].label}
                    </span>
                  )}
                  <span className="text-xs text-sage-dim font-mono truncate">{cat.top_level}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {cat.issues.map((issue, i) => {
                    const meta = ISSUE_LABELS[issue.type]
                    return (
                      <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] ${meta?.color ?? 'bg-cream-md text-sage-dim'}`}>
                        {issue.platform !== 'all' && (
                          <MarketplaceIcon platform={issue.platform as Platform} size="sm" />
                        )}{' '}
                        {meta?.label ?? issue.type}
                      </span>
                    )
                  })}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
