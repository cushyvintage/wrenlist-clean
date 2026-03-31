import { Condition } from "../../shared/enums.js";
import { ETSY_BASE_URL, ETSY_LISTINGS_MANAGER_URL, ETSY_SESSION_COOKIE } from "./constants.js";
import { wait } from "../../shared/crosslistApi.js";
export class EtsyClient {
    baseUrl;
    shopId = null;
    constructor() {
        this.baseUrl = ETSY_BASE_URL;
    }
    async checkLogin() {
        const cookie = await chrome.cookies.get({
            url: this.baseUrl,
            name: ETSY_SESSION_COOKIE,
        });
        return !!cookie;
    }
    getProductUrl(id) {
        return `${this.baseUrl}/listing/${id}`;
    }
    async getShopId() {
        if (this.shopId)
            return this.shopId;
        // Extract shop ID from the listings manager page
        const html = await fetch(ETSY_LISTINGS_MANAGER_URL, {
            credentials: "include",
        }).then((r) => r.text());
        const match = html.match(/"shop_id"\s*:\s*(\d+)/) ??
            html.match(/\/shop\/(\d+)\//) ??
            html.match(/shops\/(\d+)/);
        if (!match?.[1]) {
            throw new Error("Could not determine Etsy shop ID.");
        }
        this.shopId = match[1];
        return this.shopId;
    }
    async getListings(page, limit = 40) {
        const shopId = await this.getShopId();
        const offset = page ? parseInt(page, 10) * limit : 0;
        // Fetch inactive listings (includes expired, deactivated)
        const url = new URL(`${this.baseUrl}/api/v3/ajax/shop/${shopId}//listings/v3/search`);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("offset", String(offset));
        url.searchParams.set("sort_field", "ending_date");
        url.searchParams.set("sort_order", "descending");
        url.searchParams.set("state", "inactive");
        url.searchParams.set("language_id", "0");
        url.searchParams.set("query", "");
        url.searchParams.set("is_retail", "true");
        const resp = await fetch(url.toString(), {
            credentials: "include",
            headers: { Accept: "application/json" },
        });
        if (!resp.ok) {
            throw new Error(`Etsy listings API returned ${resp.status}`);
        }
        const data = (await resp.json());
        const listings = Array.isArray(data) ? data : [];
        const products = listings.map((l) => ({
            marketplaceId: String(l.listing_id),
            title: l.title ?? null,
            price: l.price ? parseFloat(l.price) : null,
            coverImage: l.listing_images?.[0]?.url ?? null,
            created: null,
            marketplaceUrl: l.url ?? this.getProductUrl(l.listing_id),
        }));
        const nextOffset = offset + limit;
        const nextPage = listings.length === limit ? String(nextOffset / limit) : null;
        return {
            products,
            nextPage,
        };
    }
    async getListing(id) {
        const shopId = await this.getShopId();
        const resp = await fetch(`${this.baseUrl}/api/v3/ajax/shop/${shopId}//listings/${id}`, {
            credentials: "include",
            headers: { Accept: "application/json" },
        });
        if (!resp.ok)
            return null;
        const l = (await resp.json());
        if (!l?.listing_id)
            return null;
        // Images: prefer `images` array (URLs), fall back to listing_images
        const imageUrls = Array.isArray(l.images) && l.images.length > 0
            ? l.images
            : (l.listing_images ?? []).map((img) => img.url);
        const price = l.price_int ? l.price_int / 100 : parseFloat(l.price ?? "0");
        const tags = Array.isArray(l.tags) ? l.tags.join(", ") : "";
        const materials = Array.isArray(l.materials) ? l.materials : [];
        return {
            id,
            marketPlaceId: id,
            marketplaceId: id,
            marketplaceUrl: l.url ?? this.getProductUrl(id),
            title: l.title ?? "",
            description: l.description ?? "",
            price,
            condition: Condition.Good,
            category: l.taxonomy_name ? [l.taxonomy_name] : [],
            tags,
            images: imageUrls.slice(1),
            cover: imageUrls[0],
            coverSmall: imageUrls[0],
            quantity: l.quantity ?? 1,
            whenMade: l.when_made ?? undefined,
            dynamicProperties: {
                ...(l.taxonomy_name ? { taxonomy: l.taxonomy_name } : {}),
                ...(materials.length ? { materials: materials.join(", ") } : {}),
            },
            shipping: {},
            acceptOffers: false,
            smartPricing: false,
            smartPricingPrice: undefined,
        };
    }
    /**
     * Crosslist a product to Etsy via form-fill
     * Opens the Etsy listing creation page and fills in product details
     * User can review and submit from there
     */
    async crosslistProduct(product) {
        try {
            // Check if user is logged in
            const isLoggedIn = await this.checkLogin();
            if (!isLoggedIn) {
                return {
                    success: false,
                    message: "Not logged into Etsy. Please log in first.",
                    needsLogin: true,
                };
            }
            // Open the Etsy listing creation page
            const creationUrl = `${this.baseUrl}/selling/listings/create`;
            const tab = await chrome.tabs.create({ url: creationUrl, active: true });
            if (!tab.id) {
                return {
                    success: false,
                    message: "Failed to open Etsy listing page",
                };
            }
            // Wait for page to load
            await wait(3000);
            // Inject script to fill form fields
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: fillEtsyListingForm,
                args: [
                    {
                        title: product.title,
                        description: product.description,
                        price: product.price,
                        quantity: product.quantity ?? 1,
                        category: product.category?.[0] || "",
                        tags: product.tags || "",
                        imageUrls: product.images || [],
                    },
                ],
            });
            const executionResult = result?.[0]?.result;
            if (executionResult?.success) {
                return {
                    success: true,
                    message: "Listing form filled. Please review and submit on Etsy.",
                    product: {
                        id: product.id,
                        url: creationUrl,
                    },
                };
            }
            else {
                return {
                    success: false,
                    message: executionResult?.message || "Failed to fill Etsy listing form",
                };
            }
        }
        catch (error) {
            console.error("[Etsy] Form fill error:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
}
/**
 * Function to be injected into Etsy's listing page to fill the form
 * Executed in the context of the web page
 * Uses aria-label selectors which are more robust with React-rendered forms
 */
function fillEtsyListingForm(data) {
    try {
        const { title, description, price, quantity, tags, imageUrls } = data;
        // Find and fill title input - try aria-label first, then fallback to name/placeholder
        let titleInput = document.querySelector('input[aria-label*="title"]');
        if (!titleInput) {
            titleInput = document.querySelector('input[name="title"], input[name="listing_title"], input[placeholder*="title"]');
        }
        if (titleInput) {
            const truncatedTitle = title.slice(0, 140);
            titleInput.value = truncatedTitle;
            titleInput.dispatchEvent(new Event("input", { bubbles: true }));
            titleInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
        // Find and fill description - try aria-label first, then contenteditable
        let descriptionInput = document.querySelector('textarea[aria-label*="description"], textarea[name="description"]');
        if (!descriptionInput) {
            descriptionInput = document.querySelector('[contenteditable="true"]');
        }
        if (descriptionInput) {
            const truncatedDesc = description.slice(0, 4000);
            const elem = descriptionInput;
            if ("value" in descriptionInput) {
                descriptionInput.value = truncatedDesc;
                elem.dispatchEvent(new Event("input", { bubbles: true }));
                elem.dispatchEvent(new Event("change", { bubbles: true }));
            }
            else if (elem.contentEditable === "true") {
                elem.textContent = truncatedDesc;
                elem.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        // Find and fill price - try aria-label first
        let priceInput = document.querySelector('input[aria-label*="price"]');
        if (!priceInput) {
            priceInput = document.querySelector('input[name="price"], input[type="text"][placeholder*="price"]');
        }
        if (priceInput) {
            priceInput.value = String(price.toFixed(2));
            priceInput.dispatchEvent(new Event("input", { bubbles: true }));
            priceInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
        // Find and fill quantity - try aria-label first
        let quantityInput = document.querySelector('input[aria-label*="quantity"]');
        if (!quantityInput) {
            quantityInput = document.querySelector('input[name="quantity"], input[type="number"]');
        }
        if (quantityInput) {
            quantityInput.value = String(quantity);
            quantityInput.dispatchEvent(new Event("input", { bubbles: true }));
            quantityInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
        // Find and fill tags if provided
        if (tags) {
            const tagInputs = document.querySelectorAll('input[aria-label*="tag"], input[name*="tag"]');
            if (tagInputs.length > 0) {
                const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
                tagList.forEach((tag, index) => {
                    const input = tagInputs[index];
                    if (input) {
                        input.value = tag;
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                        input.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                });
            }
        }
        return {
            success: true,
            message: "Form fields filled successfully",
        };
    }
    catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
