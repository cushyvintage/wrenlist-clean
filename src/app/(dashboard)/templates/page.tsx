'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Edit2, X, Copy } from 'lucide-react'

interface Template {
  id: string
  name: string
  category?: string
  condition?: string
  brand?: string
  platform_fields?: Record<string, string>
  marketplaces: string[]
  default_price?: number
  usage_count: number
  created_at: string
  updated_at: string
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
  timestamp: number
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Template>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const platformLabels: Record<string, string> = {
    ebay: 'eBay',
    vinted: 'Vinted',
    etsy: 'Etsy',
    shopify: 'Shopify',
  }

  useEffect(() => {
    document.title = 'Templates | Wrenlist'
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/templates')
      if (!response.ok) {
        throw new Error('Failed to load templates')
      }
      const { data } = await response.json()
      setTemplates(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates'
      setError(message)
      addToast(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = `toast-${Date.now()}`
    const toast: Toast = { id, message, type, timestamp: Date.now() }
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  const startEdit = (template: Template) => {
    setEditingId(template.id)
    setEditForm({
      name: template.name,
      category: template.category,
      condition: template.condition,
      brand: template.brand,
      marketplaces: template.marketplaces,
      default_price: template.default_price,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async () => {
    if (!editingId) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/templates/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        const { error: apiError } = await response.json()
        throw new Error(apiError || 'Failed to update template')
      }

      const { data: updatedTemplate } = await response.json()
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingId ? updatedTemplate : t))
      )
      setEditingId(null)
      setEditForm({})
      addToast('Template updated', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template'
      addToast(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/templates/${deleteConfirm}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const { error: apiError } = await response.json()
        throw new Error(apiError || 'Failed to delete template')
      }

      // Optimistic update
      setTemplates((prev) => prev.filter((t) => t.id !== deleteConfirm))
      setDeleteConfirm(null)
      addToast('Template deleted', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template'
      addToast(message, 'error')
      // Refetch on error
      fetchTemplates()
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: '2-digit',
      year: '2-digit',
    })
  }

  const fieldCount = (template: Template) => {
    return template.platform_fields ? Object.keys(template.platform_fields).length : 0
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Create button */}
      <div className="border-b border-sage/14 pb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl italic text-ink mb-2">templates</h1>
          <p className="text-sm text-ink-lt">Reuse listing fields across finds to speed up the add-find flow</p>
        </div>
        <button
          onClick={() => router.push('/add-find?saveAsTemplate=true')}
          className="px-4 py-2 text-sm bg-sage text-white rounded hover:bg-sage-lt transition-colors"
        >
          + Create template
        </button>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-amber/10 border border-amber/30 rounded p-4 flex justify-between items-center">
          <div className="text-sm text-amber">{error}</div>
          <button
            onClick={fetchTemplates}
            className="text-xs font-medium text-amber hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 text-ink-lt">
          Loading templates...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && templates.length === 0 && !error && (
        <div className="text-center py-12 px-6 bg-white border border-sage/14 rounded-md">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sage-dim text-sm mb-4">No templates yet</p>
          <button
            onClick={() => router.push('/add-find?saveAsTemplate=true')}
            className="px-4 py-2 bg-sage text-cream rounded text-sm font-medium hover:bg-sage-lt transition-colors"
          >
            Create your first template
          </button>
        </div>
      )}

      {/* Templates Table */}
      {!isLoading && templates.length > 0 && (
        <div className="bg-white border border-sage/14 rounded-md overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-cream border-b border-sage/14">
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                  Platforms
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                  Used
                </th>
                <th className="px-6 py-3 text-right text-xs uppercase tracking-wider font-medium text-sage-dim">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-sage/14 hover:bg-cream transition-colors">
                  {editingId === template.id ? (
                    <>
                      <td colSpan={7} className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-4">
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              placeholder="Template name"
                              className="px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
                            />
                            <input
                              type="text"
                              value={editForm.category || ''}
                              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                              placeholder="Category (optional)"
                              className="px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
                            />
                            <input
                              type="text"
                              value={editForm.condition || ''}
                              onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                              placeholder="Condition (optional)"
                              className="px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              disabled={isSaving}
                              className="px-4 py-2 bg-sage text-cream rounded text-sm font-medium hover:bg-sage-dk disabled:opacity-50 transition"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-2 border border-sage/14 bg-white text-ink rounded text-sm font-medium hover:bg-cream transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="text-sm font-medium text-ink">
                            {template.name}
                          </div>
                          {template.default_price && (
                            <div className="text-xs text-sage-dim">
                              Price: £{template.default_price.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {template.category ? (
                          <span className="inline-block px-2 py-1 bg-sage/10 text-sage text-xs rounded">
                            {template.category}
                          </span>
                        ) : (
                          <span className="text-ink-lt">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-lt">
                        {template.marketplaces.length > 0
                          ? template.marketplaces.map((p) => platformLabels[p] || p).join(', ')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-ink">
                        {template.usage_count} {template.usage_count === 1 ? 'time' : 'times'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => router.push(`/add-find?templateId=${template.id}`)}
                            className="p-2 hover:bg-sage/10 rounded transition"
                            title="Apply to new find"
                          >
                            <Copy width={16} height={16} className="text-ink-lt hover:text-ink" />
                          </button>
                          <button
                            onClick={() => startEdit(template)}
                            className="p-2 hover:bg-sage/10 rounded transition"
                            title="Edit template"
                          >
                            <Edit2 width={16} height={16} className="text-ink-lt hover:text-ink" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(template.id)}
                            className="p-2 hover:bg-red/10 rounded transition"
                            title="Delete template"
                          >
                            <Trash2 width={16} height={16} className="text-ink-lt hover:text-red" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-6 max-w-sm border border-sage/14">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-ink">Delete template?</h3>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="p-1 hover:bg-cream rounded"
              >
                <X width={16} height={16} />
              </button>
            </div>
            <p className="text-sm text-ink-lt mb-6">
              This action cannot be undone. The template will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-sage/14 bg-white text-ink rounded text-sm font-medium hover:bg-cream transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red text-white rounded text-sm font-medium hover:bg-red-dk disabled:opacity-50 transition"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-40">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-sage text-cream'
                : 'bg-red text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
