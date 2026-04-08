'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/admin'
import { CategoryFieldConfig } from '@/types'

export default function CategoryConfigAdminPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [configs, setConfigs] = useState<CategoryFieldConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingFields, setEditingFields] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Admin gate
  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (!user || !isAdmin(user.email)) {
    return null
  }

  // Fetch all configs
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/category-config')

        if (!response.ok) {
          throw new Error('Failed to fetch category configs')
        }

        const data = await response.json()
        setConfigs(Array.isArray(data) ? data : data.data || [])
        setError(null)
      } catch (err) {
        setError((err as any).message || 'Failed to load configs')
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfigs()
  }, [])

  // Start editing
  const handleEdit = (config: CategoryFieldConfig) => {
    setEditingId(config.id)
    setEditingFields(JSON.stringify(config.fields, null, 2))
  }

  // Save changes
  const handleSave = async (configId: string) => {
    setIsSaving(true)
    try {
      let fieldsObject
      try {
        fieldsObject = JSON.parse(editingFields)
      } catch {
        throw new Error('Invalid JSON in fields')
      }

      const response = await fetch(`/api/admin/category-config/${configId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldsObject }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error((errorData as any).error || 'Failed to save config')
      }

      const updatedConfig = await response.json()
      setConfigs((prev) =>
        prev.map((c) => (c.id === configId ? updatedConfig : c))
      )
      setEditingId(null)
      setError(null)
    } catch (err) {
      setError((err as any).message || 'Failed to save config')
    } finally {
      setIsSaving(false)
    }
  }

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null)
    setEditingFields('')
  }

  if (!isLoading && !error && !configs.length) {
    return (
      <div className="min-h-screen bg-cream p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-ink mb-6">Category Configuration</h1>
          <p className="text-sage-dim">No category configurations found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-ink mb-6">Category Configuration</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-sage-dim">Loading...</div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className="bg-white rounded-lg border border-sage/14 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      {config.category} × {config.marketplace}
                    </h3>
                    {config.platform_category_id && (
                      <p className="text-xs text-sage-dim mt-1">
                        Platform ID: {config.platform_category_id}
                      </p>
                    )}
                  </div>
                  {editingId !== config.id && (
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-sm text-sage hover:text-ink transition-colors underline"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingId === config.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editingFields}
                      onChange={(e) => setEditingFields(e.target.value)}
                      className="w-full px-3 py-2 border border-sage/14 rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sage/30"
                      rows={12}
                      disabled={isSaving}
                    />
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-3 py-1 text-xs border border-sage/14 rounded hover:bg-cream-md transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(config.id)}
                        disabled={isSaving}
                        className="px-3 py-1 text-xs bg-sage text-white rounded hover:bg-sage-lt transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-cream-md rounded p-3 text-xs font-mono overflow-x-auto">
                    <pre>{JSON.stringify(config.fields, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
