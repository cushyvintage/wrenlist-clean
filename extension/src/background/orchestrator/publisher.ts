import type { Product } from "../types.js";
import { createDepopServices } from "../marketplaces/depop/index.js";
import { createEtsyServices } from "../marketplaces/etsy/index.js";
import { createFacebookServices } from "../marketplaces/facebook/index.js";
import { createShopifyServices } from "../marketplaces/shopify/index.js";
import { createVintedServices } from "../marketplaces/vinted/index.js";
import type {
  ListingActionResult,
  PublishOptions,
  SupportedMarketplace,
} from "./types.js";
import {
  includesCsrfError,
  needsVintedTokenRefresh,
  normalizeError,
  resolveShopifyUrl,
  resolveTld,
} from "./utils.js";

export async function publishToMarketplace(
  marketplace: SupportedMarketplace,
  product: Product,
  options: PublishOptions = {},
): Promise<ListingActionResult> {
  try {
    const tld = resolveTld(marketplace, options);
    switch (marketplace) {
      case "depop":
        return publishViaDepop(product, tld);
      case "vinted":
        return publishViaVinted(product, tld);
      case "facebook":
        return publishViaFacebook(product, tld);
      case "shopify":
        return publishViaShopify(product, options);
      case "etsy":
        return publishViaEtsy(product, options);
      default:
        throw new Error(`${marketplace} is not supported`);
    }
  } catch (error) {
    return normalizeError(error);
  }
}

export async function delistFromMarketplace(
  marketplace: SupportedMarketplace,
  marketplaceId: string,
  options: PublishOptions = {},
): Promise<ListingActionResult> {
  try {
    const tld = resolveTld(marketplace, options);
    switch (marketplace) {
      case "depop":
        return delistViaDepop(marketplaceId, tld);
      case "vinted":
        return delistViaVinted(marketplaceId, tld);
      case "facebook":
        return delistViaFacebook(marketplaceId, tld);
      case "shopify":
        return delistViaShopify(marketplaceId, options);
      case "etsy":
        return delistViaEtsy(marketplaceId);
      default:
        throw new Error(`${marketplace} is not supported`);
    }
  } catch (error) {
    return normalizeError(error);
  }
}

async function withAuthRetry(
  marketplace: string,
  publishFn: () => Promise<ListingActionResult>,
): Promise<ListingActionResult> {
  const result = await publishFn();
  if (!result.success && result.needsLogin) {
    console.log(`[${marketplace}] First attempt failed with auth error, retrying...`);
    return publishFn();
  }
  return result;
}

async function publishViaDepop(product: Product, tld: string) {
  const services = createDepopServices({ tld });
  return withAuthRetry("depop", async () => {
    const payload = await services.mapProduct(product);
    return services.client.postListing(payload);
  });
}

async function publishViaVinted(product: Product, tld: string) {
  console.log('[DEBUG publishViaVinted] product:', JSON.stringify({
    vintedCatalogId: (product as any).vintedCatalogId,
    category: product.category,
    color: product.color,
    dynColorIds: product.dynamicProperties?.colorIds,
    dynCatalogId: product.dynamicProperties?.vintedCatalogId,
    size: product.size,
    title: product.title?.substring(0, 40),
  }));
  const services = createVintedServices({ tld });
  await services.client.bootstrap();
  let payload = await services.mapProduct(product);
  console.log('[DEBUG publishViaVinted] payload keys:', Object.keys(payload), 'item keys:', payload.item ? Object.keys(payload.item) : 'NO ITEM');
  let result = await services.client.postListing(payload);

  if (!result.success && needsVintedTokenRefresh(result)) {
    await services.client.bootstrap(true);
    payload = await services.mapProduct(product);
    result = await services.client.postListing(payload);
  }

  return result;
}

async function publishViaFacebook(product: Product, tld: string) {
  const services = createFacebookServices(tld);
  await services.client.bootstrap();
  let result = await services.client.postListing(product);
  if (!result.success && !result.needsLogin &&
      (includesCsrfError(result) || result.message?.includes('Unable to upload photos'))) {
    // Retry with fresh session — stale fb_dtsg causes photo upload failures
    await services.client.bootstrap(true);
    result = await services.client.postListing(product);
  }
  return result;
}

async function publishViaShopify(
  product: Product,
  options: PublishOptions,
) {
  const shopUrl = resolveShopifyUrl(options.settings);
  if (!shopUrl) {
    return {
      success: false,
      message: "Please enter a valid Shopify shop URL in your settings.",
    };
  }

  const services = createShopifyServices(shopUrl);
  await services.client.bootstrap();
  let payload = await services.mapProduct(product);
  let result = await services.client.postListing(payload);

  if (!result.success && includesCsrfError(result)) {
    await services.client.bootstrap(true);
    payload = await services.mapProduct(product);
    result = await services.client.postListing(payload);
  }

  // Publish to Online Store sales channel so it's visible on the storefront
  if (result.success && result.product?.id) {
    try {
      const productGid = `gid://shopify/Product/${result.product.id}`;
      const pubResult = await services.client.publishToOnlineStore(productGid);
      if (pubResult.onlineStoreUrl) {
        result.product.url = pubResult.onlineStoreUrl;
      }
    } catch (e) {
      console.warn("[Shopify] Failed to publish to Online Store:", e);
      // Non-fatal — product is created, just not on the storefront yet
    }
  }

  return result;
}

async function delistViaDepop(id: string, tld: string) {
  const services = createDepopServices({ tld });
  return withAuthRetry("depop", () => services.client.delistListing(id));
}

async function delistViaVinted(id: string, tld: string) {
  const services = createVintedServices({ tld });
  await services.client.bootstrap();
  let result = await services.client.delistListing(id);
  if (!result.success && needsVintedTokenRefresh(result)) {
    await services.client.bootstrap(true);
    result = await services.client.delistListing(id);
  }
  return result;
}

async function delistViaFacebook(id: string, tld: string) {
  const services = createFacebookServices(tld);
  await services.client.bootstrap();
  let result = await services.client.delistListing(id);
  if (!result.success && !result.needsLogin && includesCsrfError(result)) {
    // Only retry on CSRF/session errors — not on content or auth failures
    await services.client.bootstrap(true);
    result = await services.client.delistListing(id);
  }
  return result;
}

async function delistViaShopify(
  id: string,
  options: PublishOptions,
): Promise<ListingActionResult> {
  const shopUrl = resolveShopifyUrl(options.settings);
  if (!shopUrl) {
    return {
      success: false,
      message: "Please enter a valid Shopify shop URL in your settings.",
    };
  }

  const services = createShopifyServices(shopUrl);
  return services.client.delistListing(id);
}

async function publishViaEtsy(product: Product, options: PublishOptions = {}) {
  const services = createEtsyServices();
  return services.client.publishProduct(product, {
    publishMode: options.publishMode ?? "draft",
  });
}

async function delistViaEtsy(id: string) {
  const services = createEtsyServices();
  return services.client.delistProduct(id);
}
