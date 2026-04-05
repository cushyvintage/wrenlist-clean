import type { Product } from "../../types.js";
import { FacebookClient } from "./client.js";

export interface FacebookServices {
  client: FacebookClient;
  mapProduct: (product: Product) => Promise<Record<string, unknown>>;
}

export function createFacebookServices(tld: string): FacebookServices {
  const client = new FacebookClient(tld);
  return {
    client,
    mapProduct: (product) => client.mapProduct(product),
  };
}

