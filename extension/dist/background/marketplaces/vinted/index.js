import { VintedClient } from "./client.js";
import { VintedMapper } from "./mapper.js";
export function createVintedServices(config) {
    const client = new VintedClient(config.tld);
    const mapper = new VintedMapper(client, config.tld);
    return {
        client,
        mapper,
        async mapProduct(product) {
            return mapper.map(product);
        },
    };
}
