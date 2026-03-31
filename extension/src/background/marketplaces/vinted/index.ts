import type { CrosslistProduct } from "../../types.js";
import { VintedClient } from "./client.js";
import { VintedMapper } from "./mapper.js";

export interface VintedConfig {
  tld: string;
}

export function createVintedServices(config: VintedConfig) {
  const client = new VintedClient(config.tld);
  const mapper = new VintedMapper(client, config.tld);

  return {
    client,
    mapper,
    async mapProduct(product: CrosslistProduct) {
      return mapper.map(product);
    },
  };
}

