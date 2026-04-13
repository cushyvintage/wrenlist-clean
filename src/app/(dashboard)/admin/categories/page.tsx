'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/admin'
import type { CategoryRow } from '@/types'
import CategoryStats from '@/components/admin/categories/CategoryStats'
import CategorySidebar from '@/components/admin/categories/CategorySidebar'
import CategoryTable from '@/components/admin/categories/CategoryTable'
import CategoryDetailPanel from '@/components/admin/categories/CategoryDetailPanel'
import FreshnessBanner from '@/components/admin/categories/FreshnessBanner'
import HealthCheckPanel from '@/components/admin/categories/HealthCheckPanel'
import { useCategoryTree } from '@/hooks/useCategoryTree'

interface StatsData {
  total: number
  platformCoverage: Record<string, { mapped: number; total: number; pct: number }>
  topLevelCounts: Record<string, number>
  fieldRequirementRows: number
}

export default function AdminCategoriesPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const { invalidate: invalidateCategoryCache } = useCategoryTree()

  // Data
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Filters
  const [selectedTopLevel, setSelectedTopLevel] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Editor
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Admin gate
  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedTopLevel) params.set('top_level', selectedTopLevel)
      const res = await fetch(`/api/admin/categories?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setCategories(json.data ?? [])
    } catch {
      // silent — empty state handled in UI
    } finally {
      setIsLoading(false)
    }
  }, [selectedTopLevel])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/admin/categories/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const json = await res.json()
      setStats(json)
    } catch {
      // silent
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { fetchStats() }, [fetchStats])

  // Derived: top-level counts for sidebar
  const topLevels = useMemo(() => {
    if (!stats?.topLevelCounts) return []
    return Object.entries(stats.topLevelCounts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [stats])

  // Filter by search (client-side since we already have all data)
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories.filter(
      (c) => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)
    )
  }, [categories, search])

  // Handlers
  const handleSave = async (data: Partial<CategoryRow> & { value: string }) => {
    const isNew = isCreating
    const method = isNew ? 'POST' : 'PATCH'
    const res = await fetch('/api/admin/categories', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to save')
    }
    setEditingCategory(null)
    setIsCreating(false)
    invalidateCategoryCache()
    await Promise.all([fetchCategories(), fetchStats()])
  }

  const handleDelete = async (value: string) => {
    const res = await fetch('/api/admin/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to delete')
    }
    setEditingCategory(null)
    invalidateCategoryCache()
    await Promise.all([fetchCategories(), fetchStats()])
  }

  const handleClose = () => {
    setEditingCategory(null)
    setIsCreating(false)
  }

  // Bulk action handler
  const handleBulkAction = useCallback(async (values: string[], action: string) => {
    if (action === 'import_fields') {
      alert('Coming soon')
      return
    }

    if (action === 'delete') {
      if (!window.confirm(`Delete ${values.length} categories? This cannot be undone.`)) return
      setIsLoading(true)
      try {
        for (const value of values) {
          const res = await fetch('/api/admin/categories', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || `Failed to delete ${value}`)
          }
        }
        invalidateCategoryCache()
        await Promise.all([fetchCategories(), fetchStats()])
      } catch (err) {
        alert(`Delete failed: ${(err as Error).message}`)
      } finally {
        setIsLoading(false)
      }
      return
    }

    if (action === 'auto_match_vinted' || action === 'auto_match_ebay') {
      const platform = action === 'auto_match_vinted' ? 'vinted' : 'ebay'
      setIsLoading(true)
      try {
        const res = await fetch('/api/admin/categories/ai-match-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryValues: values, platform }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Batch AI match failed')
        }
        const data = await res.json() as {
          results: Array<{
            categoryValue: string
            suggestion: { id: string; name: string; path: string; confidence: string } | null
            error?: string
          }>
        }
        const matched = data.results.filter((r) => r.suggestion && !r.error).length
        const failed = data.results.filter((r) => r.error).length
        alert(`AI match complete: ${matched} matched, ${data.results.length - matched - failed} no match, ${failed} errors`)
        await Promise.all([fetchCategories(), fetchStats()])
      } catch (err) {
        alert(`AI match failed: ${(err as Error).message}`)
      } finally {
        setIsLoading(false)
      }
      return
    }
  }, [fetchCategories, fetchStats])

  if (!user || !isAdmin(user.email)) return null

  return (
    <div className="bg-cream p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-ink">Category Management</h1>
          <span className="text-xs text-sage-dim">Admin</span>
        </div>

        {/* Freshness banner */}
        <FreshnessBanner />

        {/* Stats */}
        <CategoryStats stats={stats} isLoading={statsLoading} />

        {/* Health check */}
        <HealthCheckPanel
          onSelectCategory={(value) => {
            // Find the category in loaded data and open it
            const cat = categories.find((c) => c.value === value)
            if (cat) {
              setEditingCategory(cat)
              setIsCreating(false)
            }
          }}
        />

        {/* Main layout: sidebar + table */}
        <div className="flex gap-4">
          <CategorySidebar
            topLevels={topLevels}
            selected={selectedTopLevel}
            onSelect={setSelectedTopLevel}
          />
          <CategoryTable
            categories={isLoading ? [] : filteredCategories}
            search={search}
            onSearchChange={setSearch}
            onSelect={(cat) => {
              setEditingCategory(cat)
              setIsCreating(false)
            }}
            onAdd={() => {
              setEditingCategory(null)
              setIsCreating(true)
            }}
            onBulkAction={handleBulkAction}
          />
        </div>
      </div>

      {/* Detail panel (slide-out) */}
      {(editingCategory || isCreating) && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40" onClick={handleClose} />
          <CategoryDetailPanel
            category={editingCategory}
            isNew={isCreating}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={handleClose}
          />
        </>
      )}
    </div>
  )
}
