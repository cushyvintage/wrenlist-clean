import type { Product } from "../types.js";
import { createDepopServices } from "../marketplaces/depop/index.js";
import { createEtsyServices } from "../marketplaces/etsy/index.js";
import { createFacebookServices } from "../marketplaces/facebook/index.js";
import { createGrailedServices } from "../marketplaces/grailed/index.js";
import { createMercariServices } from "../marketplaces/mercari/index.js";
import { createPoshmarkServices } from "../marketplaces/poshmark/index.js";
import { createShopifyServices } from "../marketplaces/shopify/index.js";
import { createVintedServices } from "../marketplaces/vinted/index.js";
import { createWhatnotServices } from "../marketplaces/whatnot/index.js";
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
      case "grailed":
        return publishViaGrailed(product, tld);
      case "poshmark":
        return publishViaPoshmark(product, tld);
      case "depop":
        return publishViaDepop(product, tld);
      case "mercari":
        return publishViaMercari(product);
      case "vinted":
        return publishViaVinted(product, tld);
      case "facebook":
        return publishViaFacebook(product, tld);
      case "shopify":
        return publishViaShopify(product, options);
      case "whatnot":
        return publishViaWhatnot(product, tld);
      case "etsy":
        return publishViaEtsy(product);
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
      case "grailed":
        return delistViaGrailed(marketplaceId, tld);
      case "poshmark":
        return delistViaPoshmark(marketplaceId, tld);
      case "depop":
        return delistViaDepop(marketplaceId, tld);
      case "mercari":
        return delistViaMercari(marketplaceId);
      case "vinted":
        return delistViaVinted(marketplaceId, tld);
      case "facebook":
        return delistViaFacebook(marketplaceId, tld);
      case "shopify":
        return delistViaShopify(marketplaceId, options);
      case "whatnot":
        return delistViaWhatnot(marketplaceId, tld);
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

async function publishViaGrailed(product: Product, tld: string) {
  const services = createGrailedServices({ tld });
  return withAuthRetry("grailed", async () => {
    const payload = await services.mapProduct(product);
    return services.client.postListing(payload);
  });
}

async function publishViaPoshmark(product: Product, tld: string) {
  const services = createPoshmarkServices({ tld });
  return withAuthRetry("poshmark", async () => {
    return services.client.postListing(product);
  });
}

async function publishViaDepop(product: Product, tld: string) {
  const services = createDepopServices({ tld });
  return withAuthRetry("depop", async () => {
    const payload = await services.mapProduct(product);
    return services.client.postListing(payload);
  });
}

async function publishViaMercari(product: Product) {
  const services = createMercariServices();
  return withAuthRetry("mercari", async () => {
    const payload = await services.mapProduct(product);
    return services.client.postListing(payload);
  });
}

async function publishViaVinted(product: Product, tld: string) {
  const services = createVintedServices({ tld });
  await services.client.bootstrap();
  let payload = await services.mapProduct(product);
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
  if (!result.success) {
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

  return result;
}

async function publishViaWhatnot(product: Product, tld: string) {
  const services = createWhatnotServices(tld);
  return withAuthRetry("whatnot", async () => {
    const payload = await services.mapProduct(product);
    return services.client.postListing(payload);
  });
}

async function delistViaGrailed(id: string, tld: string) {
  const services = createGrailedServices({ tld });
  return withAuthRetry("grailed", () => services.client.delistListing(id));
}

async function delistViaPoshmark(id: string, tld: string) {
  const services = createPoshmarkServices({ tld });
  return withAuthRetry("poshmark", () => services.client.delistListing(id));
}

async function delistViaDepop(id: string, tld: string) {
  const services = createDepopServices({ tld });
  return withAuthRetry("depop", () => services.client.delistListing(id));
}

async function delistViaMercari(id: string) {
  const services = createMercariServices();
  return withAuthRetry("mercari", () => services.client.delistListing(id));
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
  if (!result.success) {
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

async function delistViaWhatnot(id: string, tld: string) {
  const services = createWhatnotServices(tld);
  return withAuthRetry("whatnot", () => services.client.delistListing(id));
}

async function publishViaEtsy(product: Product) {
  const services = createEtsyServices();
  return services.client.publishProduct(product);
}

async function delistViaEtsy(_id: string) {
  // Etsy delisting via form-fill is not automated.
  // User must delete from Etsy dashboard.
  return {
    success: false,
    message: "Etsy delisting must be done manually from Etsy dashboard",
  };
}

