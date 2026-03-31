import { chunkConcurrentRequestsWithRetry, } from "../../shared/crosslistApi.js";
import { Condition, Color, isColor } from "../../shared/enums.js";
import { ADMIN_PRODUCT_DETAILS_QUERY, CREATE_METAFIELD_DEFINITION_MUTATION, CREATE_PRODUCT_MUTATION, GET_LOCATION_QUERY, GET_METAFIELD_DEFINITIONS_QUERY, PRODUCT_INDEX_QUERY, PRODUCT_SAVE_UPDATE_MUTATION, SHOPIFY_UPLOAD_IMAGE_URL, UPDATE_PRODUCT_MUTATION, UPLOAD_MEDIA_MUTATION, getShopifyAdminDomain, getShopifyGraphqlUrl, } from "./constants.js";
export class ShopifyClient {
    shopId;
    csrfToken = "";
    sessionId = "";
    graphqlUrl;
    adminDomain;
    constructor(shopId) {
        this.shopId = shopId;
        if (!shopId) {
            throw new Error("Please provide a valid shop URL");
        }
        this.graphqlUrl = getShopifyGraphqlUrl(shopId);
        this.adminDomain = getShopifyAdminDomain(shopId);
    }
    async bootstrap(force = false) {
        await this.startSession(force);
    }
    getHeaders(options) {
        const headers = {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            priority: "u=1, i",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "none",
            "sec-gpc": "1",
        };
        if (options?.requiresAuth) {
            headers["x-csrf-token"] = this.csrfToken;
            headers["x-shopify-web-force-proxy"] = "1";
        }
        if (options?.isJson) {
            headers.accept = "application/json";
            headers["content-type"] = "application/json";
        }
        return headers;
    }
    async startSession(force = false) {
        try {
            const cached = await chrome.storage.local.get([
                "shopifyCsrfToken",
                "shopifySessionId",
            ]);
            if (!force &&
                cached.shopifyCsrfToken &&
                cached.shopifySessionId) {
                this.csrfToken = cached.shopifyCsrfToken;
                this.sessionId = cached.shopifySessionId;
                return;
            }
            let html = "";
            const response = await fetch(this.adminDomain, {
                headers: this.getHeaders(),
                method: "GET",
                credentials: "include",
            });
            if (response.ok) {
                html = await response.text();
            }
            else {
                html = await this.refreshTokens();
                if (!html) {
                    throw new Error(`Failed to fetch tokens (${response.status}) ${await response.text()}`);
                }
            }
            let serverDataMatch = html.match(/<script[^>]*data-serialized-id="server-data"[^>]*>([\s\S]*?)<\/script>/i);
            if (!serverDataMatch?.[1]) {
                html = await this.refreshTokens();
                const retryMatch = html.match(/<script[^>]*data-serialized-id="server-data"[^>]*>([\s\S]*?)<\/script>/i);
                if (!retryMatch?.[1]) {
                    throw new Error("Tokens not found in HTML response");
                }
                serverDataMatch = retryMatch;
            }
            const parsed = JSON.parse(serverDataMatch[1]);
            this.csrfToken = parsed.csrfToken;
            this.sessionId = parsed.sessionId;
            await chrome.storage.local.set({
                shopifyCsrfToken: this.csrfToken,
                shopifySessionId: this.sessionId,
            });
        }
        catch (error) {
            throw error;
        }
    }
    async refreshTokens() {
        return new Promise(async (resolve) => {
            const tab = await chrome.tabs.create({
                url: this.adminDomain,
                active: false,
            });
            if (!tab?.id) {
                resolve("");
                return;
            }
            let done = false;
            const timeout = setTimeout(async () => {
                done = true;
                await chrome.tabs.remove(tab.id);
                resolve("");
            }, 40_000);
            const readDom = () => document.documentElement.outerHTML;
            const listener = async (tabId, changeInfo) => {
                if (done || changeInfo.status !== "complete" || tabId !== tab.id) {
                    return;
                }
                let html = "";
                do {
                    if (done)
                        return;
                    await new Promise((r) => setTimeout(r, 5000));
                    const result = await chrome.scripting.executeScript({
                        target: { tabId },
                        func: readDom,
                    });
                    html = result?.[0]?.result ?? "";
                } while (!html.includes("_csrfToken"));
                done = true;
                await chrome.tabs.remove(tab.id);
                chrome.tabs.onUpdated.removeListener(listener);
                clearTimeout(timeout);
                resolve(html);
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    }
    async getLocationId() {
        await this.startSession();
        const response = await fetch(`${this.graphqlUrl}?operation=ShopifyLocations`, {
            method: "POST",
            headers: this.getHeaders({ requiresAuth: true, isJson: true }),
            credentials: "include",
            body: JSON.stringify({
                operationName: "ShopifyLocations",
                variables: {},
                query: GET_LOCATION_QUERY,
            }),
        });
        if (response.status === 401) {
            throw new Error("Please check you are logged in to your Shopify account in another tab.");
        }
        const json = await response.json();
        const locationId = json?.data?.merchantLocations?.edges?.[0]?.node?.id ?? "";
        if (!locationId) {
            throw new Error("Shopify store location not found.");
        }
        return locationId;
    }
    async uploadImages(files) {
        await this.startSession();
        const response = await fetch(`${this.graphqlUrl}?operation=UploadMedia`, {
            method: "POST",
            headers: this.getHeaders({ requiresAuth: true, isJson: true }),
            credentials: "include",
            body: JSON.stringify({
                operationName: "UploadMedia",
                variables: {
                    input: files.map((file) => ({
                        filename: file.name,
                        resource: "IMAGE",
                        fileSize: file.size.toString(),
                        mimeType: file.type,
                        httpMethod: "POST",
                    })),
                },
                query: UPLOAD_MEDIA_MUTATION,
            }),
        });
        if (response.status === 401) {
            throw new Error("Please check you are logged in to your Shopify account in another tab.");
        }
        const json = await response.json();
        const targets = json?.data?.stagedUploadsCreate?.stagedTargets ?? [];
        if (!targets.length) {
            throw new Error("Image upload failed.");
        }
        const uploadTasks = files.map((file, index) => () => {
            const target = targets[index];
            return this.uploadImageFile(file, target);
        });
        return chunkConcurrentRequestsWithRetry(uploadTasks, 5);
    }
    async uploadImageFile(file, target) {
        const form = new FormData();
        for (const param of target.parameters) {
            form.append(param.name, param.value);
        }
        form.append("file", file, file.name);
        const response = await fetch(SHOPIFY_UPLOAD_IMAGE_URL, {
            method: "POST",
            body: form,
            headers: {
                accept: "*/*",
                "accept-language": "en-US,en;q=0.9",
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to upload image ${file.name}`);
        }
        return {
            success: true,
            mediaContentType: "IMAGE",
            originalSource: target.resourceUrl,
        };
    }
    async postListing(payload) {
        await this.startSession();
        const response = await fetch(`${this.graphqlUrl}?operation=CreateProduct`, {
            method: "POST",
            headers: this.getHeaders({ requiresAuth: true, isJson: true }),
            credentials: "include",
            body: JSON.stringify({
                operationName: "CreateProduct",
                variables: payload,
                query: CREATE_PRODUCT_MUTATION,
            }),
        });
        const text = await response.text();
        if (text === "Unauthorized") {
            return {
                success: false,
                message: "Please check you are logged in to your Shopify account in another tab.",
                internalErrors: text,
            };
        }
        const json = JSON.parse(text);
        const productId = json?.data?.productCreate?.product?.id;
        const errors = json?.data?.productCreate?.userErrors ?? [];
        if (errors.length) {
            return {
                success: false,
                message: errors[0].message ?? "Shopify returned an error.",
                internalErrors: JSON.stringify(errors),
            };
        }
        if (!productId) {
            return {
                success: false,
                message: "An unexpected error occurred while creating the product.",
                internalErrors: JSON.stringify(json),
            };
        }
        const id = productId.split("/").pop() ?? productId;
        return {
            success: true,
            product: {
                id,
                url: `${this.adminDomain}/products/${id}`,
            },
        };
    }
    async updateListing(payload) {
        await this.startSession();
        const response = await fetch(`${this.graphqlUrl}?operation=ProductSaveUpdate&type=mutation`, {
            method: "POST",
            headers: this.getHeaders({ requiresAuth: true, isJson: true }),
            credentials: "include",
            body: JSON.stringify({
                operationName: "ProductSaveUpdate",
                variables: payload,
                query: PRODUCT_SAVE_UPDATE_MUTATION,
            }),
        });
        const text = await response.text();
        if (text === "Unauthorized") {
            return {
                success: false,
                message: "Please check you are logged in to your Shopify account in another tab.",
                internalErrors: text,
            };
        }
        const json = JSON.parse(text);
        const errors = json?.data?.productUpdate?.userErrors ?? [];
        if (errors.length) {
            return {
                success: false,
                message: errors[0].message ?? "Shopify returned an error.",
                internalErrors: JSON.stringify(errors),
            };
        }
        const id = payload.productId.split("/").pop() ?? payload.productId;
        return {
            success: true,
            product: {
                id,
                url: `${this.adminDomain}/products/${id}`,
            },
        };
    }
    async delistListing(id) {
        await this.startSession();
        const response = await fetch(`${this.graphqlUrl}?operation=UpdateProduct`, {
            method: "POST",
            headers: this.getHeaders({ requiresAuth: true, isJson: true }),
            credentials: "include",
            body: JSON.stringify({
                operationName: "UpdateProduct",
                variables: {
                    product: {
                        id: `gid://shopify/Product/${id}`,
                        workflow: "product-details-update",
                        status: "ARCHIVED",
                    },
                    inventoryItemAdjustments: [],
                    locationId: await this.getLocationId(),
                    withVariants: false,
                    includeSubscriptions: true,
                },
                query: UPDATE_PRODUCT_MUTATION,
            }),
        });
        if (response.status === 401) {
            return {
                success: false,
                message: "Please check you are logged in to your Shopify account in another tab.",
                internalErrors: "Unauthorized",
            };
        }
        const json = await response.json();
        const errors = json?.data?.productUpdate?.userErrors ?? [];
        if (errors.length) {
            return {
                success: false,
                message: errors[0].message ?? "Shopify returned an error.",
                internalErrors: JSON.stringify(errors),
            };
        }
        return { success: true };
    }
    async getListings(cursor, limit = 50) {
        await this.startSession();
        const response = await fetch(`${this.graphqlUrl}?operation=ProductIndex`, {
            method: "POST",
            headers: this.getHeaders({ requiresAuth: true, isJson: true }),
            credentials: "include",
            body: JSON.stringify({
                operationName: "ProductIndex",
                variables: { cursor },
                query: PRODUCT_INDEX_QUERY,
            }),
        });
        if (response.status !== 200) {
            throw new Error("Please enter a valid Shopify admin shop URL in your Crosslist settings.");
        }
        const json = await response.json();
        const edges = json?.data?.products?.edges ?? [];
        const products = edges.map((edge) => {
            const node = edge.node;
            const marketplaceId = node.id.split("/").pop();
            return {
                marketplaceId,
                title: node.title ?? null,
                price: node.priceRangeV2?.maxVariantPrice?.amount ?? null,
                coverImage: node.featuredImage?.transformedSrc ?? null,
                created: node.createdAt ?? null,
                marketplaceUrl: `${this.adminDomain}/products/${marketplaceId}`,
                status: (node.status ?? 'ACTIVE'),
            };
        });
        const hasNextPage = json?.data?.products?.pageInfo?.hasNextPage;
        const nextCursor = json?.data?.products?.pageInfo?.endCursor ?? null;
        return {
            products,
            nextPage: hasNextPage ? nextCursor : null,
            username: this.shopId,
        };
    }
    async getListing(id) {
        await this.startSession();
        const response = await fetch(`${this.graphqlUrl}?operation=AdminProductDetails&type=query`, {
            method: "POST",
            headers: this.getHeaders({ requiresAuth: true, isJson: true }),
            credentials: "include",
            body: JSON.stringify({
                operationName: "AdminProductDetails",
                variables: {
                    productId: `gid://shopify/Product/${id}`,
                    variantsLimit: 50,
                    imagesFirst: 20,
                    imagesAfter: null,
                    locationsFirst: 250,
                    includeSubscriptions: true,
                },
                query: ADMIN_PRODUCT_DETAILS_QUERY,
            }),
        });
        const json = await response.json();
        const product = json?.data?.product;
        if (!product) {
            return null;
        }
        return this.mapShopifyProduct(product, id);
    }
    async ensureMetafieldDefinitions(definitions) {
        await this.startSession();
        const existingResponse = await fetch(`${this.graphqlUrl}?operation=getMetafieldDefinitions`, {
            method: "POST",
            headers: this.getHeaders({ requiresAuth: true, isJson: true }),
            credentials: "include",
            body: JSON.stringify({
                operationName: "getMetafieldDefinitions",
                variables: {
                    ownerType: "PRODUCTVARIANT",
                    namespace: "custom",
                },
                query: GET_METAFIELD_DEFINITIONS_QUERY,
            }),
        });
        const json = await existingResponse.json();
        const existing = json?.data?.metafieldDefinitions?.edges ?? [];
        for (const definition of definitions) {
            const alreadyExists = existing.some((edge) => edge.node.namespace === definition.namespace &&
                edge.node.key === definition.key);
            if (alreadyExists) {
                continue;
            }
            await fetch(`${this.graphqlUrl}?operation=createMetafieldDefinition`, {
                method: "POST",
                headers: this.getHeaders({ requiresAuth: true, isJson: true }),
                credentials: "include",
                body: JSON.stringify({
                    operationName: "createMetafieldDefinition",
                    variables: {
                        definition: {
                            ...definition,
                            ownerType: "PRODUCTVARIANT",
                            visibleToStorefrontApi: true,
                        },
                    },
                    query: CREATE_METAFIELD_DEFINITION_MUTATION,
                }),
            });
        }
    }
    async checkLogin() {
        try {
            await this.startSession();
            return true;
        }
        catch {
            return false;
        }
    }
    getProductUrl(id) {
        return `${this.adminDomain}/products/${id}`;
    }
    mapShopifyProduct(product, id) {
        const firstVariant = product.variants?.edges?.[0]?.node ?? {};
        const images = product.images?.edges?.map((edge) => edge.node?.src) ?? [];
        const sizeOption = firstVariant.selectedOptions?.find((option) => option.name === "Size");
        const colorOption = firstVariant.selectedOptions?.find((option) => option.name === "Color" || option.name === "Colour");
        return {
            id,
            marketPlaceId: id,
            title: product.title ?? "",
            description: this.sanitizeHtml(product.descriptionHtml ?? ""),
            tags: product.tags ?? [],
            category: product.category?.id
                ? [product.category.id.split("/").pop()]
                : [],
            brand: product.vendor ?? undefined,
            condition: Condition.Good,
            color: this.convertColor(colorOption?.value),
            size: sizeOption?.value ? [sizeOption.value] : undefined,
            price: Number(firstVariant.price ?? 0),
            images: images.slice(1),
            cover: images[0],
            coverSmall: images[0],
            shipping: {
                shippingWeight: this.weightToCrosslistWeight(firstVariant.weight, firstVariant.weightUnit),
            },
            marketplaceUrl: this.getProductUrl(id),
            dynamicProperties: {},
        };
    }
    sanitizeHtml(value) {
        return value
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p\s*>/gi, "\n")
            .replace(/<p\s*>/gi, "")
            .replace(/(<([^>]+)>)/gi, "")
            .replace(/&(nbsp|amp|quot|lt|gt);/g, (match, entity) => {
            const map = {
                nbsp: " ",
                amp: "&",
                quot: '"',
                lt: "<",
                gt: ">",
            };
            return map[entity] ?? match;
        });
    }
    convertColor(value) {
        if (!value) {
            return undefined;
        }
        if (value === "grey") {
            return Color.Gray;
        }
        if (isColor(value)) {
            return value;
        }
        return undefined;
    }
    weightToCrosslistWeight(weight, unit) {
        if (weight == null || !unit) {
            return undefined;
        }
        switch (unit) {
            case "OUNCES":
                return { value: Math.round(weight), unit: "Ounces" };
            case "POUNDS":
                return { value: Math.round(weight * 16), unit: "Ounces" };
            case "GRAMS":
                return { value: Math.round(weight), unit: "Grams" };
            case "KILOGRAMS":
                return { value: Math.round(weight * 1000), unit: "Grams" };
            default:
                return undefined;
        }
    }
}
