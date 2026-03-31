import { chunkConcurrentRequestsWithRetry, checkAlreadyExecuted, getLoggingInfo, log, } from "../../shared/crosslistApi.js";
import { Condition } from "../../shared/enums.js";
import { ADD_LISTING_PHOTO_MUTATION, CREATE_LISTING_MUTATION, CURRENT_USER_QUERY, GENERATE_MEDIA_UPLOAD_URLS_MUTATION, GET_MY_LIVESTREAMS_QUERY, GET_PRODUCT_ATTRIBUTES_QUERY, GET_SHIPPING_PROFILES_QUERY, SELLER_BULK_LISTING_ACTION_MUTATION, SELLER_HUB_INVENTORY_EDIT_QUERY, SELLER_HUB_INVENTORY_QUERY, UPDATE_LISTING_MUTATION, WHATNOT_DOMAIN, WHATNOT_GRAPHQL_API, } from "./constants.js";
export class WhatnotClient {
    tld;
    sessionId = "";
    userId = "";
    constructor(tld) {
        this.tld = tld;
    }
    getHeaders(options) {
        const headers = {
            accept: "*/*",
            "accept-language": "en-US",
            priority: "u=1, i",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "none",
            "sec-gpc": "1",
            "X-Whatnot-App": "whatnot-web",
            "X-Whatnot-Context": "next-js/browser",
            "X-Whatnot-App-Version": "20250414-1535",
            "X-Whatnot-App-Session-Id": this.sessionId,
            "x-Whatnot-App-User-Session-Id": this.userId,
            "X-Whatnot-Usgmt": ",A,",
        };
        if (options?.requiresAuth) {
            headers.Authorization = "Cookie";
        }
        if (options?.isJson) {
            headers.accept = "application/json";
            headers["content-type"] = "application/json";
        }
        return headers;
    }
    async startSession() {
        if (this.sessionId && this.userId) {
            return;
        }
        const response = await fetch(WHATNOT_DOMAIN, {
            headers: this.getHeaders(),
            method: "GET",
            referrerPolicy: "strict-origin-when-cross-origin",
        });
        const html = await response.text();
        const userMatch = html.match(/\\"usid\\":\\"([0-9a-z\-]+)\\"/i);
        if (userMatch?.[1]) {
            this.userId = userMatch[1];
        }
        const sessionMatch = html.match(/\\"appsid\\":\\"([0-9a-z\-]+)\\"/i);
        if (sessionMatch?.[1]) {
            this.sessionId = sessionMatch[1];
        }
    }
    async graphql(operationName, query, variables, options) {
        await this.startSession();
        const response = await fetch(`${WHATNOT_GRAPHQL_API}?operationName=${operationName}&ssr=0`, {
            method: "POST",
            headers: this.getHeaders({
                requiresAuth: options?.requiresAuth ?? true,
                isJson: true,
            }),
            credentials: "include",
            referrerPolicy: "strict-origin-when-cross-origin",
            body: JSON.stringify({
                operationName,
                query,
                variables,
            }),
        });
        if (!response.ok) {
            throw new Error(await response.text());
        }
        return response.json();
    }
    async uploadImageFile(file, target) {
        const res = await fetch(target.url, {
            method: "PUT",
            headers: {
                accept: "application/json",
                "content-type": file.type || "image/jpeg",
            },
            body: file,
        });
        if (!res.ok) {
            throw new Error(`Failed to upload image ${file.name}`);
        }
        return {
            url: new URL(target.url).pathname.slice(1),
            targetKey: target.targetKey,
        };
    }
    async uploadImages(files) {
        if (!files.length) {
            return [];
        }
        const response = (await this.graphql("GenerateMediaUploadUrls", GENERATE_MEDIA_UPLOAD_URLS_MUTATION, {
            media: files.map(() => ({
                id: crypto.randomUUID(),
                extension: "jpg",
            })),
        }));
        const uploads = response?.data?.generateMediaUploadURLs?.uploads ?? [];
        const uploadTasks = files.map((file, index) => () => this.uploadImageFile(file, uploads[index]));
        const staged = await chunkConcurrentRequestsWithRetry(uploadTasks, 5);
        const finalizeTasks = staged.map((upload) => async () => {
            const addResponse = await this.graphql("AddListingPhoto", ADD_LISTING_PHOTO_MUTATION, {
                uuid: null,
                label: upload.url,
                uploadKey: upload.targetKey,
            });
            return addResponse.data.addListingPhoto.image.id;
        });
        return chunkConcurrentRequestsWithRetry(finalizeTasks, 5);
    }
    async postListing(payload) {
        const response = await this.graphql("CreateListing", CREATE_LISTING_MUTATION, payload);
        if (response.errors?.length) {
            return {
                success: false,
                message: response.errors[0].message,
                internalErrors: JSON.stringify(response.errors),
            };
        }
        if (response.data.createListing.error) {
            return {
                success: false,
                message: response.data.createListing.error,
                internalErrors: JSON.stringify(response.data),
            };
        }
        const id = response.data.createListing.listingNode?.id;
        if (!id) {
            return {
                success: false,
                message: "Whatnot did not return a listing id.",
                internalErrors: JSON.stringify(response),
            };
        }
        return {
            success: true,
            product: {
                id,
                url: this.getProductUrl(id),
            },
        };
    }
    async updateListing(payload) {
        const response = await this.graphql("UpdateListing", UPDATE_LISTING_MUTATION, { input: payload });
        if (response.errors?.length || response.data.updateListing2?.error) {
            const message = response.errors?.[0]?.message ??
                response.data.updateListing2?.error ??
                "Unable to update listing.";
            return {
                success: false,
                message,
                internalErrors: JSON.stringify(response),
            };
        }
        const id = response.data.updateListing2?.listingNode?.id;
        if (!id) {
            return {
                success: false,
                message: "Whatnot did not return a listing id.",
                internalErrors: JSON.stringify(response),
            };
        }
        return {
            success: true,
            product: { id, url: this.getProductUrl(id) },
        };
    }
    async delistListing(id) {
        const response = await this.graphql("SellerBulkListingAction", SELLER_BULK_LISTING_ACTION_MUTATION, {
            action: "delete",
            ids: [id],
        });
        if (response.errors?.length) {
            return {
                success: false,
                message: response.errors[0].message,
                internalErrors: JSON.stringify(response.errors),
            };
        }
        const first = response.data.sellerBulkListingAction?.[0];
        if (first?.error) {
            return {
                success: false,
                message: first.error,
                internalErrors: JSON.stringify(response.data),
            };
        }
        return { success: true };
    }
    async getListings(cursor, limit = 100, sellerId) {
        if (!sellerId) {
            const me = await this.getMe();
            if (!me?.id) {
                throw new Error("Could not fetch Whatnot user information.");
            }
            sellerId = me.id;
        }
        const response = await this.graphql("SellerHubInventory", SELLER_HUB_INVENTORY_QUERY, {
            first: limit,
            after: cursor ?? null,
            statuses: ["ACTIVE"],
            sellerId,
        });
        const edges = response.data.me.inventory.edges ?? [];
        const products = edges.map((edge) => ({
            marketplaceId: edge.node.id,
            title: edge.node.title ?? null,
            price: edge.node.price?.amount
                ? edge.node.price.amount / 100
                : null,
            coverImage: edge.node.images?.[0]?.url ?? null,
            created: edge.node.createdAt
                ? new Date(edge.node.createdAt).toJSON()
                : null,
            marketplaceUrl: this.getProductUrl(edge.node.id),
        }));
        const pageInfo = response.data.me.inventory.pageInfo;
        return {
            products,
            nextPage: pageInfo.hasNextPage ? pageInfo.endCursor : null,
            username: sellerId,
        };
    }
    async getListing(id) {
        const response = await this.graphql("SellerHubInventoryEdit", SELLER_HUB_INVENTORY_EDIT_QUERY, {
            includeListing: true,
            listingId: id,
        });
        if (response.data.categories) {
            await this.storeCategories(response.data.categories);
        }
        const listing = response.data.getListing;
        if (!listing) {
            return null;
        }
        const categoryId = listing.product?.category?.id;
        const shippingProfileId = listing.product?.shippingProfile?.id;
        const shippingWeight = categoryId && shippingProfileId
            ? await this.getShippingWeight(categoryId, shippingProfileId)
            : undefined;
        return this.mapListingToCrosslist(listing, shippingWeight);
    }
    async getShippingProfiles(categoryId) {
        const response = await this.graphql("GetShippingProfiles", GET_SHIPPING_PROFILES_QUERY, { categoryId });
        return response.data.shippingProfiles ?? [];
    }
    async getProductAttributes(categoryId) {
        const response = await this.graphql("GetProductAttributes", GET_PRODUCT_ATTRIBUTES_QUERY, { categoryId });
        return response.data.getProductAttributes ?? [];
    }
    async getMyLiveStreams() {
        const response = await this.graphql("SellerHubGetMyLivestreams", GET_MY_LIVESTREAMS_QUERY, {
            status: ["CREATED", "PLAYING", "STOPPED"],
        });
        return response.data.myLiveStreams ?? [];
    }
    async checkLogin() {
        const response = await fetch(`${WHATNOT_DOMAIN}/dashboard/inventory/new`, {
            redirect: "follow",
        });
        return !(response.redirected && response.url.includes("login"));
    }
    async getMe() {
        const response = await this.graphql("CurrentUser", CURRENT_USER_QUERY, {});
        return response.data.currentUser;
    }
    async storeCategories(categories) {
        try {
            await checkAlreadyExecuted("categoryLastLoggedWhatnot", async () => {
                const info = (await getLoggingInfo("Category", "whatnot", this.tld));
                if (info?.isLogged)
                    return;
                await log("Category", JSON.stringify({ categories }), null, "whatnot", this.tld);
            });
        }
        catch (error) {
            console.warn("[Whatnot] storeCategories failed", error);
        }
    }
    async getShippingWeight(categoryId, profileId) {
        const profiles = await this.getShippingProfiles(categoryId);
        const match = profiles?.find((profile) => profile.id === profileId);
        return this.convertToCrosslistWeight(match?.weightAmount, match?.weightScale);
    }
    mapListingToCrosslist(listing, shippingWeight) {
        const categoryId = listing.product?.category?.id ?? null;
        const attributeValue = (predicate) => listing.listingAttributeValues?.find((attr) => predicate(attr.attribute?.key ?? ""))?.value;
        const rawCondition = attributeValue((key) => key.includes("condition"));
        const condition = this.mapCondition(rawCondition);
        const sizeValue = attributeValue((key) => key.includes("clothing_size") || key.includes("shoe_size"));
        const colorValue = attributeValue((key) => key.includes("color"));
        const brandValue = attributeValue((key) => key.includes("brand"));
        const msrpValue = attributeValue((key) => key.includes("msrp"));
        let categoryPath = categoryId ?? null;
        if (categoryPath && this.mapperCategoryIds.includes(`${categoryPath}|`)) {
            const typeValue = attributeValue((key) => this.importableProductTypes.includes(key));
            categoryPath = `${categoryPath}|${typeValue ?? ""}`;
        }
        return {
            id: listing.id,
            marketPlaceId: listing.id,
            title: listing.title ?? "",
            description: listing.description ?? "",
            sku: listing.sku
                ? listing.sku.replace(/\$\$+/g, (match) => match.slice(1))
                : undefined,
            images: listing.images?.map((img) => img.url) ?? [],
            category: categoryPath ? [categoryPath] : [],
            brand: brandValue ?? undefined,
            condition: condition ?? Condition.Good,
            size: sizeValue ? [sizeValue] : undefined,
            color: colorValue ?? undefined,
            price: listing.price?.amount ? listing.price.amount / 100 : 0,
            quantity: listing.quantity ?? 1,
            originalPrice: msrpValue
                ? Number(msrpValue.replace(/\D/g, ""))
                : undefined,
            shippingWeight,
            isAuction: listing.transactionType === "AUCTION",
            auctionStartingPrice: listing.transactionType === "AUCTION"
                ? listing.price?.amount
                    ? listing.price.amount / 100
                    : undefined
                : undefined,
            marketplaceUrl: this.getProductUrl(listing.id),
            dynamicProperties: {},
            tags: "",
            shipping: {},
        };
    }
    mapCondition(value) {
        if (!value)
            return null;
        switch (value) {
            case "New without Tags":
            case "New":
            case "Open-box":
                return Condition.NewWithoutTags;
            case "New With Tags":
            case "Brand New":
            case "Graded":
                return Condition.NewWithTags;
            case "Pre-owned - Excellent":
            case "Refurbished":
            case "Mint":
            case "Near Mint":
                return Condition.VeryGood;
            case "Pre-owned - Good":
            case "Used and fully functioning":
            case "Light Played":
                return Condition.Good;
            case "Pre-owned - Fair":
            case "Moderately Played":
            case "New with Defects":
                return Condition.Fair;
            case "Pre-owned - Damaged":
            case "For parts, not fully functioning, or untested":
            case "Heavily Played":
            case "Damaged":
                return Condition.Poor;
            default:
                return null;
        }
    }
    getProductUrl(id) {
        return `${WHATNOT_DOMAIN}/listing/${id}`;
    }
    convertToCrosslistWeight(amount, scale) {
        if (amount == null || !scale) {
            return undefined;
        }
        switch (scale) {
            case "OUNCE":
                return { value: Math.round(amount), unit: "Ounces" };
            case "POUND":
                return { value: Math.round(amount * 16), unit: "Ounces" };
            case "GRAM":
                return { value: Math.round(amount), unit: "Grams" };
            case "KILO":
                return { value: Math.round(amount * 1000), unit: "Grams" };
            default:
                return undefined;
        }
    }
    importableProductTypes = [
        "fashion.vintage.clothing_type",
        "fashion.universal.type",
        "fashion.thrift.clothing_type",
        "fashion.designer_bag.type",
        "fashion.midrange_bags.type",
        "fashion.kids.clothing_type",
    ];
    mapperCategoryIds = [
        "Q2F0ZWdvcnlOb2RlOjEzMw==|",
        "Q2F0ZWdvcnlOb2RlOjI2Nw==|",
        "Q2F0ZWdvcnlOb2RlOjE0Ng==|",
    ];
}
