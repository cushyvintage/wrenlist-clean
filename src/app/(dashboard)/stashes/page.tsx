'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Edit2, Package, Archive, ChevronRight, GitMerge } from 'lucide-react'
import { fetchApi } from '@/lib/api-utils'
import { useApiCall } from '@/hooks/useApiCall'
import { SkeletonRow } from '@/components/ui/Skeleton'
import type { StashWithCount } from '@/types'

type MergeState = { sources: Set<string>; target: string | null }

export default function StashesPage() {
  const { data: stashes, isLoading, error, call: refetch } = useApiCall<StashWithCount[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formCapacity, setFormCapacity] = useState('')
  const [formParent, setFormParent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editCapacity, setEditCapacity] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)

  const [mergeMode, setMergeMode] = useState(false)
  const [merge, setMerge] = useState<MergeState>({ sources: new Set(), target: null })
  const [mergeError, setMergeError] = useState<string | null>(null)

  const load = useCallback(() => {
    refetch(() => fetchApi<StashWithCount[]>(`/api/stashes?includeArchived=${showArchived ? 1 : 0}`))
  }, [refetch, showArchived])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = formName.trim()
    if (!trimmed) return
    setSubmitting(true)
    setFormError(null)
    try {
      const capacityNum = formCapacity ? parseInt(formCapacity, 10) : null
      if (capacityNum !== null && (!Number.isInteger(capacityNum) || capacityNum <= 0)) {
        setFormError('Capacity must be a positive number')
        setSubmitting(false)
        return
      }
      const res = await fetch('/api/stashes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          note: formNote.trim() || null,
          capacity: capacityNum,
          parent_stash_id: formParent || null,
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        setFormError(result.error || 'Failed to create stash')
        return
      }
      setFormName(''); setFormNote(''); setFormCapacity(''); setFormParent('')
      setShowAddForm(false)
      load()
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
    setEditCapacity(stash.capacity?.toString() ?? '')
    setEditError(null)
    setRowError(null)
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    setEditError(null)
    try {
      const capacityNum = editCapacity ? parseInt(editCapacity, 10) : null
      if (capacityNum !== null && (!Number.isInteger(capacityNum) || capacityNum <= 0)) {
        setEditError('Capacity must be a positive number')
        return
      }
      const res = await fetch(`/api/stashes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          note: editNote.trim() || null,
          capacity: capacityNum,
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        setEditError(result.error || 'Failed to update stash')
        return
      }
      setEditingId(null)
      load()
    } catch {
      setEditError('Network error')
    }
  }

  async function handleDelete(id: string) {
    setRowError(null)
    try {
      const res = await fetch(`/api/stashes/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok || !result.success) {
        setRowError({ id, message: result.error || 'Failed to delete stash' })
        return
      }
      setDeleteConfirm(null)
      load()
    } catch {
      setRowError({ id, message: 'Network error' })
    }
  }

  async function toggleArchive(stash: StashWithCount) {
    try {
      await fetch(`/api/stashes/${stash.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !stash.archived_at }),
      })
      load()
    } catch { /* silent */ }
  }

  function toggleMergeSource(id: string) {
    setMerge((prev) => {
      const sources = new Set(prev.sources)
      if (sources.has(id)) sources.delete(id)
      else sources.add(id)
      return { ...prev, sources, target: prev.target === id ? null : prev.target }
    })
  }

  async function executeMerge() {
    setMergeError(null)
    if (!merge.target || merge.sources.size === 0) {
      setMergeError('Pick one or more sources and a target')
      return
    }
    try {
      const res = await fetch('/api/stashes/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceIds: Array.from(merge.sources),
          targetId: merge.target,
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        setMergeError(result.error || 'Merge failed')
        return
      }
      setMerge({ sources: new Set(), target: null })
      setMergeMode(false)
      load()
    } catch {
      setMergeError('Network error')
    }
  }

  // Build nested tree — roots first, then children grouped under parents
  const rootStashes = (stashes ?? []).filter((s) => !s.parent_stash_id)
  const childrenByParent = new Map<string, StashWithCount[]>()
  for (const s of stashes ?? []) {
    if (s.parent_stash_id) {
      if (!childrenByParent.has(s.parent_stash_id)) childrenByParent.set(s.parent_stash_id, [])
      childrenByParent.get(s.parent_stash_id)!.push(s)
    }
  }

  const renderStashRow = (stash: StashWithCount, depth: number) => {
    const isOver = stash.capacity !== null && stash.item_count > stash.capacity
    const isSource = merge.sources.has(stash.id)
    const isTarget = merge.target === stash.id
    const children = childrenByParent.get(stash.id) ?? []

    return (
      <div key={stash.id}>
        <div className={`p-4 ${isSource ? 'bg-purple-50' : isTarget ? 'bg-green-50' : ''}`} style={{ paddingLeft: 16 + depth * 20 }}>
          {editingId === stash.id ? (
            <div className="space-y-2">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={120} className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage" />
              <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note (optional)" className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage" />
              <input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} placeholder="Capacity (optional)" min={1} className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage" />
              {editError && <div className="text-xs text-red-600">{editError}</div>}
              <div className="flex items-center gap-2">
                <button onClick={() => handleSaveEdit(stash.id)} className="px-3 py-1.5 bg-sage text-white text-xs rounded hover:bg-sage-lt">Save</button>
                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-sage-dim hover:text-sage">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {mergeMode && (
                  <>
                    <label className="flex items-center gap-1 text-[10px] text-sage-dim">
                      <input type="checkbox" checked={isSource} onChange={() => toggleMergeSource(stash.id)} disabled={isTarget} />
                      src
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-sage-dim">
                      <input type="radio" name="mergeTarget" checked={isTarget} onChange={() => setMerge((p) => ({ ...p, target: stash.id, sources: new Set([...p.sources].filter((s) => s !== stash.id)) }))} />
                      tgt
                    </label>
                  </>
                )}
                {depth > 0 && <ChevronRight className="w-3 h-3 text-sage-dim flex-shrink-0" />}
                <Package className={`w-4 h-4 flex-shrink-0 ${stash.archived_at ? 'text-sage-dim/50' : 'text-sage'}`} />
                <Link href={`/stashes/${stash.id}`} className="text-sm font-medium text-ink truncate hover:text-sage">
                  {stash.name}
                </Link>
                <span className={`text-xs flex-shrink-0 ${isOver ? 'text-red-600 font-medium' : 'text-sage-dim'}`}>
                  {stash.item_count}{stash.capacity !== null && `/${stash.capacity}`} items{isOver ? ' · over' : ''}
                </span>
                {stash.archived_at && <span className="text-[10px] bg-sage-dim/10 text-sage-dim px-1.5 py-0.5 rounded">archived</span>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleArchive(stash)} className="p-2 text-sage-dim hover:text-sage hover:bg-cream-md rounded" title={stash.archived_at ? 'Unarchive' : 'Archive'}>
                  <Archive className="w-4 h-4" />
                </button>
                <button onClick={() => startEdit(stash)} className="p-2 text-sage-dim hover:text-sage hover:bg-cream-md rounded" title="Rename">
                  <Edit2 className="w-4 h-4" />
                </button>
                {deleteConfirm === stash.id ? (
                  <>
                    <button onClick={() => handleDelete(stash.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Confirm</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs text-sage-dim hover:text-sage">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setDeleteConfirm(stash.id)} className="p-2 text-sage-dim hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
          {stash.note && editingId !== stash.id && <div className="text-xs text-sage-dim mt-1 ml-6 truncate">{stash.note}</div>}
          {rowError?.id === stash.id && <div className="text-xs text-red-600 mt-1 ml-6">{rowError.message}</div>}
        </div>
        {children.map((c) => renderStashRow(c, depth + 1))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Stashes</h1>
          <p className="text-sm text-sage-dim mt-1">Physical storage locations for your inventory.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1 text-xs text-sage-dim">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
          <button
            onClick={() => { setMergeMode((m) => !m); setMerge({ sources: new Set(), target: null }); setMergeError(null) }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded ${mergeMode ? 'bg-purple-600 text-white' : 'border border-sage/22 text-sage-dim hover:bg-cream-md'}`}
          >
            <GitMerge className="w-3.5 h-3.5" /> {mergeMode ? 'Cancel merge' : 'Merge'}
          </button>
          {!showAddForm && !mergeMode && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sage text-white text-sm rounded hover:bg-sage-lt transition-colors"
            >
              <Plus className="w-4 h-4" /> New stash
            </button>
          )}
        </div>
      </div>

      {mergeMode && (
        <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4 flex items-center justify-between gap-3">
          <div className="text-xs text-purple-900">
            Pick source stash(es) to merge, and one target. Sources will be deleted; their items move to the target.
          </div>
          <div className="flex items-center gap-2">
            {mergeError && <span className="text-xs text-red-600">{mergeError}</span>}
            <button
              onClick={executeMerge}
              disabled={!merge.target || merge.sources.size === 0}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded disabled:opacity-40"
            >
              Merge {merge.sources.size} → 1
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg border border-sage/14 p-4 mb-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Garage, Shelf 3, Attic box 1" maxLength={120} autoFocus className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage" />
          </div>
          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Note (optional)</label>
            <input type="text" value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="e.g. Top shelf, behind the boxes" className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-sage-dim mb-1">Capacity (optional)</label>
              <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} placeholder="e.g. 50" min={1} className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage" />
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-dim mb-1">Parent (optional)</label>
              <select value={formParent} onChange={(e) => setFormParent(e.target.value)} className="w-full px-3 py-2 text-sm border border-sage/14 rounded focus:outline-none focus:border-sage">
                <option value="">— no parent —</option>
                {(stashes ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          {formError && <div className="text-xs text-red-600">{formError}</div>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={submitting || !formName.trim()} className="px-4 py-2 bg-sage text-white text-sm rounded hover:bg-sage-lt transition-colors disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create stash'}
            </button>
            <button type="button" onClick={() => { setShowAddForm(false); setFormName(''); setFormNote(''); setFormCapacity(''); setFormParent(''); setFormError(null) }} className="px-4 py-2 text-sm text-sage-dim hover:text-sage transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="bg-white rounded-lg border border-sage/14 p-3 space-y-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : !stashes || stashes.length === 0 ? (
        <div className="bg-white rounded-lg border border-sage/14 p-8 text-center">
          <Package className="w-8 h-8 mx-auto mb-3 text-sage-dim" />
          <div className="text-sm font-medium text-ink">No stashes yet</div>
          <div className="text-xs text-sage-dim mt-1">Create your first stash to organise where items are physically stored.</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-sage/14 divide-y divide-sage/10">
          {rootStashes.map((s) => renderStashRow(s, 0))}
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
