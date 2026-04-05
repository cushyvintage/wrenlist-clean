import type { Product } from "../../types.js";
import { DepopClient } from "./client.js";
import { DepopMapper } from "./mapper.js";

export interface DepopConfig {
  tld: string;
}

export function createDepopServices(config: DepopConfig) {
  const client = new DepopClient(config.tld);
  const mapper = new DepopMapper(client, config.tld);

  return {
    client,
    mapper,
    async mapProduct(product: Product) {
      return mapper.map(product);
    },
  };
}

