import { Condition } from "../../shared/enums.js";
import { ETSY_BASE_URL, ETSY_CREATE_LISTING_URL, ETSY_EDIT_LISTING_URL, ETSY_LISTINGS_MANAGER_URL, ETSY_SESSION_COOKIE, ETSY_WHEN_MADE_VINTAGE, ETSY_WHEN_MADE_RECENT, WRENLIST_TO_ETSY_CATEGORY, } from "./constants.js";
import { wait } from "../../shared/api.js";
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
    // ─── Import (read-only) ────────────────────────────────────────────
    async getListings(page, limit = 40) {
        const shopId = await this.getShopId();
        const offset = page ? parseInt(page, 10) * limit : 0;
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
        return { products, nextPage };
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
    // ─── Publish ───────────────────────────────────────────────────────
    /**
     * Publish a product to Etsy via browser automation.
     * Opens the listing editor, fills all fields, uploads images,
     * selects category, and clicks Publish.
     */
    async publishProduct(product) {
        try {
            const isLoggedIn = await this.checkLogin();
            if (!isLoggedIn) {
                return {
                    success: false,
                    message: "Not logged into Etsy. Please log in first.",
                    needsLogin: true,
                };
            }
            const tab = await chrome.tabs.create({
                url: ETSY_CREATE_LISTING_URL,
                active: true,
            });
            if (!tab.id) {
                return { success: false, message: "Failed to open Etsy listing page" };
            }
            // Wait for the React app to fully render
            await this.waitForPageReady(tab.id, "#listing-title-input", 15000);
            const formData = this.buildFormData(product);
            // Step 1: Upload images first (they take time to process)
            if (formData.imageUrls.length > 0 || formData.coverUrl) {
                await this.uploadImages(tab.id, formData.coverUrl, formData.imageUrls);
            }
            // Step 2: Fill all text fields, selects, and radios
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: fillEtsyListingForm,
                args: [formData],
            });
            const execResult = result?.[0]?.result;
            if (!execResult?.success) {
                return {
                    success: false,
                    message: execResult?.message || "Failed to fill Etsy listing form",
                };
            }
            // Step 3: Select category via search typeahead
            if (formData.categorySearch) {
                await this.selectCategory(tab.id, formData.categorySearch);
            }
            // Step 4: Click Publish
            await wait(1000);
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: clickPublishButton,
            });
            return {
                success: true,
                message: "Listing published on Etsy.",
                product: {
                    id: product.id,
                    url: ETSY_CREATE_LISTING_URL,
                },
            };
        }
        catch (error) {
            console.error("[Etsy] Publish error:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    // ─── Update ────────────────────────────────────────────────────────
    /**
     * Update an existing Etsy listing via the edit form.
     */
    async updateProduct(marketplaceId, product) {
        try {
            const isLoggedIn = await this.checkLogin();
            if (!isLoggedIn) {
                return {
                    success: false,
                    message: "Not logged into Etsy. Please log in first.",
                    needsLogin: true,
                };
            }
            const editUrl = `${ETSY_EDIT_LISTING_URL}/${marketplaceId}/edit`;
            const tab = await chrome.tabs.create({ url: editUrl, active: true });
            if (!tab.id) {
                return { success: false, message: "Failed to open Etsy edit page" };
            }
            await this.waitForPageReady(tab.id, "#listing-title-input", 15000);
            const formData = this.buildFormData(product);
            // Fill form fields (existing values will be overwritten)
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: fillEtsyListingForm,
                args: [formData],
            });
            const execResult = result?.[0]?.result;
            if (!execResult?.success) {
                return {
                    success: false,
                    message: execResult?.message || "Failed to fill Etsy edit form",
                };
            }
            // Click Save / Publish
            await wait(1000);
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: clickPublishButton,
            });
            return {
                success: true,
                message: "Listing updated on Etsy.",
                product: {
                    id: marketplaceId,
                    url: this.getProductUrl(marketplaceId),
                },
            };
        }
        catch (error) {
            console.error("[Etsy] Update error:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    // ─── Delist ────────────────────────────────────────────────────────
    /**
     * Deactivate a listing via Etsy's internal v3 AJAX API.
     * This sets the listing state to "inactive" (deactivated), not deleted.
     */
    async delistProduct(marketplaceId) {
        try {
            const isLoggedIn = await this.checkLogin();
            if (!isLoggedIn) {
                return {
                    success: false,
                    message: "Not logged into Etsy. Please log in first.",
                    needsLogin: true,
                };
            }
            const shopId = await this.getShopId();
            // Use Etsy's internal API to deactivate the listing
            const resp = await fetch(`${this.baseUrl}/api/v3/ajax/shop/${shopId}//listings/${marketplaceId}/deactivate`, {
                method: "POST",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
            });
            if (resp.ok) {
                return {
                    success: true,
                    message: "Listing deactivated on Etsy.",
                };
            }
            // Fallback: try the state change endpoint
            const fallbackResp = await fetch(`${this.baseUrl}/api/v3/ajax/shop/${shopId}//listings/${marketplaceId}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify({ state: "inactive" }),
            });
            if (fallbackResp.ok) {
                return {
                    success: true,
                    message: "Listing deactivated on Etsy.",
                };
            }
            return {
                success: false,
                message: `Etsy deactivation returned ${resp.status}. Please deactivate from Etsy dashboard.`,
            };
        }
        catch (error) {
            console.error("[Etsy] Delist error:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    // ─── Helpers ───────────────────────────────────────────────────────
    buildFormData(product) {
        const rawCategory = product.category?.[0]?.toLowerCase() || "";
        // Try exact match first (handles subcategories like "ceramics_plates"),
        // then try the prefix before "_" (handles "ceramics_plates" → "ceramics"),
        // then fall back to the raw value as a search term
        const categorySearch = WRENLIST_TO_ETSY_CATEGORY[rawCategory] ||
            WRENLIST_TO_ETSY_CATEGORY[rawCategory.split("_")[0]] ||
            product.category?.[0] ||
            "";
        // Determine when_made based on product metadata
        const categoryRoot = rawCategory.split("_")[0];
        const whenMade = product.whenMade || product.dynamicProperties?.when_made ||
            (categoryRoot === "collectibles" || product.dynamicProperties?.is_vintage === "true"
                ? ETSY_WHEN_MADE_VINTAGE
                : ETSY_WHEN_MADE_RECENT);
        // Combine all images into a single array
        // The cover image may be stored as a string on the product's index signature
        const coverImg = typeof product["cover"] === "string" ? product["cover"] : undefined;
        const allImageUrls = [];
        if (coverImg)
            allImageUrls.push(coverImg);
        if (product.images) {
            for (const img of product.images) {
                if (!allImageUrls.includes(img))
                    allImageUrls.push(img);
            }
        }
        return {
            title: product.title?.slice(0, 140) || "",
            description: product.description?.slice(0, 10000) || "",
            price: product.price || 0,
            quantity: product.quantity ?? 1,
            categorySearch,
            tags: product.tags || "",
            imageUrls: allImageUrls.slice(1), // additional images
            coverUrl: allImageUrls[0], // first image
            whenMade,
            sku: product.sku || "",
            isVintage: whenMade !== ETSY_WHEN_MADE_RECENT && whenMade !== "made_to_order",
        };
    }
    /**
     * Wait for a selector to appear on the page (polls via executeScript).
     */
    async waitForPageReady(tabId, selector, timeoutMs) {
        const start = Date.now();
        const interval = 500;
        while (Date.now() - start < timeoutMs) {
            try {
                const result = await chrome.scripting.executeScript({
                    target: { tabId },
                    func: (sel) => !!document.querySelector(sel),
                    args: [selector],
                });
                if (result?.[0]?.result)
                    return;
            }
            catch {
                // Tab not ready yet
            }
            await wait(interval);
        }
        // Continue even if not found — form-fill will handle missing elements gracefully
        console.warn(`[Etsy] Selector "${selector}" not found after ${timeoutMs}ms, continuing anyway`);
    }
    /**
     * Upload images to the Etsy listing form via the hidden file input.
     *
     * Images are fetched in the background service worker (no CORS restrictions),
     * converted to base64 data URIs, then passed to an injected script that
     * creates File objects and sets them on the file input via DataTransfer.
     */
    async uploadImages(tabId, coverUrl, imageUrls) {
        const allUrls = coverUrl ? [coverUrl, ...imageUrls] : [...imageUrls];
        if (allUrls.length === 0)
            return;
        // Limit to 10 images (Etsy max is 10 photos) — further limit to 20 for Etsy's new form
        const urls = allUrls.slice(0, 10);
        // Fetch images in the background worker (no CORS issues here)
        const imageDataList = [];
        for (const url of urls) {
            try {
                const resp = await fetch(url);
                if (!resp.ok) {
                    console.warn(`[Etsy] Image fetch failed (${resp.status}): ${url}`);
                    continue;
                }
                const blob = await resp.blob();
                const mimeType = blob.type || "image/jpeg";
                const buffer = await blob.arrayBuffer();
                const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
                imageDataList.push({ base64, mimeType });
            }
            catch (err) {
                console.warn(`[Etsy] Failed to fetch image: ${url}`, err);
            }
        }
        if (imageDataList.length === 0) {
            console.warn("[Etsy] No images could be fetched");
            return;
        }
        // Inject the base64 data into the page and set files on the input
        await chrome.scripting.executeScript({
            target: { tabId },
            func: (images) => {
                try {
                    const fileInput = document.querySelector('input[type="file"]');
                    if (!fileInput) {
                        console.warn("[Etsy] File input not found");
                        return;
                    }
                    const dt = new DataTransfer();
                    for (let i = 0; i < images.length; i++) {
                        const { base64, mimeType } = images[i];
                        // Decode base64 to binary
                        const binary = atob(base64);
                        const bytes = new Uint8Array(binary.length);
                        for (let j = 0; j < binary.length; j++) {
                            bytes[j] = binary.charCodeAt(j);
                        }
                        const blob = new Blob([bytes], { type: mimeType });
                        const ext = mimeType.split("/")[1] || "jpg";
                        const file = new File([blob], `photo_${i + 1}.${ext}`, {
                            type: mimeType,
                        });
                        dt.items.add(file);
                    }
                    fileInput.files = dt.files;
                    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
                    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
                }
                catch (err) {
                    console.error("[Etsy] Image upload error:", err);
                }
            },
            args: [imageDataList],
        });
        // Wait for Etsy to process the uploaded images
        await wait(3000);
    }
    /**
     * Select a category by typing into the search typeahead and clicking
     * the first suggestion.
     */
    async selectCategory(tabId, searchTerm) {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: async (term) => {
                const searchInput = document.getElementById("category-field-search");
                if (!searchInput)
                    return;
                // Focus and clear
                searchInput.focus();
                searchInput.value = "";
                searchInput.dispatchEvent(new Event("input", { bubbles: true }));
                // Type the search term character by character to trigger typeahead
                for (const char of term) {
                    searchInput.value += char;
                    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
                    searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
                    searchInput.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
                }
                // Wait for suggestions to appear
                await new Promise((r) => setTimeout(r, 1500));
                // Look for suggestion list items and click the first one
                const suggestions = document.querySelectorAll('[class*="suggestion"] li, [class*="autocomplete"] li, [role="option"], [class*="category-field"] li, [class*="menu-item"]');
                if (suggestions.length > 0) {
                    suggestions[0].click();
                }
                else {
                    // Fallback: try pressing Enter to select first result
                    searchInput.dispatchEvent(new KeyboardEvent("keydown", {
                        key: "Enter",
                        code: "Enter",
                        keyCode: 13,
                        bubbles: true,
                    }));
                }
            },
            args: [searchTerm],
        });
        // Wait for category selection to register and any dependent fields to appear
        await wait(1500);
    }
}
// ─── Injected functions (run in page context) ──────────────────────
/**
 * Fill all text fields, selects, and radio buttons on the Etsy listing form.
 * Executed in the context of the Etsy web page via chrome.scripting.executeScript.
 */
function fillEtsyListingForm(data) {
    try {
        const filled = [];
        // ── Title ──
        const titleInput = document.getElementById("listing-title-input");
        if (titleInput) {
            setNativeValue(titleInput, data.title);
            filled.push("title");
        }
        // ── Description ──
        const descInput = document.getElementById("listing-description-textarea");
        if (descInput) {
            setNativeValue(descInput, data.description);
            filled.push("description");
        }
        // ── Price ──
        const priceInput = document.getElementById("listing-price-input");
        if (priceInput) {
            setNativeValue(priceInput, data.price.toFixed(2));
            filled.push("price");
        }
        // ── Quantity ──
        const qtyInput = document.getElementById("listing-quantity-input");
        if (qtyInput) {
            setNativeValue(qtyInput, String(data.quantity));
            filled.push("quantity");
        }
        // ── SKU ──
        if (data.sku) {
            const skuInput = document.getElementById("listing-sku-input");
            if (skuInput) {
                setNativeValue(skuInput, data.sku);
                filled.push("sku");
            }
        }
        // ── Tags ──
        if (data.tags) {
            const tagsInput = document.getElementById("listing-tags-input");
            if (tagsInput) {
                // Etsy tags: type each tag and press Enter/comma to add as chip
                const tagList = data.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .slice(0, 13); // Etsy max 13 tags
                for (const tag of tagList) {
                    tagsInput.focus();
                    setNativeValue(tagsInput, tag.slice(0, 20)); // Etsy max 20 chars per tag
                    // Press Enter to add the tag as a chip
                    tagsInput.dispatchEvent(new KeyboardEvent("keydown", {
                        key: "Enter",
                        code: "Enter",
                        keyCode: 13,
                        bubbles: true,
                    }));
                    tagsInput.dispatchEvent(new KeyboardEvent("keyup", {
                        key: "Enter",
                        code: "Enter",
                        keyCode: 13,
                        bubbles: true,
                    }));
                }
                filled.push("tags");
            }
        }
        // ── Who made it (radio: index 0 = "I did") ──
        const whoMadeRadios = document.querySelectorAll('input[name="whoMade"]');
        if (whoMadeRadios.length >= 1) {
            // Default to "I did" (index 0) for vintage sellers
            whoMadeRadios[0].checked = true;
            whoMadeRadios[0].click();
            whoMadeRadios[0].dispatchEvent(new Event("change", { bubbles: true }));
            filled.push("whoMade");
        }
        // ── What is it (radio: index 0 = "A finished product") ──
        const isSupplyRadios = document.querySelectorAll('input[name="isSupply"]');
        if (isSupplyRadios.length >= 1) {
            isSupplyRadios[0].checked = true;
            isSupplyRadios[0].click();
            isSupplyRadios[0].dispatchEvent(new Event("change", { bubbles: true }));
            filled.push("isSupply");
        }
        // ── When was it made (select) ──
        const whenMadeSelect = document.getElementById("when-made-select");
        if (whenMadeSelect && data.whenMade) {
            whenMadeSelect.value = data.whenMade;
            whenMadeSelect.dispatchEvent(new Event("change", { bubbles: true }));
            filled.push("whenMade");
        }
        return {
            success: true,
            message: `Filled: ${filled.join(", ")}`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown form-fill error",
        };
    }
}
/**
 * Set a value on a React-controlled input/textarea using the native setter.
 * React overrides the .value setter, so we need to use Object.getOwnPropertyDescriptor
 * to call the native HTMLInputElement setter, then dispatch an input event.
 */
function setNativeValue(element, value) {
    const proto = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (nativeSetter) {
        nativeSetter.call(element, value);
    }
    else {
        element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
}
/**
 * Click the Publish button (or Save as draft if Publish is disabled).
 * Scrolls the button into view first.
 */
function clickPublishButton() {
    try {
        const buttons = Array.from(document.querySelectorAll("button"));
        // Try Publish first
        const publishBtn = buttons.find((b) => b.textContent?.trim() === "Publish");
        if (publishBtn && !publishBtn.disabled) {
            publishBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            // Brief delay after scroll, then click
            setTimeout(() => publishBtn.click(), 500);
            return { success: true, message: "Clicked Publish" };
        }
        // Fallback: Save as draft
        const draftBtn = buttons.find((b) => b.textContent?.trim()?.includes("Save as draft"));
        if (draftBtn && !draftBtn.disabled) {
            draftBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => draftBtn.click(), 500);
            return { success: true, message: "Clicked Save as draft (Publish was disabled)" };
        }
        // Last resort: highlight the publish button area
        if (publishBtn) {
            publishBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            publishBtn.style.outline = "3px solid #f97316";
            publishBtn.style.outlineOffset = "2px";
            return {
                success: false,
                message: "Publish button is disabled. Please review required fields and click Publish manually.",
            };
        }
        return { success: false, message: "Publish button not found" };
    }
    catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown publish error",
        };
    }
}
