import { EbaySellerHubClient } from "./client.js";

export function createEbaySellerHubServices() {
  return {
    client: new EbaySellerHubClient(),
  };
}
