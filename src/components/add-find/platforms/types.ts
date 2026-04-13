import type { Platform, FieldConfig } from '@/types'
import type { PlatformFieldsData } from '@/types/listing-form'

export interface PlatformFieldProps {
  category: string
  fieldConfig: Record<string, FieldConfig> | null
  platformFields: PlatformFieldsData
  onSharedFieldChange: (field: string, value: string | string[] | boolean | undefined) => void
  onPlatformFieldChange: (platform: Platform, field: string, value: unknown) => void
  /** Whether any data has been entered in the form (used for amber highlight on empty required fields) */
  hasAnyData: boolean
}

/** Get border class for a required field that's empty */
export function requiredBorderClass(isRequired: boolean, hasAnyData: boolean, value: string | string[] | boolean | undefined): string {
  if (!isRequired || !hasAnyData) return 'border-sage/14'
  return isFieldEmpty(value) ? 'border-amber-400' : 'border-sage/14'
}

function isFieldEmpty(value: string | string[] | boolean | undefined): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}
