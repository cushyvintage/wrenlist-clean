'use client'

import TemplatePickerPopover from '@/components/templates/TemplatePickerPopover'
import PlatformSelector from '@/components/add-find/PlatformSelector'
import { Platform, ListingTemplate } from '@/types'

interface FormHeaderProps {
  selectedPlatforms: Platform[]
  onPlatformToggle: (platform: Platform) => void
  onSelectTemplate: (template: ListingTemplate) => void
  sourcingTripName: string | null
  onClearSourcingTrip: () => void
  templateAppliedBanner: string | null
  onDismissTemplateBanner: () => void
}

export default function FormHeader({
  selectedPlatforms,
  onPlatformToggle,
  onSelectTemplate,
  sourcingTripName,
  onClearSourcingTrip,
  templateAppliedBanner,
  onDismissTemplateBanner,
}: FormHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title row with template button */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-serif italic text-ink">Add a find</h1>
        <TemplatePickerPopover onSelectTemplate={onSelectTemplate} />
      </div>

      {/* Template applied banner */}
      {templateAppliedBanner && (
        <div className="bg-sage/5 border border-sage/20 rounded-lg px-4 py-2.5 text-sm text-sage flex items-center justify-between">
          <span>Template applied: <strong>{templateAppliedBanner}</strong></span>
          <button onClick={onDismissTemplateBanner} className="text-sage-lt hover:text-sage transition-colors">✕</button>
        </div>
      )}

      {/* Platform chips */}
      <div>
        <label className="block text-xs font-medium text-sage-dim mb-2 uppercase tracking-wider">List on</label>
        <PlatformSelector
          selectedPlatforms={selectedPlatforms}
          onPlatformToggle={onPlatformToggle}
          variant="chips"
        />
      </div>

      {/* Sourcing trip banner */}
      {sourcingTripName && (
        <div className="rounded-lg border border-sage/20 bg-sage/5 px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm text-ink">
            Adding to trip: <strong>{sourcingTripName}</strong>
          </span>
          <button
            type="button"
            onClick={onClearSourcingTrip}
            className="text-xs px-2 py-1 text-sage-lt hover:text-sage transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
