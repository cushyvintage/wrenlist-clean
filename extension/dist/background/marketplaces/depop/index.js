import { DepopClient } from "./client.js";
import { DepopMapper } from "./mapper.js";
export function createDepopServices(config) {
    const client = new DepopClient(config.tld);
    const mapper = new DepopMapper(client, config.tld);
    return {
        client,
        mapper,
        async mapProduct(product) {
            return mapper.map(product);
        },
    };
}
