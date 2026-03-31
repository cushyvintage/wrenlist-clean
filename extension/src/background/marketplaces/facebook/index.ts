import type { CrosslistProduct } from "../../types.js";
import { FacebookClient } from "./client.js";

export interface FacebookServices {
  client: FacebookClient;
  mapProduct: (product: CrosslistProduct) => Promise<Record<string, unknown>>;
}

export function createFacebookServices(tld: string): FacebookServices {
  const client = new FacebookClient(tld);
  return {
    client,
    mapProduct: (product) => client.mapProduct(product),
  };
}

