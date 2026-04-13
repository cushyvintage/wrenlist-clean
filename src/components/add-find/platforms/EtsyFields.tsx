'use client'

import { ETSY_WHO_MADE, ETSY_WHEN_MADE } from '@/data/unified-colours'
import type { PlatformFieldProps } from './types'
import { requiredBorderClass } from './types'

export default function EtsyFields({
  platformFields,
  onSharedFieldChange,
  hasAnyData,
}: PlatformFieldProps) {
  return (
    <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-5">
      <h3 className="text-xs font-medium text-sage border-b border-sage/14 pb-2 -mt-1">Etsy</h3>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Who made<span className="text-red-500"> *</span>
          <span className="ml-1.5 text-[10px] font-normal text-amber-600">Required by Etsy</span>
        </label>
        <select
          value={(platformFields.shared?.whoMade as string) ?? ''}
          onChange={(e) => onSharedFieldChange('whoMade', e.target.value)}
          className={`w-full px-3 py-2 border ${requiredBorderClass(true, hasAnyData, platformFields.shared?.whoMade as string)} rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30`}
        >
          <option value="">Select</option>
          {ETSY_WHO_MADE.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          When made<span className="text-red-500"> *</span>
          <span className="ml-1.5 text-[10px] font-normal text-amber-600">Required by Etsy</span>
        </label>
        <select
          value={(platformFields.shared?.whenMade as string) ?? ''}
          onChange={(e) => onSharedFieldChange('whenMade', e.target.value)}
          className={`w-full px-3 py-2 border ${requiredBorderClass(true, hasAnyData, platformFields.shared?.whenMade as string)} rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30`}
        >
          <option value="">Select</option>
          {ETSY_WHEN_MADE.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
