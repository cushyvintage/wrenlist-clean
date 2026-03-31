/**
 * useListingForm Hook
 * useReducer-based state machine for the add-find form
 * Manages multi-step form state including item details, marketplace selection, and pricing
 */

import { useReducer, useCallback } from 'react'
import { MarketplaceId } from '@/lib/marketplace/registry'

export type ListingFormStep = 'details' | 'sourcing' | 'pricing' | 'marketplaces' | 'photos' | 'review'

export interface ItemDetails {
  itemName: string
  category: string
  categoryPath: string
  condition: string
  size: string
  colour: string
  brand: string
  description: string
  sku: string
  appliedTemplate: string | null
}

export interface SourcingInfo {
  sourceType: string
  sourceName: string
  dateSourced: string
}

export interface PricingInfo {
  costPaid: number | null
  askingPrice: number | null
}

export interface MarketplaceSelection {
  selectedMarketplaces: MarketplaceId[]
  platformFields: Record<MarketplaceId, Record<string, any>>
}

export interface PhotoInfo {
  photos: File[]
}

export interface ListingFormState {
  step: ListingFormStep
  itemDetails: ItemDetails
  sourcingInfo: SourcingInfo
  pricingInfo: PricingInfo
  marketplaceSelection: MarketplaceSelection
  photoInfo: PhotoInfo
  isDirty: boolean
}

export type ListingFormAction =
  | { type: 'SET_STEP'; payload: ListingFormStep }
  | { type: 'SET_ITEM_DETAIL'; payload: { field: keyof ItemDetails; value: any } }
  | { type: 'SET_SOURCING'; payload: Partial<SourcingInfo> }
  | { type: 'SET_PRICING'; payload: Partial<PricingInfo> }
  | { type: 'SET_MARKETPLACE'; payload: MarketplaceId[] }
  | { type: 'SET_PLATFORM_FIELD'; payload: { marketplace: MarketplaceId; field: string; value: any } }
  | { type: 'SET_PHOTOS'; payload: File[] }
  | { type: 'LOAD_TEMPLATE'; payload: Partial<ListingFormState> }
  | { type: 'RESET' }
  | { type: 'SET_DIRTY'; payload: boolean }

const initialState: ListingFormState = {
  step: 'details',
  itemDetails: {
    itemName: '',
    category: '',
    categoryPath: '',
    condition: '',
    size: '',
    colour: '',
    brand: '',
    description: '',
    sku: '',
    appliedTemplate: null,
  },
  sourcingInfo: {
    sourceType: '',
    sourceName: '',
    dateSourced: new Date().toISOString().split('T')[0],
  },
  pricingInfo: {
    costPaid: null,
    askingPrice: null,
  },
  marketplaceSelection: {
    selectedMarketplaces: [],
    platformFields: {},
  },
  photoInfo: {
    photos: [],
  },
  isDirty: false,
}

function listingFormReducer(
  state: ListingFormState,
  action: ListingFormAction
): ListingFormState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        step: action.payload,
      }

    case 'SET_ITEM_DETAIL':
      return {
        ...state,
        itemDetails: {
          ...state.itemDetails,
          [action.payload.field]: action.payload.value,
        },
        isDirty: true,
      }

    case 'SET_SOURCING':
      return {
        ...state,
        sourcingInfo: {
          ...state.sourcingInfo,
          ...action.payload,
        },
        isDirty: true,
      }

    case 'SET_PRICING':
      return {
        ...state,
        pricingInfo: {
          ...state.pricingInfo,
          ...action.payload,
        },
        isDirty: true,
      }

    case 'SET_MARKETPLACE':
      return {
        ...state,
        marketplaceSelection: {
          ...state.marketplaceSelection,
          selectedMarketplaces: action.payload,
        },
        isDirty: true,
      }

    case 'SET_PLATFORM_FIELD':
      const { marketplace, field, value } = action.payload
      return {
        ...state,
        marketplaceSelection: {
          ...state.marketplaceSelection,
          platformFields: {
            ...state.marketplaceSelection.platformFields,
            [marketplace]: {
              ...(state.marketplaceSelection.platformFields[marketplace] || {}),
              [field]: value,
            },
          },
        },
        isDirty: true,
      }

    case 'SET_PHOTOS':
      return {
        ...state,
        photoInfo: {
          photos: action.payload,
        },
        isDirty: true,
      }

    case 'LOAD_TEMPLATE':
      return {
        ...state,
        ...action.payload,
        isDirty: true,
      }

    case 'SET_DIRTY':
      return {
        ...state,
        isDirty: action.payload,
      }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

/**
 * Hook for managing listing form state
 * Returns state and action creators for convenient use
 */
export function useListingForm() {
  const [state, dispatch] = useReducer(listingFormReducer, initialState)

  // Step navigation
  const setStep = useCallback((step: ListingFormStep) => {
    dispatch({ type: 'SET_STEP', payload: step })
  }, [])

  // Item details
  const setItemDetail = useCallback(
    (field: keyof ItemDetails, value: any) => {
      dispatch({ type: 'SET_ITEM_DETAIL', payload: { field, value } })
    },
    []
  )

  // Sourcing
  const setSourcing = useCallback((data: Partial<SourcingInfo>) => {
    dispatch({ type: 'SET_SOURCING', payload: data })
  }, [])

  // Pricing
  const setPricing = useCallback((data: Partial<PricingInfo>) => {
    dispatch({ type: 'SET_PRICING', payload: data })
  }, [])

  // Marketplace selection
  const setMarketplaces = useCallback((marketplaces: MarketplaceId[]) => {
    dispatch({ type: 'SET_MARKETPLACE', payload: marketplaces })
  }, [])

  // Platform-specific field
  const setPlatformField = useCallback(
    (marketplace: MarketplaceId, field: string, value: any) => {
      dispatch({
        type: 'SET_PLATFORM_FIELD',
        payload: { marketplace, field, value },
      })
    },
    []
  )

  // Photos
  const setPhotos = useCallback((photos: File[]) => {
    dispatch({ type: 'SET_PHOTOS', payload: photos })
  }, [])

  // Template loading
  const loadTemplate = useCallback((templateData: Partial<ListingFormState>) => {
    dispatch({ type: 'LOAD_TEMPLATE', payload: templateData })
  }, [])

  // Reset form
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // Mark as clean (after successful save)
  const markClean = useCallback(() => {
    dispatch({ type: 'SET_DIRTY', payload: false })
  }, [])

  return {
    state,
    actions: {
      setStep,
      setItemDetail,
      setSourcing,
      setPricing,
      setMarketplaces,
      setPlatformField,
      setPhotos,
      loadTemplate,
      reset,
      markClean,
    },
  }
}
