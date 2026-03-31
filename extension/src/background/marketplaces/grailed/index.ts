import type { CrosslistProduct } from "../../types.js";
import { GrailedClient } from "./client.js";
import { GrailedMapper } from "./mapper.js";

export interface GrailedConfig {
  tld: string;
}

export function createGrailedServices(config: GrailedConfig) {
  const client = new GrailedClient(config.tld);
  const mapper = new GrailedMapper(client);

  return {
    client,
    mapper,
    async mapProduct(product: CrosslistProduct) {
      return mapper.map(product);
    },
  };
}

