import type {
  Product,
  MarketplaceListingResult,
} from "../types.js";
import { createDepopServices } from "../marketplaces/depop/index.js";
import { createFacebookServices } from "../marketplaces/facebook/index.js";
import { createShopifyServices } from "../marketplaces/shopify/index.js";
import { createVintedServices } from "../marketplaces/vinted/index.js";
import { createEtsyServices } from "../marketplaces/etsy/index.js";
import type {
  ListingActionResult,
  PublishOptions,
  SupportedMarketplace,
} from "./types.js";
import {
  normalizeError,
  resolveShopifyUrl,
  resolveTld,
} from "./utils.js";

export interface ListingsRequest extends PublishOptions {
  marketplace: SupportedMarketplace;
  page?: string;
  perPage?: number;
  username?: string | number | null;
  status?: 'all' | 'active' | 'sold';
}

export interface ListingRequest extends PublishOptions {
  marketplace: SupportedMarketplace;
  id: string;
}

export async function checkMarketplaceLogin(
  marketplace: SupportedMarketplace,
  options: PublishOptions = {},
): Promise<boolean> {
  try {
    switch (marketplace) {
      case "depop":
        return createDepopServices({
          tld: resolveTld(marketplace, options),
        }).client.checkLogin();
      case "vinted":
        return createVintedServices({
          tld: resolveTld(marketplace, options),
        }).client.checkLogin();
      case "facebook":
        return createFacebookServices(
          resolveTld(marketplace, options),
        ).client.checkLogin();
      case "shopify": {
        const shopUrl = resolveShopifyUrl(options.settings);
        if (!shopUrl) {
          throw new Error("Shopify shop URL is missing.");
        }
        return createShopifyServices(shopUrl).client.checkLogin();
      }
      case "etsy":
        return createEtsyServices().client.checkLogin();
      default:
        throw new Error(`${marketplace} is not supported`);
    }
  } catch (error) {
    console.warn(`[${marketplace}] checkLogin failed`, error);
    return marketplace === "shopify";
  }
}

export async function updateMarketplaceListing(
  marketplace: SupportedMarketplace,
  product: Product,
  options: PublishOptions = {},
): Promise<ListingActionResult> {
  try {
    const tld = resolveTld(marketplace, options);
    switch (marketplace) {
      case "depop":
        return updateDepopListing(product, tld);
      case "vinted":
        return updateVintedListing(product, tld);
      case "facebook":
        return createFacebookServices(tld).client.updateListing(product);
      case "shopify":
        return updateShopifyListing(product, options);
      case "etsy":
        return updateEtsyListing(product);
      default:
        throw new Error(`${marketplace} is not supported`);
    }
  } catch (error) {
    return normalizeError(error);
  }
}

export async function fetchMarketplaceListings({
  marketplace,
  page,
  perPage,
  username,
  ...options
}: ListingsRequest): Promise<MarketplaceListingResult> {
  const tld = resolveTld(marketplace, options);
  const normalizedUsername = normalizeUsername(username);
  switch (marketplace) {
    case "depop":
      return createDepopServices({ tld }).client.getListings(page, perPage);
    case "vinted": {
      const status = options.status ?? 'all';
      return createVintedServices({ tld }).client.getListings(
        page,
        perPage,
        normalizedUsername,
        false,
        status,
      );
    }
    case "facebook":
      return createFacebookServices(tld).client.getListings(
        page,
        perPage,
        normalizedUsername,
      );
    case "shopify": {
      const shopUrl = resolveShopifyUrl(options.settings);
      if (!shopUrl) {
        throw new Error("Shopify shop URL is missing.");
      }
      return createShopifyServices(shopUrl).client.getListings(
        page,
        perPage,
      );
    }
    case "etsy":
      return createEtsyServices().client.getListings(page, perPage);
    default:
      throw new Error(`${marketplace} is not supported`);
  }
}

export async function fetchMarketplaceListing({
  marketplace,
  id,
  ...options
}: ListingRequest): Promise<Product | null> {
  const tld = resolveTld(marketplace, options);
  switch (marketplace) {
    case "depop":
      return createDepopServices({ tld }).client.getListing(id);
    case "vinted":
      return createVintedServices({ tld }).client.getListing(id);
    case "facebook":
      return createFacebookServices(tld).client.getListing(id);
    case "shopify": {
      const shopUrl = resolveShopifyUrl(options.settings);
      if (!shopUrl) {
        throw new Error("Shopify shop URL is missing.");
      }
      return createShopifyServices(shopUrl).client.getListing(id);
    }
    case "etsy":
      return createEtsyServices().client.getListing(id);
    default:
      throw new Error(`${marketplace} is not supported`);
  }
}

async function updateDepopListing(product: Product, tld: string) {
  if (!product.marketplaceUrl) {
    throw new Error("Missing Depop marketplace URL.");
  }

  const services = createDepopServices({ tld });
  const payload = await services.mapProduct(product);
  return services.client.updateListing(product.marketplaceUrl, payload);
}

async function updateVintedListing(product: Product, tld: string) {
  const listingId = product.marketplaceId ?? product.marketPlaceId;
  if (!listingId) {
    throw new Error("Missing Vinted listing id.");
  }

  const services = createVintedServices({ tld });
  await services.client.bootstrap();
  const payload = await services.mapProduct(product);

  const shippingAddress = payload.shippingAddress as
    | Record<string, unknown>
    | undefined;
  if ("shippingAddress" in payload) {
    delete (payload as Record<string, unknown>).shippingAddress;
  }

  return services.client.updateListing(
    listingId,
    payload,
    shippingAddress as Record<string, string> | undefined,
  );
}

async function updateShopifyListing(
  product: Product,
  options: PublishOptions,
) {
  const shopUrl = resolveShopifyUrl(options.settings);
  if (!shopUrl) {
    throw new Error("Please enter a valid Shopify shop URL in your settings.");
  }

  const listingId = product.marketplaceId ?? product.marketPlaceId;
  if (!listingId) {
    throw new Error("Missing Shopify listing id.");
  }

  const services = createShopifyServices(shopUrl);
  const payload = await services.mapProductForEdit(product);
  payload.productId = `gid://shopify/Product/${listingId}`;
  return services.client.updateListing(payload);
}

async function updateEtsyListing(product: Product) {
  const listingId = product.marketplaceId ?? product.marketPlaceId;
  if (!listingId) {
    throw new Error("Missing Etsy listing id.");
  }

  const services = createEtsyServices();
  return services.client.updateProduct(listingId, product);
}

function normalizeUsername(
  value?: string | number | null,
): string | undefined {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }
  return String(value);
}
