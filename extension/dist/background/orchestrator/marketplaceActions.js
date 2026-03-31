import { createDepopServices } from "../marketplaces/depop/index.js";
import { createFacebookServices } from "../marketplaces/facebook/index.js";
import { createGrailedServices } from "../marketplaces/grailed/index.js";
import { createMercariServices } from "../marketplaces/mercari/index.js";
import { createPoshmarkServices } from "../marketplaces/poshmark/index.js";
import { createShopifyServices } from "../marketplaces/shopify/index.js";
import { createVintedServices } from "../marketplaces/vinted/index.js";
import { createWhatnotServices } from "../marketplaces/whatnot/index.js";
import { createEtsyServices } from "../marketplaces/etsy/index.js";
import { normalizeError, resolveShopifyUrl, resolveTld, } from "./utils.js";
export async function checkMarketplaceLogin(marketplace, options = {}) {
    try {
        switch (marketplace) {
            case "grailed":
                return createGrailedServices({
                    tld: resolveTld(marketplace, options),
                }).client.checkLogin();
            case "poshmark":
                return createPoshmarkServices({
                    tld: resolveTld(marketplace, options),
                }).client.checkLogin();
            case "depop":
                return createDepopServices({
                    tld: resolveTld(marketplace, options),
                }).client.checkLogin();
            case "mercari":
                return createMercariServices().client.checkLogin();
            case "vinted":
                return createVintedServices({
                    tld: resolveTld(marketplace, options),
                }).client.checkLogin();
            case "facebook":
                return createFacebookServices(resolveTld(marketplace, options)).client.checkLogin();
            case "shopify": {
                const shopUrl = resolveShopifyUrl(options.settings);
                if (!shopUrl) {
                    throw new Error("Shopify shop URL is missing.");
                }
                return createShopifyServices(shopUrl).client.checkLogin();
            }
            case "whatnot":
                return createWhatnotServices(resolveTld(marketplace, options)).client.checkLogin();
            case "etsy":
                return createEtsyServices().client.checkLogin();
            default:
                throw new Error(`${marketplace} is not supported`);
        }
    }
    catch (error) {
        console.warn(`[${marketplace}] checkLogin failed`, error);
        return marketplace === "shopify";
    }
}
export async function updateMarketplaceListing(marketplace, product, options = {}) {
    try {
        const tld = resolveTld(marketplace, options);
        switch (marketplace) {
            case "grailed":
                return updateGrailedListing(product, tld);
            case "poshmark":
                return createPoshmarkServices({ tld }).client.updateListing(product);
            case "depop":
                return updateDepopListing(product, tld);
            case "mercari":
                return updateMercariListing(product);
            case "vinted":
                return updateVintedListing(product, tld);
            case "facebook":
                return createFacebookServices(tld).client.updateListing(product);
            case "shopify":
                return updateShopifyListing(product, options);
            case "whatnot":
                return updateWhatnotListing(product, tld);
            case "etsy":
                throw new Error("Etsy update is not yet supported.");
            default:
                throw new Error(`${marketplace} is not supported`);
        }
    }
    catch (error) {
        return normalizeError(error);
    }
}
export async function fetchMarketplaceListings({ marketplace, page, perPage, username, ...options }) {
    const tld = resolveTld(marketplace, options);
    const normalizedUsername = normalizeUsername(username);
    switch (marketplace) {
        case "grailed":
            return createGrailedServices({ tld }).client.getListings(page, perPage, normalizedUsername);
        case "poshmark":
            return createPoshmarkServices({ tld }).client.getListings(page, perPage, normalizedUsername);
        case "depop":
            return createDepopServices({ tld }).client.getListings(page, perPage);
        case "mercari":
            return createMercariServices().client.getListings(page, perPage, normalizedUsername);
        case "vinted": {
            const status = options.status ?? 'all';
            return createVintedServices({ tld }).client.getListings(page, perPage, normalizedUsername, false, status);
        }
        case "facebook":
            return createFacebookServices(tld).client.getListings(page, perPage, normalizedUsername);
        case "shopify": {
            const shopUrl = resolveShopifyUrl(options.settings);
            if (!shopUrl) {
                throw new Error("Shopify shop URL is missing.");
            }
            return createShopifyServices(shopUrl).client.getListings(page, perPage);
        }
        case "whatnot":
            return createWhatnotServices(tld).client.getListings(page, perPage, normalizedUsername);
        case "etsy":
            return createEtsyServices().client.getListings(page, perPage);
        default:
            throw new Error(`${marketplace} is not supported`);
    }
}
export async function fetchMarketplaceListing({ marketplace, id, ...options }) {
    const tld = resolveTld(marketplace, options);
    switch (marketplace) {
        case "grailed":
            return createGrailedServices({ tld }).client.getListing(id);
        case "poshmark":
            return createPoshmarkServices({ tld }).client.getListing(id);
        case "depop":
            return createDepopServices({ tld }).client.getListing(id);
        case "mercari":
            return createMercariServices().client.getListing(id);
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
        case "whatnot":
            return createWhatnotServices(tld).client.getListing(id);
        case "etsy":
            return createEtsyServices().client.getListing(id);
        default:
            throw new Error(`${marketplace} is not supported`);
    }
}
async function updateGrailedListing(product, tld) {
    const listingId = product.marketplaceId ?? product.marketPlaceId;
    if (!listingId) {
        throw new Error("Missing Grailed listing id.");
    }
    const services = createGrailedServices({ tld });
    const payload = await services.mapProduct(product);
    return services.client.updateListing(listingId, payload);
}
async function updateDepopListing(product, tld) {
    if (!product.marketplaceUrl) {
        throw new Error("Missing Depop marketplace URL.");
    }
    const services = createDepopServices({ tld });
    const payload = await services.mapProduct(product);
    return services.client.updateListing(product.marketplaceUrl, payload);
}
async function updateMercariListing(product) {
    const listingId = product.marketplaceId ?? product.marketPlaceId;
    if (!listingId) {
        throw new Error("Missing Mercari listing id.");
    }
    const services = createMercariServices();
    const payload = await services.mapProduct(product);
    return services.client.updateListing(listingId, payload);
}
async function updateVintedListing(product, tld) {
    const listingId = product.marketplaceId ?? product.marketPlaceId;
    if (!listingId) {
        throw new Error("Missing Vinted listing id.");
    }
    const services = createVintedServices({ tld });
    await services.client.bootstrap();
    const payload = await services.mapProduct(product);
    const shippingAddress = payload.shippingAddress;
    if ("shippingAddress" in payload) {
        delete payload.shippingAddress;
    }
    return services.client.updateListing(listingId, payload, shippingAddress);
}
async function updateShopifyListing(product, options) {
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
async function updateWhatnotListing(product, tld) {
    const services = createWhatnotServices(tld);
    const payload = await services.mapProductForUpdate(product);
    return services.client.updateListing(payload);
}
function normalizeUsername(value) {
    if (value === null || typeof value === "undefined") {
        return undefined;
    }
    return String(value);
}
