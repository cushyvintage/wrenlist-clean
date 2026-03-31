import { EtsyClient } from "./client.js";
export function createEtsyServices() {
    const client = new EtsyClient();
    return {
        client,
    };
}
