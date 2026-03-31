import { GrailedClient } from "./client.js";
import { GrailedMapper } from "./mapper.js";
export function createGrailedServices(config) {
    const client = new GrailedClient(config.tld);
    const mapper = new GrailedMapper(client);
    return {
        client,
        mapper,
        async mapProduct(product) {
            return mapper.map(product);
        },
    };
}
