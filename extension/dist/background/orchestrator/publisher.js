import { createDepopServices } from "../marketplaces/depop/index.js";
import { createEtsyServices } from "../marketplaces/etsy/index.js";
import { createFacebookServices } from "../marketplaces/facebook/index.js";
import { createGrailedServices } from "../marketplaces/grailed/index.js";
import { createMercariServices } from "../marketplaces/mercari/index.js";
import { createPoshmarkServices } from "../marketplaces/poshmark/index.js";
import { createShopifyServices } from "../marketplaces/shopify/index.js";
import { createVintedServices } from "../marketplaces/vinted/index.js";
import { createWhatnotServices } from "../marketplaces/whatnot/index.js";
import { includesCsrfError, needsVintedTokenRefresh, normalizeError, resolveShopifyUrl, resolveTld, } from "./utils.js";
export async function publishToMarketplace(marketplace, product, options = {}) {
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
                return publishViaEtsy(product, options);
            default:
                throw new Error(`${marketplace} is not supported`);
        }
    }
    catch (error) {
        return normalizeError(error);
    }
}
export async function delistFromMarketplace(marketplace, marketplaceId, options = {}) {
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
    }
    catch (error) {
        return normalizeError(error);
    }
}
async function withAuthRetry(marketplace, publishFn) {
    const result = await publishFn();
    if (!result.success && result.needsLogin) {
        console.log(`[${marketplace}] First attempt failed with auth error, retrying...`);
        return publishFn();
    }
    return result;
}
async function publishViaGrailed(product, tld) {
    const services = createGrailedServices({ tld });
    return withAuthRetry("grailed", async () => {
        const payload = await services.mapProduct(product);
        return services.client.postListing(payload);
    });
}
async function publishViaPoshmark(product, tld) {
    const services = createPoshmarkServices({ tld });
    return withAuthRetry("poshmark", async () => {
        return services.client.postListing(product);
    });
}
async function publishViaDepop(product, tld) {
    const services = createDepopServices({ tld });
    return withAuthRetry("depop", async () => {
        const payload = await services.mapProduct(product);
        return services.client.postListing(payload);
    });
}
async function publishViaMercari(product) {
    const services = createMercariServices();
    return withAuthRetry("mercari", async () => {
        const payload = await services.mapProduct(product);
        return services.client.postListing(payload);
    });
}
async function publishViaVinted(product, tld) {
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
async function publishViaFacebook(product, tld) {
    const services = createFacebookServices(tld);
    await services.client.bootstrap();
    let result = await services.client.postListing(product);
    if (!result.success) {
        await services.client.bootstrap(true);
        result = await services.client.postListing(product);
    }
    return result;
}
async function publishViaShopify(product, options) {
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
        }
        catch (e) {
            console.warn("[Shopify] Failed to publish to Online Store:", e);
            // Non-fatal — product is created, just not on the storefront yet
        }
    }
    return result;
}
async function publishViaWhatnot(product, tld) {
    const services = createWhatnotServices(tld);
    return withAuthRetry("whatnot", async () => {
        const payload = await services.mapProduct(product);
        return services.client.postListing(payload);
    });
}
async function delistViaGrailed(id, tld) {
    const services = createGrailedServices({ tld });
    return withAuthRetry("grailed", () => services.client.delistListing(id));
}
async function delistViaPoshmark(id, tld) {
    const services = createPoshmarkServices({ tld });
    return withAuthRetry("poshmark", () => services.client.delistListing(id));
}
async function delistViaDepop(id, tld) {
    const services = createDepopServices({ tld });
    return withAuthRetry("depop", () => services.client.delistListing(id));
}
async function delistViaMercari(id) {
    const services = createMercariServices();
    return withAuthRetry("mercari", () => services.client.delistListing(id));
}
async function delistViaVinted(id, tld) {
    const services = createVintedServices({ tld });
    await services.client.bootstrap();
    let result = await services.client.delistListing(id);
    if (!result.success && needsVintedTokenRefresh(result)) {
        await services.client.bootstrap(true);
        result = await services.client.delistListing(id);
    }
    return result;
}
async function delistViaFacebook(id, tld) {
    const services = createFacebookServices(tld);
    await services.client.bootstrap();
    let result = await services.client.delistListing(id);
    if (!result.success) {
        await services.client.bootstrap(true);
        result = await services.client.delistListing(id);
    }
    return result;
}
async function delistViaShopify(id, options) {
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
async function delistViaWhatnot(id, tld) {
    const services = createWhatnotServices(tld);
    return withAuthRetry("whatnot", () => services.client.delistListing(id));
}
async function publishViaEtsy(product, options = {}) {
    const services = createEtsyServices();
    return services.client.publishProduct(product, {
        publishMode: options.publishMode ?? "draft",
    });
}
async function delistViaEtsy(id) {
    const services = createEtsyServices();
    return services.client.delistProduct(id);
}
