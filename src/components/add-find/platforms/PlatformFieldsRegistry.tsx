import type { Platform } from '@/types'
import type { PlatformFieldProps } from './types'
import EtsyFields from './EtsyFields'
import DepopFields from './DepopFields'

/**
 * Registry of per-platform field renderers.
 * To add a new platform: create a FooFields.tsx, then add it here.
 * The MarketplaceFieldsSection iterates this registry automatically.
 */
export const PLATFORM_FIELD_RENDERERS: Partial<Record<Platform, React.ComponentType<PlatformFieldProps>>> = {
  etsy: EtsyFields,
  depop: DepopFields,
}
