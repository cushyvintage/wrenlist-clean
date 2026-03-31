import type { CrosslistProduct } from "../../types.js";
import { MercariClient } from "./client.js";
import { MercariMapper, type BuildPayloadOptions } from "./mapper.js";

export interface MercariServices {
  client: MercariClient;
  mapper: MercariMapper;
  mapProduct: (
    product: CrosslistProduct,
    options?: BuildPayloadOptions,
  ) => Promise<import("./client.js").MercariListingPayload>;
}

export function createMercariServices(): MercariServices {
  const client = new MercariClient();
  const mapper = new MercariMapper(client);

  return {
    client,
    mapper,
    mapProduct(product, options) {
      return mapper.buildPayload(product, options);
    },
  };
}

