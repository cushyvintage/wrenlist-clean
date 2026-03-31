import { ShopifyClient } from "./client.js";
import { ShopifyMapper, } from "./mapper.js";
export function createShopifyServices(shopId) {
    const client = new ShopifyClient(shopId);
    const mapper = new ShopifyMapper({
        uploadImages: client.uploadImages.bind(client),
        getLocationId: client.getLocationId.bind(client),
    });
    return {
        client,
        mapper,
        mapProduct: (product) => mapper.map(product),
        mapProductForEdit: (product) => mapper.mapForEdit(product),
    };
}
