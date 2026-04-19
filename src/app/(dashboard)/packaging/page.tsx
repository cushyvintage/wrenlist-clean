'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Package } from 'lucide-react'
import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { fetchApi } from '@/lib/api-utils'
import { useApiCall } from '@/hooks/useApiCall'
import type { PackagingMaterial, PackagingCategory } from '@/types'

const CATEGORY_LABELS: Record<PackagingCategory, string> = {
  mailers: 'Mailers',
  boxes: 'Boxes',
  protection: 'Protection',
  presentation: 'Presentation',
  branding: 'Branding',
  tape: 'Tape',
  labels: 'Labels',
  other: 'Other',
}

const CATEGORY_ORDER: PackagingCategory[] = [
  'mailers', 'boxes', 'protection', 'presentation', 'branding', 'tape', 'labels', 'other',
]

interface FormState {
  name: string
  sku: string
  category: PackagingCategory
  cost_per_unit_gbp: string
  stock_qty: string
  min_stock_qty: string
  supplier: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  sku: '',
  category: 'mailers',
  cost_per_unit_gbp: '',
  stock_qty: '0',
  min_stock_qty: '0',
  supplier: '',
  notes: '',
}

function isLowStock(m: PackagingMaterial): boolean {
  return m.min_stock_qty > 0 && m.stock_qty < m.min_stock_qty
}

export default function PackagingPage() {
  const { data: materials, isLoading, error, call: refetch } = useApiCall<PackagingMaterial[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(() => {
    refetch(() => fetchApi<PackagingMaterial[]>('/api/packaging/materials'))
  }, [refetch])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(m: PackagingMaterial) {
    setEditingId(m.id)
    setForm({
      name: m.name,
      sku: m.sku ?? '',
      category: m.category,
      cost_per_unit_gbp: m.cost_per_unit_gbp?.toString() ?? '',
      stock_qty: m.stock_qty.toString(),
      min_stock_qty: m.min_stock_qty.toString(),
      supplier: m.supplier ?? '',
      notes: m.notes ?? '',
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setFormError('Name is required')
      return
    }

    const stockQty = parseInt(form.stock_qty, 10)
    const minStockQty = parseInt(form.min_stock_qty, 10)
    if (!Number.isFinite(stockQty) || stockQty < 0) {
      setFormError('Stock quantity must be 0 or more')
      return
    }
    if (!Number.isFinite(minStockQty) || minStockQty < 0) {
      setFormError('Minimum stock must be 0 or more')
      return
    }

    let cost: number | null = null
    if (form.cost_per_unit_gbp.trim() !== '') {
      cost = Number(form.cost_per_unit_gbp)
      if (!Number.isFinite(cost) || cost < 0) {
        setFormError('Cost must be 0 or more')
        return
      }
    }

    setSubmitting(true)
    setFormError(null)

    const payload = {
      name,
      sku: form.sku.trim() || null,
      category: form.category,
      cost_per_unit_gbp: cost,
      stock_qty: stockQty,
      min_stock_qty: minStockQty,
      supplier: form.supplier.trim() || null,
      notes: form.notes.trim() || null,
    }

    try {
      const url = editingId
        ? `/api/packaging/materials/${editingId}`
        : '/api/packaging/materials'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setFormError(body.error || 'Failed to save material')
        return
      }
      closeForm()
      load()
    } catch {
      setFormError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/packaging/materials/${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setDeleteConfirm(null)
      load()
    } catch {
      // swallow — UI stays as-is
    }
  }

  const list = materials ?? []
  const lowStockItems = list.filter(isLowStock)
  const totalMaterials = list.length
  const stockValue = list.reduce(
    (sum, m) => sum + (m.cost_per_unit_gbp ?? 0) * m.stock_qty,
    0,
  )

  // Empty state — no gate, just CTA
  if (!isLoading && list.length === 0) {
    return (
      <div className="space-y-6">
        <div className="max-w-2xl mx-auto py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#EDE8DE' }}>
            <Package size={24} className="text-sage" />
          </div>
          <h2 className="text-xl text-ink mb-2" style={{ fontFamily: 'var(--serif, Georgia, serif)' }}>
            Your packaging cupboard
          </h2>
          <p className="text-sage-dim text-sm leading-relaxed mb-8">
            Track the boxes, mailers, wrap, and tape you use to ship your sales.
            Set a minimum stock level and we&apos;ll flag when you&apos;re running low.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors"
          >
            <Plus size={16} /> Add your first packaging item
          </button>
        </div>

        {showForm && (
          <MaterialForm
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            submitting={submitting}
            error={formError}
            isEditing={false}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-3 bg-red-lt border border-red/20 rounded-md p-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
            <circle cx="8" cy="8" r="7" stroke="#C0392B" strokeWidth="1.3" />
            <path d="M8 5v4M8 11v.5" stroke="#C0392B" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-red">
            <strong>{lowStockItems.length} {lowStockItems.length === 1 ? 'item is' : 'items are'} running low</strong>
            {' — '}
            {lowStockItems.slice(0, 3).map(m => m.name).join(', ')}
            {lowStockItems.length > 3 ? ` and ${lowStockItems.length - 3} more` : ''}.
          </span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="materials tracked"
          value={totalMaterials}
          delta={totalMaterials === 1 ? 'item' : 'items'}
          suffix=""
        />
        <StatCard
          label="stock value"
          value={Math.round(stockValue * 100) / 100}
          prefix="£"
          delta="at cost"
          suffix=""
        />
        <StatCard
          label="low stock alerts"
          value={lowStockItems.length}
          delta={lowStockItems.length > 0 ? 'reorder needed' : 'all good'}
          suffix=""
        />
      </div>

      {/* Stock table */}
      <Panel
        title="stock levels"
        action={{ text: '+ add material', onClick: openAdd }}
      >
        {isLoading ? (
          <div className="py-8 text-center text-sage-dim text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-sage-dim font-medium border-b border-sage/14">
                <tr>
                  <th className="text-left py-3 px-0">material</th>
                  <th className="text-left py-3 px-0">category</th>
                  <th className="text-right py-3 px-0">in stock</th>
                  <th className="text-right py-3 px-0">min</th>
                  <th className="text-left py-3 px-0 pl-4">level</th>
                  <th className="text-right py-3 px-0">cost / unit</th>
                  <th className="text-left py-3 px-0 pl-4">supplier</th>
                  <th className="text-right py-3 px-0">actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/14">
                {list.map(m => {
                  const low = isLowStock(m)
                  const pct = m.min_stock_qty > 0
                    ? Math.min(100, (m.stock_qty / m.min_stock_qty) * 100)
                    : 100
                  return (
                    <tr key={m.id} className="hover:bg-cream-md transition">
                      <td className="py-3 px-0">
                        <div className="font-medium text-ink">{m.name}</div>
                        {m.sku && <div className="text-xs text-sage-dim">SKU: {m.sku}</div>}
                      </td>
                      <td className="py-3 px-0 text-ink-lt text-xs">
                        {CATEGORY_LABELS[m.category]}
                      </td>
                      <td className={`py-3 px-0 text-right text-sm ${low ? 'text-red' : 'text-ink'}`}>
                        {m.stock_qty}
                      </td>
                      <td className="py-3 px-0 text-right font-mono text-xs text-sage-dim">
                        {m.min_stock_qty}
                      </td>
                      <td className="py-3 px-0 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-sage/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${low ? 'bg-amber' : 'bg-sage'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${low ? 'text-red-500' : 'text-sage'}`}>
                            {low ? 'LOW' : 'OK'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-0 text-right font-mono text-ink">
                        {m.cost_per_unit_gbp !== null
                          ? `£${m.cost_per_unit_gbp.toFixed(2)}`
                          : '—'}
                      </td>
                      <td className="py-3 px-0 pl-4 text-xs text-sage-dim">
                        {m.supplier || '—'}
                      </td>
                      <td className="py-3 px-0 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => openEdit(m)}
                            aria-label="Edit material"
                            className="p-1.5 text-sage hover:bg-sage/10 rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(m.id)}
                            aria-label="Delete material"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showForm && (
        <MaterialForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          submitting={submitting}
          error={formError}
          isEditing={editingId !== null}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-ink mb-2">Delete material?</h3>
            <p className="text-sm text-sage-dim mb-6">
              This removes it from your packaging inventory. You can add it back later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-sage/22 text-ink rounded-sm font-medium text-sm hover:bg-cream-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm font-medium text-sm hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface MaterialFormProps {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitting: boolean
  error: string | null
  isEditing: boolean
}

function MaterialForm({ form, setForm, onSubmit, onCancel, submitting, error, isEditing }: MaterialFormProps) {
  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-md shadow-lg p-6 max-w-md w-full max-h-screen overflow-y-auto"
      >
        <h3 className="text-lg font-medium text-ink mb-4">
          {isEditing ? 'Edit material' : 'Add packaging material'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Bubble wrap 500mm x 10m"
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Category *</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value as PackagingCategory })}
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            >
              {CATEGORY_ORDER.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-sage-dim mb-1">In stock</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock_qty}
                onChange={e => setForm({ ...form, stock_qty: e.target.value })}
                className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-dim mb-1">Min stock</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.min_stock_qty}
                onChange={e => setForm({ ...form, min_stock_qty: e.target.value })}
                className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Cost per unit (£)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.cost_per_unit_gbp}
              onChange={e => setForm({ ...form, cost_per_unit_gbp: e.target.value })}
              placeholder="e.g., 0.25"
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={e => setForm({ ...form, sku: e.target.value })}
              placeholder="optional"
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Supplier</label>
            <input
              type="text"
              value={form.supplier}
              onChange={e => setForm({ ...form, supplier: e.target.value })}
              placeholder="e.g., Packhub, Amazon"
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="optional"
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-sm text-red-700 text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-sage/22 text-ink rounded-sm font-medium text-sm hover:bg-cream-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving…' : isEditing ? 'Save' : 'Add material'}
          </button>
        </div>
      </form>
    </div>
  )
}
