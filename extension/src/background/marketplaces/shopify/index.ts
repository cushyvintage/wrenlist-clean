import type { CrosslistProduct } from "../../types.js";
import { ShopifyClient } from "./client.js";
import {
  ShopifyMapper,
  type ShopifyCreatePayload,
  type ShopifyUpdatePayload,
} from "./mapper.js";

export interface ShopifyServices {
  client: ShopifyClient;
  mapper: ShopifyMapper;
  mapProduct: (
    product: CrosslistProduct,
  ) => Promise<ShopifyCreatePayload>;
  mapProductForEdit: (
    product: CrosslistProduct,
  ) => Promise<ShopifyUpdatePayload>;
}

export function createShopifyServices(shopId: string): ShopifyServices {
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

