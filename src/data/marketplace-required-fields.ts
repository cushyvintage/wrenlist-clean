/**
 * Required fields per category x platform — AUTO-GENERATED
 *
 * Source: scripts/generate-required-fields.ts
 * Generated: 2026-04-06
 *
 * eBay data: 14 categories from Taxonomy API, 116 from group defaults
 * Vinted: group-level defaults (colour + condition for most)
 * Depop: no mandatory fields (all optional per API)
 * Shopify/Etsy: minimal defaults (title/description/price handled by form)
 *
 * To regenerate: npx tsx scripts/generate-required-fields.ts
 */

import type { PlatformFieldMap } from '@/types/categories'

/** The 6 currently-mapped platforms — others get default fields */
type MappedPlatform = 'ebay' | 'vinted' | 'shopify' | 'etsy' | 'depop' | 'facebook'
type PlatformFieldsRecord = Record<MappedPlatform, PlatformFieldMap>

/** Required fields for every canonical category, keyed by category value then platform */
export const REQUIRED_FIELDS: Record<string, PlatformFieldsRecord> = {
  'ceramics_plates': {
    ebay: {
      brand: { show: true, required: true, type: 'text' },
      material: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      colour: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      shape: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      style: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      department: { show: true, type: 'select', options: ["Unisex Baby & Toddler","Boys","Girls","Unisex Kids","Teens"] },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_bowls': {
    ebay: {
      brand: { show: true, required: true, type: 'text' },
      material: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      colour: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      shape: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      department: { show: true, type: 'select', options: ["Unisex Baby & Toddler","Boys","Girls","Unisex Kids","Teens"] },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_dinner_sets': {
    ebay: {
      brand: { show: true, required: true, type: 'text' },
      material: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      colour: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      origin: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      shape: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_mugs': {
    ebay: {
      brand: { show: true, required: true },
      material: { show: true, required: true },
      type: { show: true, required: true },
      colour: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_cup_saucers': {
    ebay: {
      colour: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      brand: { show: true, type: 'text' },
      material: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      department: { show: true, type: 'select', options: ["Unisex Baby & Toddler","Boys","Girls","Unisex Kids","Teens"] },
      origin: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      shape: { show: true, type: 'text' },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_teapots': {
    ebay: {
      brand: { show: true, required: true, type: 'text' },
      colour: { show: true, required: true, type: 'text' },
      material: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      style: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      origin: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      shape: { show: true, type: 'text' },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_jugs': {
    ebay: {
      brand: { show: true, required: true, type: 'text' },
      colour: { show: true, required: true, type: 'text' },
      material: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      style: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      features: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      shape: { show: true, type: 'text' },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_vases': {
    ebay: {
      brand: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      colour: { show: true, type: 'text' },
      material: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      features: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_figurines': {
    ebay: {
      brand: { show: true, required: true, type: 'text' },
      theme: { show: true, type: 'text' },
      material: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      type: { show: true, type: 'text' },
      colour: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_dishes': {
    ebay: {
      brand: { show: true, required: true },
      material: { show: true, required: true },
      type: { show: true, required: true },
      colour: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'ceramics_other': {
    ebay: {
      brand: { show: true, required: true },
      material: { show: true, required: true },
      type: { show: true, required: true },
      colour: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true },
      material: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'glassware_drinkware': {
    ebay: {
      colour: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      material: { show: true, type: 'text' },
      brand: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      department: { show: true, type: 'select', options: ["Unisex Baby & Toddler","Boys","Girls","Unisex Kids","Teens"] },
      shape: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'glassware_stemmed': {
    ebay: {
      colour: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      material: { show: true, type: 'text' },
      brand: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      department: { show: true, type: 'select', options: ["Unisex Baby & Toddler","Boys","Girls","Unisex Kids","Teens"] },
      shape: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'glassware_tumblers': {
    ebay: {
      colour: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      material: { show: true, type: 'text' },
      brand: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      department: { show: true, type: 'select', options: ["Unisex Baby & Toddler","Boys","Girls","Unisex Kids","Teens"] },
      shape: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'glassware_decanters': {
    ebay: {
      colour: { show: true, required: true },
      type: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'glassware_vases': {
    ebay: {
      brand: { show: true, required: true, type: 'text' },
      type: { show: true, required: true, type: 'text' },
      colour: { show: true, type: 'text' },
      material: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      theme: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      features: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'glassware_other': {
    ebay: {
      colour: { show: true, required: true },
      type: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'books_fiction': {
    ebay: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      publisher: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      author: { show: true, required: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    depop: {
      author: { show: true },
      isbn: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      author: { show: true },
      condition_description: { show: true }
    }
  },
  'books_nonfiction': {
    ebay: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      publisher: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      author: { show: true, required: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    depop: {
      author: { show: true },
      isbn: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      author: { show: true },
      condition_description: { show: true }
    }
  },
  'books_academic': {
    ebay: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      publisher: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      author: { show: true, required: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    depop: {
      author: { show: true },
      isbn: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      author: { show: true },
      condition_description: { show: true }
    }
  },
  'books_illustrated': {
    ebay: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      publisher: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      author: { show: true, required: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    depop: {
      author: { show: true },
      isbn: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      author: { show: true },
      condition_description: { show: true }
    }
  },
  'books_antiquarian': {
    ebay: {
      publisher: { show: true, type: 'text' },
      author: { show: true, type: 'text' },
      language: { show: true, type: 'text' },
      condition_description: { show: true }
    },
    vinted: {
      author: { show: true, required: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    depop: {
      author: { show: true },
      isbn: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      author: { show: true },
      condition_description: { show: true }
    }
  },
  'books_comics': {
    ebay: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      publisher: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      author: { show: true, required: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    depop: {
      author: { show: true },
      isbn: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      author: { show: true },
      condition_description: { show: true }
    }
  },
  'books_magazines': {
    ebay: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      publisher: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      author: { show: true, required: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    depop: {
      author: { show: true },
      isbn: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      author: { show: true },
      condition_description: { show: true }
    }
  },
  'books_other': {
    ebay: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      publisher: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      author: { show: true, required: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      author: { show: true },
      isbn: { show: true },
      language: { show: true },
      condition_description: { show: true }
    },
    depop: {
      author: { show: true },
      isbn: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      author: { show: true },
      condition_description: { show: true }
    }
  },
  'jewellery_earrings': {
    ebay: {
      brand: { show: true },
      material: { show: true },
      colour: { show: true },
      type: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      material: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'jewellery_necklaces': {
    ebay: {
      brand: { show: true },
      material: { show: true },
      colour: { show: true },
      type: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      material: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'jewellery_bracelets': {
    ebay: {
      brand: { show: true },
      material: { show: true },
      colour: { show: true },
      type: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      material: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'jewellery_rings': {
    ebay: {
      brand: { show: true },
      material: { show: true },
      colour: { show: true },
      type: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      material: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'jewellery_brooches': {
    ebay: {
      brand: { show: true },
      material: { show: true },
      colour: { show: true },
      type: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      material: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'jewellery_watches': {
    ebay: {
      brand: { show: true },
      material: { show: true },
      colour: { show: true },
      type: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      material: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'jewellery_cufflinks': {
    ebay: {
      brand: { show: true },
      material: { show: true },
      colour: { show: true },
      type: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      material: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'jewellery_vintage': {
    ebay: {
      brand: { show: true },
      material: { show: true },
      colour: { show: true },
      type: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      material: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'jewellery_other': {
    ebay: {
      brand: { show: true },
      material: { show: true },
      colour: { show: true },
      type: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      material: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_dresses': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_tops': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_trousers': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_skirts': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_coats': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_knitwear': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_mens_shirts': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_mens_trousers': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_mens_coats': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_shoes_womens': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_shoes_mens': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_bags': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_vintage': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'clothing_other': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      style: { show: true },
      department: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      size: { show: true, required: true },
      brand: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_candles': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_clocks': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_lighting': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_mirrors': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_cushions': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_rugs': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_storage': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_photo_frames': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_wall_decor': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_bedding': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'homeware_other': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true, required: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'furniture_seating': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'furniture_tables': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'furniture_shelving': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'furniture_cabinets': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'furniture_sideboards': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'furniture_bedroom': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'furniture_sofas': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'furniture_other': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'toys_action_figures': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'toys_soft': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'toys_board_games': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'toys_puzzles': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'toys_dolls': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'toys_educational': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'toys_lego': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'toys_vintage': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'toys_other': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'collectibles_decorative': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      theme: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'collectibles_militaria': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      theme: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'collectibles_postcards': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      theme: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'collectibles_coins': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      theme: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'collectibles_stamps': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      theme: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'collectibles_trading_cards': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      theme: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'collectibles_breweriana': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      theme: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'collectibles_other': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      theme: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      condition_description: { show: true }
    }
  },
  'art_paintings': {
    ebay: {
      type: { show: true },
      style: { show: true },
      origin: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'art_prints': {
    ebay: {
      type: { show: true },
      style: { show: true },
      origin: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'art_photographs': {
    ebay: {
      type: { show: true },
      style: { show: true },
      origin: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'art_sculptures': {
    ebay: {
      type: { show: true },
      style: { show: true },
      origin: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'art_drawings': {
    ebay: {
      type: { show: true },
      style: { show: true },
      origin: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'art_mixed_media': {
    ebay: {
      type: { show: true },
      style: { show: true },
      origin: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'art_textile': {
    ebay: {
      type: { show: true },
      style: { show: true },
      origin: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'art_other': {
    ebay: {
      type: { show: true },
      style: { show: true },
      origin: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'antiques_furniture': {
    ebay: {
      type: { show: true },
      material: { show: true },
      origin: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'antiques_silver': {
    ebay: {
      type: { show: true },
      material: { show: true },
      origin: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'antiques_maps': {
    ebay: {
      type: { show: true },
      material: { show: true },
      origin: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'antiques_porcelain': {
    ebay: {
      brand: { show: true, required: true, type: 'text' },
      theme: { show: true, type: 'text' },
      material: { show: true, type: 'text' },
      origin: { show: true, type: 'text' },
      type: { show: true, type: 'text' },
      colour: { show: true, type: 'text' },
      features: { show: true, type: 'text' },
      style: { show: true, type: 'text' },
      pattern: { show: true, type: 'text' },
      vintage: { show: true, type: 'select', options: ["Yes","No"] },
      handmade: { show: true, type: 'select', options: ["Yes","No"] },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'antiques_clocks': {
    ebay: {
      type: { show: true },
      material: { show: true },
      origin: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'antiques_metalware': {
    ebay: {
      type: { show: true },
      material: { show: true },
      origin: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'antiques_other': {
    ebay: {
      type: { show: true },
      material: { show: true },
      origin: { show: true },
      condition_description: { show: true },
      vintage: { show: true, type: 'select', options: ["Yes","No"] }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      material: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      style: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      condition_description: { show: true }
    }
  },
  'electronics_cameras': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'electronics_phones': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'electronics_audio': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'electronics_video_games': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'electronics_other': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'sports_cycling': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      size: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'sports_fitness': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      size: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'sports_golf': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      size: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'sports_football': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      size: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'sports_camping': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      size: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'sports_other': {
    ebay: {
      brand: { show: true },
      type: { show: true },
      size: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      size: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      size: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'music_media_vinyl': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'music_media_cds': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'music_media_cassettes': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'music_media_dvds': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'music_media_instruments': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'music_media_other': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'craft_supplies_fabric': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'craft_supplies_yarn': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'craft_supplies_beads': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'craft_supplies_sewing': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'craft_supplies_other': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'health_beauty_fragrance': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'health_beauty_makeup': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'health_beauty_skincare': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'health_beauty_haircare': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'health_beauty_other': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'other_pet_supplies': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'other_baby': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'other_stationery': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  },
  'other_misc': {
    ebay: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    vinted: {
      colour: { show: true },
      condition_description: { show: true }
    },
    shopify: {
      brand: { show: true },
      colour: { show: true },
      condition_description: { show: true }
    },
    etsy: {
      colour: { show: true },
      condition_description: { show: true }
    },
    depop: {
      colour: { show: true },
      brand: { show: true },
      condition_description: { show: true }
    },
    facebook: {
      colour: { show: true },
      condition_description: { show: true }
    }
  }
}

/** Default fields when category has no specific mapping */
const DEFAULT_FIELDS: PlatformFieldsRecord = {
  ebay: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  vinted: { colour: { show: true }, condition_description: { show: true } },
  shopify: { colour: { show: true }, condition_description: { show: true } },
  etsy: { colour: { show: true }, condition_description: { show: true } },
  depop: { colour: { show: true }, condition_description: { show: true } },
  facebook: { colour: { show: true }, condition_description: { show: true } },
}

const MAPPED_PLATFORMS = new Set<string>(['ebay', 'vinted', 'shopify', 'etsy', 'depop', 'facebook'])

/**
 * Get required fields for a category + platform.
 * Falls back to default if category or platform not mapped.
 */
export function getRequiredFields(category: string, platform: string): PlatformFieldMap {
  const entry = REQUIRED_FIELDS[category]
  const mapped = MAPPED_PLATFORMS.has(platform) ? (platform as MappedPlatform) : null
  if (entry && mapped) return entry[mapped]
  if (mapped) return DEFAULT_FIELDS[mapped]
  return DEFAULT_FIELDS.ebay
}
