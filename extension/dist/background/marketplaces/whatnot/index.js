import { WhatnotClient } from "./client.js";
import { WhatnotMapper, } from "./mapper.js";
export function createWhatnotServices(tld) {
    const client = new WhatnotClient(tld);
    const mapper = new WhatnotMapper({
        uploadImages: client.uploadImages.bind(client),
        getProductAttributes: client.getProductAttributes.bind(client),
        getShippingProfiles: client.getShippingProfiles.bind(client),
        getMyLiveStreams: client.getMyLiveStreams.bind(client),
    }, tld);
    return {
        client,
        mapper,
        mapProduct: (product) => mapper.map(product),
        mapProductForUpdate: (product) => mapper.mapForUpdate(product),
    };
}
