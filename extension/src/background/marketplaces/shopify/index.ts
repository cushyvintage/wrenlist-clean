import type { Product } from "../../types.js";
import { ShopifyClient } from "./client.js";
import {
  ShopifyMapper,
  type ShopifyCreatePayload,
  type ShopifyUpdatePayload,
} from "./mapper.js";

const COLLECTION_CACHE_KEY = "shopifyCollectionCache";
const COLLECTION_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CollectionCacheEntry {
  collections: Array<{ id: string; title: string }>;
  timestamp: number;
}

export interface ShopifyServices {
  client: ShopifyClient;
  mapper: ShopifyMapper;
  mapProduct: (
    product: Product,
  ) => Promise<ShopifyCreatePayload>;
  mapProductForEdit: (
    product: Product,
  ) => Promise<ShopifyUpdatePayload>;
}

export function createShopifyServices(shopId: string): ShopifyServices {
  const client = new ShopifyClient(shopId);

  // Collection matching: find existing collections by product type (title match)
  const getCollectionIds = async (productType: string): Promise<string[]> => {
    if (!productType) return [];

    try {
      // Check cache first
      const cached = await chrome.storage.local.get(COLLECTION_CACHE_KEY);
      const cacheEntry = cached[COLLECTION_CACHE_KEY] as CollectionCacheEntry | undefined;

      let collections: Array<{ id: string; title: string }>;

      if (cacheEntry && Date.now() - cacheEntry.timestamp < COLLECTION_CACHE_TTL_MS) {
        collections = cacheEntry.collections;
      } else {
        collections = await client.getCollections();
        await chrome.storage.local.set({
          [COLLECTION_CACHE_KEY]: {
            collections,
            timestamp: Date.now(),
          } satisfies CollectionCacheEntry,
        });
      }

      // Match by title (case-insensitive) or by product type containing the collection title
      const lower = productType.toLowerCase();
      const match = collections.find((c) => {
        const cLower = c.title.toLowerCase();
        return cLower === lower || lower.includes(cLower) || cLower.includes(lower);
      });

      return match ? [match.id] : [];
    } catch (error) {
      console.warn("[Shopify] Failed to fetch collections:", error);
      return [];
    }
  };

  const mapper = new ShopifyMapper({
    uploadImages: client.uploadImages.bind(client),
    getLocationId: client.getLocationId.bind(client),
    getCollectionIds,
  });

  return {
    client,
    mapper,
    mapProduct: (product) => mapper.map(product),
    mapProductForEdit: (product) => mapper.mapForEdit(product),
  };
}
