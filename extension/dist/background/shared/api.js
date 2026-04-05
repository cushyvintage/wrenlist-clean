import { Condition } from "./enums.js";
// Wrenlist extension API utilities
export const EXTENSION_VERSION = "1.2.0";
const DEFAULT_WRENLIST_BASE_URL = "https://wrenlist.com";
async function getWrenlistBaseUrl() {
    try {
        const storage = await chrome.storage.sync.get(["wrenlistApiBase"]);
        const fromStorage = storage.wrenlistApiBase;
        if (fromStorage && fromStorage.startsWith("http")) {
            return fromStorage.replace(/\/+$/, "");
        }
    }
    catch (error) {
        // Fallback to default
    }
    return DEFAULT_WRENLIST_BASE_URL;
}
const MARKETPLACE_BASE_URLS = {
    facebook: "https://www.facebook.com/marketplace/create/item",
    poshmark: "https://poshmark.com/create-listing",
    poshmark_ca: "https://poshmark.ca/create-listing",
    "poshmark_com.au": "https://poshmark.com.au/create-listing",
    "poshmark_co.uk": "https://poshmark.co.uk/create-listing",
    depop: "https://www.depop.com/products/create/",
    mercari: "https://www.mercari.com/sell/",
    grailed: "https://www.grailed.com/sell",
    ebay: "https://www.ebay.com",
    ebay_com: "https://www.ebay.com",
    "ebay_co.uk": "https://www.ebay.co.uk",
    ebay_ca: "https://www.ebay.ca",
    "ebay_com.au": "https://www.ebay.com.au",
    ebay_ie: "https://www.ebay.ie",
    vinted: "https://www.vinted.com/items/new",
    "vinted_co.uk": "https://www.vinted.co.uk/items/new",
    etsy: "https://www.etsy.com/your/shops/me/tools/listings/create",
};
const EBAY_CONDITION_MAP = {
    [Condition.NewWithTags]: 1000,
    [Condition.NewWithoutTags]: 1500,
    [Condition.VeryGood]: 3000,
    [Condition.Good]: 3000,
    [Condition.Fair]: 3000,
    [Condition.Poor]: 3000,
};
export function buildMarketplaceUrl(slug, payload) {
    const base = MARKETPLACE_BASE_URLS[slug];
    if (!base) {
        throw new Error(`Unsupported marketplace slug: ${slug}`);
    }
    if (slug.includes("ebay")) {
        const categoryId = payload.category[payload.category.length - 1];
        const condition = payload.condition
            ? EBAY_CONDITION_MAP[payload.condition]
            : -1;
        return `${base}/lstng?mode=AddItem&categoryId=${categoryId}&condition=${condition}`;
    }
    return base;
}
export async function wait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
export async function retryOperation(operation, delayMs, retries) {
    try {
        return await operation();
    }
    catch (error) {
        if (retries <= 0) {
            throw error;
        }
        await wait(delayMs);
        return retryOperation(operation, delayMs, retries - 1);
    }
}
export async function chunkConcurrentRequests(tasks, concurrency) {
    if (tasks.length === 0) {
        return [];
    }
    const results = new Array(tasks.length);
    let nextIndex = 0;
    const worker = async () => {
        while (true) {
            const currentIndex = nextIndex;
            const task = tasks[currentIndex];
            if (!task) {
                break;
            }
            nextIndex += 1;
            results[currentIndex] = await task();
        }
    };
    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
}
export async function chunkConcurrentRequestsWithRetry(tasks, concurrency, delayMs = 400, retries = 3) {
    const wrappedTasks = tasks.map((task) => () => retryOperation(task, delayMs, retries));
    return chunkConcurrentRequests(wrappedTasks, concurrency);
}
export async function log(type, body, productId, marketplace, tld, marketplaceProductId) {
    // Logging stub - can be wired to Wrenlist API if needed
    // Logs can be added to Wrenlist API if needed in the future
}
export async function logFilled(productId, marketplace, errors, postingType = "Form", payload, errorMessage) {
    // Logging stub - can be wired to Wrenlist API if needed
    // Logs can be added to Wrenlist API if needed in the future
}
export async function getLoggingInfo(type, marketplace, tld) {
    // Logging stub - can be wired to Wrenlist API if needed
    // Always return { isLogged: false } to allow operations to proceed
    return { isLogged: false };
}
export async function checkAlreadyExecuted(storageKey, callback, ttlSeconds = 24 * 60 * 60) {
    const now = Date.now();
    const ttlMs = ttlSeconds * 1000;
    const stored = await chrome.storage.local.get([storageKey]);
    const lastRun = stored[storageKey];
    if (!lastRun || Math.abs(now - lastRun) > ttlMs) {
        await chrome.storage.local.set({ [storageKey]: now });
        await callback();
        return true;
    }
    return false;
}
function dataUrlToFile(dataUrl, filename) {
    const [meta, base64Value] = dataUrl.split(",");
    const mimeMatch = meta.match(/data:(.*?);/);
    const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
    const binary = atob(base64Value);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
        buffer[i] = binary.charCodeAt(i);
    }
    return new File([buffer], filename, { type: mimeType });
}
export async function getProductMedia(productId, imageLimit = 16, cropSquare = false) {
    try {
        const baseUrl = await getWrenlistBaseUrl();
        const response = await fetch(`${baseUrl}/api/products/${productId}/media?limit=${imageLimit}&cropSquare=${cropSquare}`, {
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch product media: ${response.status}`);
        }
        const media = await response.json();
        return media.map((entry) => dataUrlToFile(entry.url, entry.name));
    }
    catch (error) {
        console.error("[WrenlistApi] getProductMedia failed", error);
        return [];
    }
}
export async function getProductMediaForMarketplace(productId, marketplace) {
    try {
        const baseUrl = await getWrenlistBaseUrl();
        const response = await fetch(`${baseUrl}/api/products/${productId}/media?marketplace=${marketplace}`, {
            credentials: "include",
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch product media: ${response.status}`);
        }
        const media = await response.json();
        return media.map((entry) => dataUrlToFile(entry.url, entry.name));
    }
    catch (error) {
        console.error("[WrenlistApi] getProductMediaForMarketplace failed", error);
        return [];
    }
}
export async function openTab(url, focusTab = false) {
    await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "openTab", url, focusTab }, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            console.info("[WrenlistApi] openTab", result);
            resolve();
        });
    });
}
