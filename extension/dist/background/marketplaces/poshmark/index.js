import { PoshmarkClient } from "./client.js";
export function createPoshmarkServices(config) {
    const client = new PoshmarkClient(config.tld);
    return { client };
}
