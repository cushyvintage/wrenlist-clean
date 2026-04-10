'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Package } from 'lucide-react'
import { fetchApi } from '@/lib/api-utils'
import { useApiCall } from '@/hooks/useApiCall'
import type { StashWithCount } from '@/types'

export default function StashesPage() {
  const { data: stashes, isLoading, error, call: refetch } = useApiCall<StashWithCount[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formNote, setFormNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    refetch(() => fetchApi<StashWithCount[]>('/api/stashes'))
  }, [refetch])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = formName.trim()
    if (!trimmed) return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/stashes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, note: formNote.trim() || null }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        setFormError(result.error || 'Failed to create stash')
        return
      }
      setFormName('')
      setFormNote('')
      setShowAddForm(false)
      refetch(() => fetchApi<StashWithCount[]>('/api/stashes'))
    } catch {
      setFormError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(stash: StashWithCount) {
    setEditingId(stash.id)
    setEditName(stash.name)
    setEditNote(stash.note || '')
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    try {
      const res = await fetch(`/api/stashes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, note: editNote.trim() || null }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        alert(result.error || 'Failed to update stash')
        return
      }
      setEditingId(null)
      refetch(() => fetchApi<StashWithCount[]>('/api/stashes'))
    } catch {
      alert('Network error')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/stashes/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok || !result.success) {
        alert(result.error || 'Failed to delete stash')
        return
      }
      setDeleteConfirm(null)
      refetch(() => fetchApi<StashWithCount[]>('/api/stashes'))
    } catch {
      alert('Network error')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Stashes</h1>
          <p className="text-sm text-sage-dim mt-1">Physical storage locations for your inventory.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm rounded hover:bg-sage-lt transition-colors"
          >
            <Plus className="w-4 h-4" /> New stash
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg border border-sage/14 p-4 mb-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Garage, Shelf 3, Attic box 1"
              maxLength={120}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Note (optional)</label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="e.g. Top shelf, behind the boxes"
              className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage"
            />
          </div>
          {formError && <div className="text-xs text-red-600">{formError}</div>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || !formName.trim()}
              className="px-4 py-2 bg-sage text-white text-sm rounded hover:bg-sage-lt transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create stash'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setFormName('')
                setFormNote('')
                setFormError(null)
              }}
              className="px-4 py-2 text-sm text-sage-dim hover:text-sage transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-sm text-sage-dim">Loading...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : !stashes || stashes.length === 0 ? (
        <div className="bg-white rounded-lg border border-sage/14 p-8 text-center">
          <Package className="w-8 h-8 mx-auto mb-3 text-sage-dim" />
          <div className="text-sm font-medium text-ink">No stashes yet</div>
          <div className="text-xs text-sage-dim mt-1">
            Create your first stash to organise where items are physically stored.
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-sage/14 divide-y divide-sage/10">
          {stashes.map((stash) => (
            <div key={stash.id} className="p-4">
              {editingId === stash.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={120}
                    className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage"
                  />
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveEdit(stash.id)}
                      className="px-3 py-1.5 bg-sage text-white text-xs rounded hover:bg-sage-lt"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs text-sage-dim hover:text-sage"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-sage flex-shrink-0" />
                      <span className="text-sm font-medium text-ink truncate">{stash.name}</span>
                      <span className="text-xs text-sage-dim flex-shrink-0">
                        {stash.item_count} {stash.item_count === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    {stash.note && (
                      <div className="text-xs text-sage-dim mt-1 ml-6 truncate">{stash.note}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(stash)}
                      className="p-2 text-sage-dim hover:text-sage hover:bg-cream-md rounded transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {deleteConfirm === stash.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(stash.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs text-sage-dim hover:text-sage"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(stash.id)}
                        className="p-2 text-sage-dim hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {stashes && stashes.length > 0 && (
        <p className="text-xs text-sage-dim mt-4">
          Deleting a stash keeps its finds — they just become unassigned.
        </p>
      )}
    </div>
  )
}
