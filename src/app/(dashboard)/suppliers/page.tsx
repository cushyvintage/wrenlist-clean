'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, Trash2, Edit2, Plus } from 'lucide-react'
import type { Supplier, SupplierType } from '@/types'

const typeLabel: Record<SupplierType, string> = {
  house_clearance: 'House Clearance',
  charity_shop: 'Charity Shop',
  car_boot: 'Car Boot Sale',
  flea_market: 'Flea Market',
  online: 'Online',
  other: 'Other',
}

const typeEmoji: Record<SupplierType, string> = {
  house_clearance: '🏠',
  charity_shop: '🏪',
  car_boot: '🚗',
  flea_market: '🎪',
  online: '💻',
  other: '📍',
}

const typeColor: Record<SupplierType, string> = {
  house_clearance: 'bg-amber-50 text-amber-700',
  charity_shop: 'bg-green-50 text-green-700',
  car_boot: 'bg-blue-50 text-blue-700',
  flea_market: 'bg-purple-50 text-purple-700',
  online: 'bg-indigo-50 text-indigo-700',
  other: 'bg-gray-50 text-gray-700',
}

interface SupplierWithStats extends Supplier {
  find_count?: number
  total_cost?: number | null
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<SupplierType | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'charity_shop' as SupplierType,
    location: '',
    contact_name: '',
    phone: '',
    notes: '',
    rating: 0,
  })
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Load suppliers
  useEffect(() => {
    loadSuppliers()
  }, [])

  async function loadSuppliers() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/suppliers')
      if (!res.ok) throw new Error('Failed to load suppliers')
      const json = await res.json()
      setSuppliers((json.data || json) as SupplierWithStats[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to create supplier')
      await loadSuppliers()
      setShowAddForm(false)
      setFormData({
        name: '',
        type: 'charity_shop',
        location: '',
        contact_name: '',
        phone: '',
        notes: '',
        rating: 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create supplier')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteSupplier(id: string) {
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete supplier')
      await loadSuppliers()
      setDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete supplier')
    }
  }

  // Filter suppliers
  const filtered = suppliers.filter((supplier) => {
    const matchesSearch =
      !search ||
      supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      supplier.location?.toLowerCase().includes(search.toLowerCase()) ||
      supplier.contact_name?.toLowerCase().includes(search.toLowerCase())

    const matchesType = selectedType === 'all' || supplier.type === selectedType

    return matchesSearch && matchesType
  })

  const supplierTypes = Object.entries(typeLabel).map(([key]) => key as SupplierType)

  // EMPTY STATE
  if (!loading && suppliers.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="border-b border-sage/14 pb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl italic text-ink">suppliers</h1>
        </div>

        <div className="max-w-2xl mx-auto py-16 px-6 text-center">
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-xl font-medium text-ink mb-2">Your suppliers</h2>
          <p className="text-sage-dim text-sm leading-relaxed mb-8">
            These are the places you buy stock from — charity shops, car boots, house clearances, dealers, online sources. Add them once, rate them, and track what you've spent there.
          </p>

          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors"
          >
            <Plus size={16} />+ Add your first supplier
          </button>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
            <form
              onSubmit={handleAddSupplier}
              className="bg-white rounded-md shadow-lg p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-medium text-ink mb-4">Add supplier</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-sage-dim mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Oxfam High Street"
                    className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-sage-dim mb-1">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as SupplierType })}
                    className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                  >
                    {supplierTypes.map((type) => (
                      <option key={type} value={type}>
                        {typeLabel[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-sage-dim mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Manchester City Centre"
                    className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-sage-dim mb-1">
                    Contact name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="e.g., Sarah"
                    className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-sage-dim mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., 0161 123 4567"
                    className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-sage-dim mb-1">
                    Rating (1-5 stars)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className={`text-xl transition-colors ${
                          star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-sage-dim mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g., Great furniture, quiet on Mondays"
                    rows={3}
                    className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-sage/22 text-ink rounded-sm font-medium text-sm hover:bg-cream-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add supplier'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-sage/14 pb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl italic text-ink">suppliers</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors flex items-center gap-2"
        >
          <Plus size={16} />+ Add supplier
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-ink outline-none focus:border-sage text-sm"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 text-xs rounded-sm font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-sage text-cream'
                : 'bg-sage/10 text-sage hover:bg-sage/20'
            }`}
          >
            All
          </button>
          {supplierTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 text-xs rounded-sm font-medium transition-colors ${
                selectedType === type
                  ? 'bg-sage text-cream'
                  : 'bg-sage/10 text-sage hover:bg-sage/20'
              }`}
            >
              {typeEmoji[type]} {typeLabel[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center text-sage-dim">
          Loading suppliers...
        </div>
      )}

      {/* Suppliers Grid */}
      {!loading && (
        <>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sage-dim">
              No suppliers found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((supplier) => (
                <div
                  key={supplier.id}
                  className="bg-white border border-sage/14 rounded-md p-5 hover:border-sage/30 transition-all group flex flex-col"
                >
                  {/* Type Badge + Name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl flex-shrink-0">
                      {typeEmoji[supplier.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/suppliers/${supplier.id}`}
                        className="font-medium text-ink text-sm leading-tight hover:underline"
                      >
                        {supplier.name}
                      </Link>
                      <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${typeColor[supplier.type]}`}>
                        {typeLabel[supplier.type]}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  {supplier.location && (
                    <div className="text-xs text-ink-lt mb-3 pl-9">
                      📍 {supplier.location}
                    </div>
                  )}

                  {/* Contact Info */}
                  {(supplier.contact_name || supplier.phone) && (
                    <div className="text-xs text-ink-lt mb-4 pl-9 space-y-0.5">
                      {supplier.contact_name && (
                        <div>
                          👤 <span className="font-medium text-ink">{supplier.contact_name}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div>
                          ☎️ <span className="text-ink-lt">{supplier.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rating */}
                  {supplier.rating && (
                    <div className="text-xs mb-3 pl-9">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < supplier.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {supplier.notes && (
                    <div className="text-xs text-sage-dim mb-4 pl-9 italic">
                      {supplier.notes}
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 border-t border-sage/14 pt-3">
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      className="flex-1 px-3 py-1.5 text-xs bg-sage/5 text-sage hover:bg-sage/10 rounded transition-colors font-medium text-center"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm(supplier.id)}
                      className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Supplier Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddSupplier}
            className="bg-white rounded-md shadow-lg p-6 max-w-md w-full max-h-screen overflow-y-auto"
          >
            <h3 className="text-lg font-medium text-ink mb-4">Add supplier</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-sage-dim mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Oxfam High Street"
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-dim mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as SupplierType })}
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                >
                  {supplierTypes.map((type) => (
                    <option key={type} value={type}>
                      {typeLabel[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-dim mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Manchester City Centre"
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-dim mb-1">
                  Contact name
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="e.g., Sarah"
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-dim mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., 0161 123 4567"
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-dim mb-1">
                  Rating (1-5 stars)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className={`text-xl transition-colors ${
                        star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-sage-dim mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g., Great furniture, quiet on Mondays"
                  rows={3}
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-ink text-sm focus:border-sage focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-sage/22 text-ink rounded-sm font-medium text-sm hover:bg-cream-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-ink mb-2">Delete supplier?</h3>
            <p className="text-sm text-sage-dim mb-6">
              This action cannot be undone. The supplier will be removed from your list.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-sage/22 text-ink rounded-sm font-medium text-sm hover:bg-cream-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSupplier(deleteConfirm)}
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
