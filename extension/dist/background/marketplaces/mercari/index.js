import { MercariClient } from "./client.js";
import { MercariMapper } from "./mapper.js";
export function createMercariServices() {
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
