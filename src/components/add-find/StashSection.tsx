'use client'

import StashTypeahead from '@/components/stash/StashTypeahead'

interface StashSectionProps {
  stashId: string | null
  onChange: (stashId: string | null) => void
}

/**
 * StashSection — physical storage location picker for add-find form.
 * Sticky: remembers selection in localStorage across form submits so
 * unpacking-a-box workflows don't repeat the pick.
 */
export default function StashSection({ stashId, onChange }: StashSectionProps) {
  const handleChange = (id: string | null) => {
    onChange(id)
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('wrenlist:stickyStashId', id)
      else localStorage.removeItem('wrenlist:stickyStashId')
    }
  }

  return (
    <div className="bg-white rounded-lg border border-sage/14 p-6">
      <label className="block text-sm font-semibold text-ink mb-2">Stash</label>
      <p className="text-xs text-sage-dim mb-3">
        Where is this item stored? Remembered for your next find.
      </p>
      <StashTypeahead value={stashId} onChange={handleChange} />
    </div>
  )
}
