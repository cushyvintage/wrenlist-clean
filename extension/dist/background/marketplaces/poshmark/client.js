import { checkAlreadyExecuted, getLoggingInfo, log, } from "../../shared/api.js";
import { Condition, Color, isColor } from "../../shared/enums.js";
import { getPoshmarkBrandSearchUrl, getPoshmarkCreateListingUrl, getPoshmarkDomain, getPoshmarkMetaCatalogUrl, getPoshmarkPostsUrl, POSHMARK_APP_VERSION, POSHMARK_PM_VERSION, } from "./constants.js";
import { PoshmarkMapper, } from "./mapper.js";
export class PoshmarkClient {
    tld;
    csrfToken = "";
    userId = "";
    domain;
    createListingUrl;
    brandSearchUrl;
    mapper;
    constructor(tld) {
        this.tld = tld;
        this.domain = getPoshmarkDomain(tld);
        this.createListingUrl = getPoshmarkCreateListingUrl(tld);
        this.brandSearchUrl = getPoshmarkBrandSearchUrl(tld);
        this.mapper = new PoshmarkMapper({
            uploadImage: this.uploadImage.bind(this),
            getBrand: this.getBrand.bind(this),
        }, tld);
    }
    async ensureSession(force = false) {
        if (!force && this.csrfToken && this.userId) {
            return;
        }
        await this.startSession();
    }
    async startSession() {
        const response = await fetch(this.createListingUrl, {
            method: "GET",
            credentials: "include",
        });
        const html = await response.text();
        const stateMatch = html.match(/window\.__INITIAL_STATE__=({.*?});/);
        if (!stateMatch?.[1]) {
            throw new Error("Poshmark user state not found.");
        }
        let parsed;
        try {
            parsed = JSON.parse(stateMatch[1]);
        }
        catch (error) {
            throw new Error(`Unable to parse Poshmark session: ${error}`);
        }
        const userId = parsed?.userCookies?.userInfo?.uid;
        if (!userId) {
            throw new Error("Poshmark user id not found in session.");
        }
        const tokenMatch = html.match(/<meta[^>]+name="csrftoken"[^>]+content="([0-9a-zA-Z-]+)"/);
        if (!tokenMatch?.[1]) {
            throw new Error("Poshmark CSRF token not found.");
        }
        this.userId = userId;
        this.csrfToken = tokenMatch[1];
    }
    async createDraft() {
        await this.ensureSession();
        await this.storeCategories();
        const response = await fetch(`${getPoshmarkPostsUrl(this.tld, this.userId)}?pm_version=${POSHMARK_PM_VERSION}`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-xsrf-token": this.csrfToken,
            },
            credentials: "include",
        });
        const body = await response.json();
        if (!body.id) {
            throw new Error(body.error?.userMessage ??
                "Unable to create Poshmark draft listing.");
        }
        return body.id;
    }
    async postListing(product) {
        await this.ensureSession();
        const draftId = await this.createDraft();
        const payload = await this.mapper.map(product, draftId);
        const saveResult = await this.saveListingPayload(payload);
        if (!saveResult.success) {
            return saveResult;
        }
        const publishResult = await this.publishListing(draftId);
        if (!publishResult.success) {
            return publishResult;
        }
        return {
            success: true,
            product: {
                id: draftId,
                url: this.getProductUrl(draftId),
            },
        };
    }
    async updateListing(product) {
        await this.ensureSession();
        const listingId = product.marketplaceId ?? product.marketPlaceId;
        if (!listingId) {
            throw new Error("Missing Poshmark listing id.");
        }
        const payload = await this.mapper.map(product, listingId);
        const existing = await this.getPoshmarkListing(listingId);
        if (!existing) {
            return {
                success: false,
                message: "Listing not found on Poshmark.",
            };
        }
        const updatePayload = { ...payload };
        delete updatePayload.id;
        if (existing.inventory) {
            updatePayload.inventory.size_quantity_revision =
                existing.inventory.size_quantity_revision ?? 0;
            updatePayload.inventory.status_changed_at =
                existing.inventory.status_changed_at ?? null;
        }
        const response = await fetch(`${this.domain}/vm-rest/posts/${listingId}?pm_version=${POSHMARK_PM_VERSION}`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-xsrf-token": this.csrfToken,
            },
            credentials: "include",
            body: JSON.stringify({ post: updatePayload }),
        });
        const body = await response.json();
        if (body.error) {
            return {
                success: false,
                message: body.error.userMessage ?? "Failed to update listing.",
                internalErrors: JSON.stringify(body),
            };
        }
        return {
            success: true,
            product: {
                id: listingId,
                url: this.getProductUrl(listingId),
            },
        };
    }
    async delistListing(id) {
        await this.ensureSession();
        const response = await fetch(`${this.domain}/vm-rest/posts/${id}?app_version=${POSHMARK_APP_VERSION}&app_type=web&pm_version=${POSHMARK_PM_VERSION}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (response.status !== 200) {
            return {
                success: false,
                internalErrors: await response.text(),
            };
        }
        const body = await response.json();
        if (body.error || body.success === false) {
            return {
                success: false,
                message: body.error?.userMessage ?? body.error?.errorType,
                internalErrors: JSON.stringify(body),
            };
        }
        return { success: true };
    }
    async saveListingPayload(payload) {
        const response = await fetch(`${this.domain}/vm-rest/posts/${payload.id}?pm_version=${POSHMARK_PM_VERSION}`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-xsrf-token": this.csrfToken,
            },
            credentials: "include",
            body: JSON.stringify({ post: payload }),
        });
        const body = await response.json();
        if (body.error) {
            return {
                success: false,
                message: body.error.userMessage ?? "Failed to save Poshmark draft.",
                internalErrors: JSON.stringify(body),
            };
        }
        return { success: true };
    }
    async publishListing(id) {
        const response = await fetch(`${this.domain}/vm-rest/posts/${id}/status/published?pm_version=${POSHMARK_PM_VERSION}&app_version=${POSHMARK_APP_VERSION}&user_certified=true`, {
            method: "PUT",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-xsrf-token": this.csrfToken,
            },
            credentials: "include",
        });
        if (!response.ok) {
            const text = await response.text();
            return {
                success: false,
                message: "Failed to publish Poshmark listing.",
                internalErrors: text,
            };
        }
        return { success: true };
    }
    async uploadImage(file, order, listingId) {
        await this.ensureSession();
        const form = new FormData();
        form.append("file", file, `file${order}.jpg`);
        const response = await fetch(`${this.domain}/api/posts/${listingId}/media/scratch?app_type=web`, {
            method: "POST",
            body: form,
            headers: {
                Accept: "application/json",
                "X-XSRF-TOKEN": this.csrfToken,
            },
            credentials: "include",
        });
        const body = await response.json();
        if (!body.id) {
            throw new Error("Failed to upload image to Poshmark.");
        }
        return body.id;
    }
    async getBrand(department, keyword) {
        await this.ensureSession();
        const params = new URLSearchParams({
            query: keyword ?? "",
            ignore_exp: "true",
            department: department ?? "All",
            pm_version: POSHMARK_PM_VERSION,
        });
        const response = await fetch(`${this.brandSearchUrl}?${params.toString()}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-xsrf-token": this.csrfToken,
            },
            credentials: "include",
        });
        const data = await response.json();
        return data.error ? [] : data.data ?? [];
    }
    async getPoshmarkListing(id) {
        const response = await fetch(`${this.domain}/vm-rest/posts/${id}`, {
            method: "GET",
            credentials: "include",
        });
        if (!response.ok) {
            return null;
        }
        return (await response.json());
    }
    async getListings(page, limit = 48, username) {
        await this.ensureSession();
        let user = username;
        if (!user) {
            const response = await fetch(`${this.domain}/user/edit-profile`, {
                credentials: "include",
            });
            const html = await response.text();
            const match = html.match(/("dh":"?)(.*?)(\",)/);
            if (!match || match.length !== 4) {
                throw new Error("Please check you are logged in to Poshmark.");
            }
            user = match[2];
        }
        const requestPayload = {
            filters: {
                department: "All",
                inventory_status: ["available"],
            },
            sort_by: "added_desc",
            experience: "all",
            count: limit,
            ...(page ? { max_id: page } : {}),
        };
        const url = `${this.domain}/vm-rest/users/${user}/posts/filtered?request=${encodeURIComponent(JSON.stringify(requestPayload))}&summarize=true&app_version=${POSHMARK_APP_VERSION}&pm_version=${POSHMARK_PM_VERSION}`;
        const response = await fetch(url, { credentials: "include" });
        const body = await response.json();
        const products = (body.data ?? []).map((item) => ({
            marketplaceId: item.id?.toString() ?? "",
            title: item.title ?? null,
            price: item.price_amount?.val ?? null,
            coverImage: item.cover_shot?.url_small ?? null,
            created: item.created_at ?? null,
            marketplaceUrl: this.getProductUrl(item.id),
        }));
        return {
            products,
            nextPage: body.more ? body.more.next_max_id ?? null : null,
            username: user,
        };
    }
    async getListing(id) {
        await this.ensureSession();
        const listing = await this.getPoshmarkListing(id);
        if (!listing) {
            return null;
        }
        return this.convertPoshmarkProductInfo(listing);
    }
    async checkLogin() {
        const cookie = await chrome.cookies.get({
            url: this.domain,
            name: "jwt",
        });
        return Boolean(cookie);
    }
    convertPoshmarkProductInfo(listing) {
        const mapColor = (value) => {
            if (!value)
                return undefined;
            if (value === "Gray" || value === "eGrey")
                return Color.Gray;
            return isColor(value) ? value : undefined;
        };
        const availability = listing.inventory?.status === "not_for_sale" ? "NotForSale" : "ForSale";
        const product = {
            id: listing.id,
            marketPlaceId: listing.id,
            title: listing.title,
            description: listing.description ?? "",
            category: [
                listing.catalog?.category ?? "",
                listing.category_features?.[0]?.id ?? "",
            ],
            quantity: 1,
            size: listing.size,
            condition: listing.condition === "nwt" || listing.condition === "ret"
                ? Condition.NewWithTags
                : Condition.VeryGood,
            brand: listing.brand ?? undefined,
            color: listing.colors?.[0]?.name
                ? mapColor(listing.colors[0].name)
                : undefined,
            color2: listing.colors?.[1]?.name
                ? mapColor(listing.colors[1].name)
                : undefined,
            price: listing.price_amount?.val
                ? parseFloat(listing.price_amount.val)
                : 0,
            originalPrice: listing.original_price_amount?.val
                ? parseFloat(listing.original_price_amount.val)
                : undefined,
            availability,
            sku: listing.seller_private_info?.sku,
            images: listing.pictures?.map((picture) => picture.url_large) ?? [],
            styleTags: listing.style_tags ?? [],
            dynamicProperties: listing.condition === "ret" ? { IsBoutique: "true" } : {},
            shipping: {},
            marketplaceUrl: this.getProductUrl(listing.id),
            tags: "",
            acceptOffers: false,
            smartPricing: false,
            smartPricingPrice: undefined,
        };
        return product;
    }
    async storeCategories() {
        try {
            await checkAlreadyExecuted("categoryLastLoggedPoshmark", async () => {
                const info = (await getLoggingInfo("Category", "poshmark", this.tld));
                if (info?.isLogged) {
                    return;
                }
                const response = await fetch(getPoshmarkMetaCatalogUrl(this.tld));
                const body = await response.json();
                await log("Category", JSON.stringify(body), null, "poshmark", this.tld);
            }, 10);
        }
        catch (error) {
            console.warn("[Poshmark] storeCategories failed", error);
        }
    }
    getProductUrl(id) {
        return `${this.domain}/listing/${id}`;
    }
}
