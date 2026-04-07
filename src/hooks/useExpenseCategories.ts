'use client'

import { useState, useEffect, useMemo } from 'react'
import { unwrapApiResponse } from '@/lib/api-utils'

export interface ExpenseCategoryOption {
  id: string
  label: string
  sort_order: number
}

// Module-level cache so multiple components share the same data
let cachedCategories: ExpenseCategoryOption[] | null = null

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategoryOption[]>(cachedCategories ?? [])
  const [isLoading, setIsLoading] = useState(!cachedCategories)

  useEffect(() => {
    if (cachedCategories) return

    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/expense-categories')
        if (!res.ok) throw new Error('Failed to fetch categories')
        const data = await res.json()
        const cats = unwrapApiResponse<ExpenseCategoryOption[]>(data)
        cachedCategories = cats
        setCategories(cats)
      } catch {
        // Fallback to hardcoded if API fails
        const fallback: ExpenseCategoryOption[] = [
          { id: 'packaging', label: 'Packaging', sort_order: 1 },
          { id: 'postage', label: 'Postage', sort_order: 2 },
          { id: 'platform_fees', label: 'Platform fees', sort_order: 3 },
          { id: 'supplies', label: 'Supplies', sort_order: 4 },
          { id: 'vehicle', label: 'Vehicle', sort_order: 5 },
          { id: 'other', label: 'Other', sort_order: 6 },
        ]
        cachedCategories = fallback
        setCategories(fallback)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const labelsMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const cat of categories) {
      map[cat.id] = cat.label
    }
    return map
  }, [categories])

  return { categories, labelsMap, isLoading }
}
