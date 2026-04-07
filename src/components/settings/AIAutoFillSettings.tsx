'use client'

import { useState, useEffect } from 'react'

interface Preferences {
  enabled: boolean
  title: boolean
  description: boolean
  category: boolean
  condition: boolean
  price: boolean
}

const DEFAULT: Preferences = { enabled: true, title: true, description: true, category: true, condition: true, price: true }

const FIELD_LABELS: { key: keyof Omit<Preferences, 'enabled'>; label: string; description: string }[] = [
  { key: 'title', label: 'Title', description: 'Suggest a listing title from the photo' },
  { key: 'description', label: 'Description', description: 'Generate a marketplace-ready description' },
  { key: 'category', label: 'Category', description: 'Auto-detect the best category and subcategory' },
  { key: 'condition', label: 'Condition', description: 'Assess item condition from visible wear' },
  { key: 'price', label: 'Price', description: 'Research comparable sold items and suggest a price' },
]

export default function AIAutoFillSettings() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/user/preferences')
      .then(r => r.ok ? r.json() : DEFAULT)
      .then(data => setPrefs({ ...DEFAULT, ...data }))
      .catch(() => setPrefs(DEFAULT))
      .finally(() => setLoading(false))
  }, [])

  const save = async (updated: Preferences) => {
    setPrefs(updated)
    setSaving(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } catch {
      // Silently fail — preferences are non-critical
    } finally {
      setSaving(false)
    }
  }

  const toggle = (key: keyof Preferences) => {
    const updated = { ...prefs, [key]: !prefs[key] }
    save(updated)
  }

  if (loading) {
    return <div className="text-sm text-sage-dim">Loading preferences...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-ink mb-1">AI Auto-Fill</h2>
        <p className="text-sm text-sage-dim">
          Control what AI fills in when you upload photos on the add find page.
        </p>
      </div>

      {/* Master toggle */}
      <div className="flex items-center justify-between py-3 border-b border-sage/10">
        <div>
          <p className="text-sm font-medium text-ink">Auto-identify items from photos</p>
          <p className="text-xs text-sage-dim">When enabled, AI analyses your first photo and suggests fields</p>
        </div>
        <button
          type="button"
          onClick={() => toggle('enabled')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            prefs.enabled ? 'bg-sage' : 'bg-sage/20'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            prefs.enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Per-field toggles */}
      <div className={`space-y-1 ${!prefs.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {FIELD_LABELS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-sage/5">
            <div>
              <p className="text-sm text-ink">{label}</p>
              <p className="text-xs text-sage-dim">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(key)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                prefs[key] ? 'bg-sage' : 'bg-sage/20'
              }`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                prefs[key] ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>
        ))}
      </div>

      {saving && (
        <p className="text-xs text-sage-dim">Saving...</p>
      )}
    </div>
  )
}
