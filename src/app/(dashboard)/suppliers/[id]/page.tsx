'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2 } from 'lucide-react'
import type { Supplier, SupplierType, Find } from '@/types'

const typeLabel: Record<SupplierType, string> = {
  house_clearance: 'House Clearance',
  charity_shop: 'Charity Shop',
  car_boot: 'Car Boot Sale',
  flea_market: 'Flea Market',
  online: 'Online',
  other: 'Other',
}

const typeColor: Record<SupplierType, string> = {
  house_clearance: 'bg-amber-50 text-amber-700',
  charity_shop: 'bg-green-50 text-green-700',
  car_boot: 'bg-blue-50 text-blue-700',
  flea_market: 'bg-purple-50 text-purple-700',
  online: 'bg-indigo-50 text-indigo-700',
  other: 'bg-gray-50 text-gray-700',
}

export default function SupplierDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('')
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [finds, setFinds] = useState<Find[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Supplier> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Load params
  useEffect(() => {
    paramsPromise.then(({ id: supplierId }) => {
      setId(supplierId)
    })
  }, [paramsPromise])

  // Load supplier and finds
  useEffect(() => {
    if (!id) return
    loadSupplier()
    loadFinds()
  }, [id])

  async function loadSupplier() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/suppliers/${id}`)
      if (!res.ok) throw new Error('Failed to load supplier')
      const data = await res.json()
      setSupplier(data as Supplier)
      setEditForm(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load supplier')
    } finally {
      setLoading(false)
    }
  }

  async function loadFinds() {
    try {
      const res = await fetch('/api/finds')
      if (!res.ok) throw new Error('Failed to load finds')
      const data = await res.json()
      // Filter finds that match this supplier by source_name
      const supplierFinds = (data.data || data).filter((find: Find) => {
        return find.source_name === supplier?.name || find.source_name?.includes(supplier?.name || '')
      })
      setFinds(supplierFinds)
    } catch (err) {
      // Silently fail, not critical
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Failed to update supplier')
      const data = await res.json()
      setSupplier(data as Supplier)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update supplier')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    try {
      setSubmitting(true)
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete supplier')
      router.push('/suppliers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete supplier')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sage-dim">Loading supplier...</div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/suppliers" className="text-xs text-sage hover:text-ink inline-flex items-center gap-1">&larr; Back to Suppliers</Link>
        <div className="text-center py-12 text-red-600">
          Supplier not found
        </div>
      </div>
    )
  }

  const totalCost = finds.reduce((sum, find) => sum + (find.cost_gbp || 0), 0)
  const totalPotentialRevenue = finds.reduce((sum, find) => sum + (find.asking_price_gbp || 0), 0)
  const avgCost = finds.length > 0 ? totalCost / finds.length : 0
  const avgProfit = finds.length > 0 ? (totalPotentialRevenue - totalCost) / finds.length : 0

  return (
    <div className="flex flex-col gap-6">
      <Link href="/suppliers" className="text-xs text-sage hover:text-ink mb-4 inline-flex items-center gap-1">&larr; Back to Suppliers</Link>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Header Section */}
      {!isEditing ? (
        <div className="border-b border-sage/14 pb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded flex items-center justify-center text-xs font-semibold ${typeColor[supplier.type]}`}>
                {typeLabel[supplier.type]?.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="font-serif text-2xl italic text-ink">{supplier.name}</h1>
                <div className="text-sm text-sage-dim mt-1">{typeLabel[supplier.type]}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(true)
                  setEditForm(supplier)
                }}
                className="px-3 py-2 bg-sage/10 text-sage hover:bg-sage/20 rounded-sm font-medium text-sm flex items-center gap-2"
              >
                <Edit2 size={16} /> Edit
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-sm font-medium text-sm flex items-center gap-2"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>

          {/* Supplier Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {supplier.location && (
              <div>
                <div className="text-xs text-sage-dim font-medium">Location</div>
                <div className="text-ink mt-1">{supplier.location}</div>
              </div>
            )}
            {supplier.contact_name && (
              <div>
                <div className="text-xs text-sage-dim font-medium">Contact</div>
                <div className="text-ink mt-1">{supplier.contact_name}</div>
              </div>
            )}
            {supplier.phone && (
              <div>
                <div className="text-xs text-sage-dim font-medium">Phone</div>
                <div className="text-ink mt-1">{supplier.phone}</div>
              </div>
            )}
            {supplier.rating && (
              <div>
                <div className="text-xs text-sage-dim font-medium">Rating</div>
                <div className="mt-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < supplier.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                      ★
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {supplier.notes && (
            <div className="mt-4 p-4 bg-cream-md border border-sage/14 rounded-sm">
              <div className="text-xs text-sage-dim font-medium mb-1">Notes</div>
              <div className="text-sm text-ink">{supplier.notes}</div>
            </div>
          )}
        </div>
      ) : (
        /* Edit Form */
        <form onSubmit={handleUpdate} className="border-b border-sage/14 pb-6 space-y-4">
          <h2 className="font-medium text-ink">Edit supplier</h2>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Name</label>
            <input
              type="text"
              value={editForm?.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Type</label>
            <select
              value={editForm?.type || ''}
              onChange={(e) => setEditForm({ ...editForm, type: e.target.value as SupplierType })}
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            >
              {Object.entries(typeLabel).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Location</label>
            <input
              type="text"
              value={editForm?.location || ''}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Contact name</label>
            <input
              type="text"
              value={editForm?.contact_name || ''}
              onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Phone</label>
            <input
              type="tel"
              value={editForm?.phone || ''}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setEditForm({ ...editForm, rating: star })}
                  className={`text-xl transition-colors ${
                    star <= (editForm?.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-sage-dim mb-1">Notes</label>
            <textarea
              value={editForm?.notes || ''}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 px-4 py-2 border border-sage/22 text-ink rounded-sm font-medium text-sm hover:bg-cream-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {/* Stats Section */}
      <div>
        <h2 className="font-medium text-ink mb-4">Stock from this supplier</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-cream-md border border-sage/14 rounded-md p-4">
            <div className="text-2xl font-mono font-medium text-ink">{finds.length}</div>
            <div className="text-xs text-sage-dim mt-1">Total items found</div>
          </div>
          <div className="bg-cream-md border border-sage/14 rounded-md p-4">
            <div className="text-2xl font-mono font-medium text-ink">£{totalCost.toFixed(2)}</div>
            <div className="text-xs text-sage-dim mt-1">Total spent</div>
          </div>
          <div className="bg-cream-md border border-sage/14 rounded-md p-4">
            <div className="text-2xl font-mono font-medium text-ink">£{avgCost.toFixed(2)}</div>
            <div className="text-xs text-sage-dim mt-1">Avg cost per item</div>
          </div>
          <div className="bg-cream-md border border-sage/14 rounded-md p-4">
            <div className="text-2xl font-mono font-medium text-sage">£{avgProfit.toFixed(2)}</div>
            <div className="text-xs text-sage-dim mt-1">Avg profit per item</div>
          </div>
        </div>
      </div>

      {/* Finds from this Supplier */}
      <div>
        <h2 className="font-medium text-ink mb-4">Items from {supplier.name}</h2>
        {finds.length === 0 ? (
          <div className="py-8 text-center text-sage-dim text-sm">
            No items sourced from this supplier yet
          </div>
        ) : (
          <div className="space-y-3">
            {finds.map((find) => (
              <Link
                key={find.id}
                href={`/finds/${find.id}`}
                className="flex items-center justify-between p-4 bg-white border border-sage/14 rounded-md hover:border-sage/30 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-ink text-sm truncate">{find.name}</h3>
                  <div className="text-xs text-sage-dim mt-1">
                    {find.status} • {find.category}
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="font-mono font-medium text-ink">
                    £{(find.cost_gbp || 0).toFixed(2)}
                  </div>
                  {find.asking_price_gbp && (
                    <div className="text-xs text-sage-dim">
                      → £{find.asking_price_gbp.toFixed(2)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-ink mb-2">Delete supplier?</h3>
            <p className="text-sm text-sage-dim mb-6">
              This action cannot be undone. The supplier will be removed from your list.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-sage/22 text-ink rounded-sm font-medium text-sm hover:bg-cream-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
