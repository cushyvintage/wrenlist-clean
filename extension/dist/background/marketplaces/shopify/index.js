import { ShopifyClient } from "./client.js";
import { ShopifyMapper, } from "./mapper.js";
const COLLECTION_CACHE_KEY = "shopifyCollectionCache";
const COLLECTION_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export function createShopifyServices(shopId) {
    const client = new ShopifyClient(shopId);
    // Collection matching: find existing collections by product type (title match)
    const getCollectionIds = async (productType) => {
        if (!productType)
            return [];
        try {
            // Check cache first
            const cached = await chrome.storage.local.get(COLLECTION_CACHE_KEY);
            const cacheEntry = cached[COLLECTION_CACHE_KEY];
            let collections;
            if (cacheEntry && Date.now() - cacheEntry.timestamp < COLLECTION_CACHE_TTL_MS) {
                collections = cacheEntry.collections;
            }
            else {
                collections = await client.getCollections();
                await chrome.storage.local.set({
                    [COLLECTION_CACHE_KEY]: {
                        collections,
                        timestamp: Date.now(),
                    },
                });
            }
            // Match by title (case-insensitive) or by product type containing the collection title
            const lower = productType.toLowerCase();
            const match = collections.find((c) => {
                const cLower = c.title.toLowerCase();
                return cLower === lower || lower.includes(cLower) || cLower.includes(lower);
            });
            return match ? [match.id] : [];
        }
        catch (error) {
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
