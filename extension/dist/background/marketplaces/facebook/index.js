import { FacebookClient } from "./client.js";
export function createFacebookServices(tld) {
    const client = new FacebookClient(tld);
    return {
        client,
        mapProduct: (product) => client.mapProduct(product),
    };
}
