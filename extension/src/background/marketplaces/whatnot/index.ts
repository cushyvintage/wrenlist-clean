import type { CrosslistProduct } from "../../types.js";
import { WhatnotClient } from "./client.js";
import {
  WhatnotMapper,
  type WhatnotListingInput,
} from "./mapper.js";

export interface WhatnotServices {
  client: WhatnotClient;
  mapper: WhatnotMapper;
  mapProduct: (
    product: CrosslistProduct,
  ) => Promise<WhatnotListingInput>;
  mapProductForUpdate: (
    product: CrosslistProduct,
  ) => Promise<WhatnotListingInput>;
}

export function createWhatnotServices(tld: string): WhatnotServices {
  const client = new WhatnotClient(tld);
  const mapper = new WhatnotMapper(
    {
      uploadImages: client.uploadImages.bind(client),
      getProductAttributes: client.getProductAttributes.bind(client),
      getShippingProfiles: client.getShippingProfiles.bind(client),
      getMyLiveStreams: client.getMyLiveStreams.bind(client),
    },
    tld,
  );

  return {
    client,
    mapper,
    mapProduct: (product) => mapper.map(product),
    mapProductForUpdate: (product) => mapper.mapForUpdate(product),
  };
}

