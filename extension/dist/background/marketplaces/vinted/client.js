import { checkAlreadyExecuted, getLoggingInfo, log, wait, } from "../../shared/crosslistApi.js";
import { Condition, Color, isColor } from "../../shared/enums.js";
import { buildVintedUrls, VINTED_RULE_IDS } from "./constants.js";
export class VintedClient {
    tld;
    baseUrl;
    apiUrl;
    imageUploadUrl;
    createListingUrl;
    brandsUrl;
    conditionsUrl;
    csrfToken = "";
    anonId = "";
    username = "";
    uploadSessionId = "";
    /** Read-only accessors for sync operations */
    getUsername() { return this.username; }
    getCsrfToken() { return this.csrfToken; }
    getAnonId() { return this.anonId; }
    catalogsCache = null;
    // Global token cache to prevent excessive tab refreshes across all client instances
    static globalTokens = null;
    // Token TTL: 15 minutes - tokens are valid for much longer, but we refresh periodically
    static TOKEN_TTL_MS = 15 * 60 * 1000;
    // Prevent concurrent bootstrap operations - share the promise across all instances
    static bootstrapPromise = null;
    // Cooldown for tab-based refreshes (to prevent tab spam)
    static lastTabRefresh = 0;
    static TAB_REFRESH_COOLDOWN_MS = 60 * 1000; // 1 minute minimum between tab opens
    constructor(tld) {
        this.tld = tld;
        const urls = buildVintedUrls(this.tld);
        this.baseUrl = urls.base;
        this.apiUrl = urls.api;
        this.imageUploadUrl = urls.imageUpload;
        this.createListingUrl = urls.createListing;
        this.brandsUrl = urls.brands;
        this.conditionsUrl = urls.conditions;
        void this.updateHeaderRules();
    }
    async bootstrap(force = false) {
        // Check if we can use cached global tokens (same TLD, not expired, not forced)
        if (!force &&
            VintedClient.globalTokens &&
            VintedClient.globalTokens.tld === this.tld &&
            Date.now() - VintedClient.globalTokens.lastRefresh < VintedClient.TOKEN_TTL_MS) {
            // Use cached tokens from previous bootstrap
            this.csrfToken = VintedClient.globalTokens.csrfToken;
            this.anonId = VintedClient.globalTokens.anonId;
            this.username = VintedClient.globalTokens.username;
            this.uploadSessionId = VintedClient.globalTokens.uploadSessionId;
            console.log("[Vinted] Using cached global tokens, age:", Math.round((Date.now() - VintedClient.globalTokens.lastRefresh) / 1000), "seconds");
            return;
        }
        // Prevent concurrent bootstrap operations - wait for existing one
        if (VintedClient.bootstrapPromise) {
            console.log("[Vinted] Waiting for existing bootstrap operation...");
            await VintedClient.bootstrapPromise;
            // After waiting, check if tokens are now valid
            if (VintedClient.globalTokens &&
                VintedClient.globalTokens.tld === this.tld &&
                Date.now() - VintedClient.globalTokens.lastRefresh < VintedClient.TOKEN_TTL_MS) {
                this.csrfToken = VintedClient.globalTokens.csrfToken;
                this.anonId = VintedClient.globalTokens.anonId;
                this.username = VintedClient.globalTokens.username;
                this.uploadSessionId = VintedClient.globalTokens.uploadSessionId;
                console.log("[Vinted] Using tokens from completed bootstrap operation");
                return;
            }
        }
        // Perform actual bootstrap and cache the promise
        VintedClient.bootstrapPromise = this.doBootstrap(force);
        try {
            await VintedClient.bootstrapPromise;
        }
        finally {
            VintedClient.bootstrapPromise = null;
        }
    }
    async doBootstrap(force) {
        await this.setTokens(force);
        // After setting tokens, detect the actual TLD from cookies and update URLs if needed
        await this.detectAndUpdateTldFromCookies();
        // Cache tokens globally for other client instances
        VintedClient.globalTokens = {
            csrfToken: this.csrfToken,
            anonId: this.anonId,
            username: this.username,
            uploadSessionId: this.uploadSessionId,
            tld: this.tld,
            lastRefresh: Date.now(),
        };
        console.log("[Vinted] Cached global tokens for TLD:", this.tld);
    }
    async detectAndUpdateTldFromCookies() {
        try {
            // Find v_uid cookie to detect which Vinted domain the user is logged into
            const allCookies = await chrome.cookies.getAll({});
            const vUidCookie = allCookies.find(c => c.domain.includes('vinted') && c.name === "v_uid");
            if (vUidCookie && vUidCookie.domain) {
                // Extract TLD from domain (e.g., "www.vinted.co.uk" -> "co.uk")
                const domainMatch = vUidCookie.domain.match(/vinted\.([^.]+(?:\.[^.]+)?)$/);
                if (domainMatch && domainMatch[1]) {
                    const detectedTld = domainMatch[1];
                    // Only update if TLD is different from current
                    if (detectedTld !== this.tld) {
                        console.log(`[Vinted] Debug: Detected TLD ${detectedTld} from cookies (was ${this.tld}), updating URLs...`);
                        this.tld = detectedTld; // Update TLD so setTokens cache check works correctly
                        const urls = buildVintedUrls(detectedTld);
                        this.baseUrl = urls.base;
                        this.apiUrl = urls.api;
                        this.imageUploadUrl = urls.imageUpload;
                        this.createListingUrl = urls.createListing;
                        this.brandsUrl = urls.brands;
                        this.conditionsUrl = urls.conditions;
                        // Update header rules for the new TLD
                        await this.updateHeaderRules();
                    }
                }
            }
        }
        catch (error) {
            console.log("[Vinted] Debug: Failed to detect TLD from cookies:", error);
        }
    }
    async updateHeaderRules() {
        try {
            const navWithUA = navigator;
            const uaData = await navWithUA.userAgentData
                ?.getHighEntropyValues([
                "platformVersion",
                "architecture",
                "bitness",
                "model",
                "fullVersionList",
            ])
                .catch(() => null);
            const brands = uaData?.fullVersionList ?? navWithUA.userAgentData?.brands ?? [];
            const headerValue = brands
                .map((entry) => `"${entry.brand}";v="${entry.version}"`)
                .join("; ");
            // Get cf_clearance cookie for Cloudflare bypass (matching Crosslist's _setApiHeaders approach)
            let cfClearanceHeader = null;
            try {
                const domain = `vinted.${this.tld}`;
                const cookies = await new Promise((resolve) => {
                    chrome.cookies.getAll({ domain, partitionKey: {} }, (result) => {
                        resolve(result || []);
                    });
                });
                const cfCookie = cookies.find((c) => c.name === "cf_clearance");
                if (cfCookie) {
                    cfClearanceHeader = {
                        header: "cookie",
                        operation: chrome.declarativeNetRequest.HeaderOperation.APPEND,
                        value: `cf_clearance=${cfCookie.value}`,
                    };
                    console.log("[Vinted] Found cf_clearance cookie for", domain);
                }
            }
            catch (cookieError) {
                console.log("[Vinted] Could not get cf_clearance cookie:", cookieError);
            }
            const sharedHeaders = [
                {
                    header: "sec-fetch-site",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: "same-origin",
                },
                {
                    header: "sec-fetch-mode",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: "cors",
                },
                {
                    header: "sec-fetch-dest",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: "empty",
                },
                {
                    header: "sec-fetch-user",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: "?1",
                },
                {
                    header: "sec-ch-ua",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: headerValue,
                },
                {
                    header: "sec-ch-ua-platform",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: `"${navWithUA.userAgentData?.platform ?? "Unknown"}"`,
                },
                {
                    header: "sec-ch-ua-platform-version",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: `"${uaData?.platformVersion ?? ""}"`,
                },
                {
                    header: "sec-ch-ua-full-version",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: `"${uaData?.fullVersionList?.at(-1)?.version ?? ""}"`,
                },
                {
                    header: "sec-ch-ua-full-version-list",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: headerValue,
                },
                {
                    header: "sec-ch-ua-mobile",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: "?0",
                },
                {
                    header: "sec-ch-ua-bitness",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: `"${uaData?.bitness ?? ""}"`,
                },
                {
                    header: "sec-ch-ua-model",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: `"${uaData?.model ?? ""}"`,
                },
                {
                    header: "sec-ch-ua-arch",
                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                    value: `"${uaData?.architecture ?? ""}"`,
                },
            ];
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [VINTED_RULE_IDS.UK_API, VINTED_RULE_IDS.US_API, VINTED_RULE_IDS.PAGE],
                addRules: [
                    {
                        id: VINTED_RULE_IDS.UK_API,
                        priority: 1,
                        condition: {
                            urlFilter: "*://*vinted.co.uk/api/v2/*",
                            initiatorDomains: [chrome.runtime.id],
                            resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
                        },
                        action: {
                            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                            requestHeaders: [
                                {
                                    header: "origin",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "https://www.vinted.co.uk",
                                },
                                {
                                    header: "referer",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "https://www.vinted.co.uk/items/new",
                                },
                                ...sharedHeaders,
                                ...(cfClearanceHeader ? [cfClearanceHeader] : []),
                            ],
                            responseHeaders: [
                                {
                                    header: "Access-Control-Allow-Origin",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "*",
                                },
                            ],
                        },
                    },
                    {
                        id: VINTED_RULE_IDS.US_API,
                        priority: 1,
                        condition: {
                            urlFilter: "*://*vinted.com/api/v2/*",
                            initiatorDomains: [chrome.runtime.id],
                            resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
                        },
                        action: {
                            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                            requestHeaders: [
                                {
                                    header: "origin",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "https://www.vinted.com",
                                },
                                {
                                    header: "referer",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "https://www.vinted.com/items/new",
                                },
                                ...sharedHeaders,
                                ...(cfClearanceHeader ? [cfClearanceHeader] : []),
                            ],
                            responseHeaders: [
                                {
                                    header: "Access-Control-Allow-Origin",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "*",
                                },
                            ],
                        },
                    },
                    // PAGE rule for token refresh navigation - makes requests look like legitimate page loads
                    {
                        id: VINTED_RULE_IDS.PAGE,
                        priority: 1,
                        condition: {
                            regexFilter: "^https?://(www\\.)?vinted\\.(com|co\\.uk)(/items/new)?/?$",
                            initiatorDomains: [chrome.runtime.id],
                            resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
                        },
                        action: {
                            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                            requestHeaders: [
                                {
                                    header: "sec-fetch-site",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "same-origin",
                                },
                                {
                                    header: "sec-fetch-mode",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "navigate",
                                },
                                {
                                    header: "sec-fetch-dest",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "document",
                                },
                                {
                                    header: "sec-fetch-user",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "?1",
                                },
                                {
                                    header: "sec-ch-ua",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: headerValue,
                                },
                                {
                                    header: "sec-ch-ua-platform",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: `"${navWithUA.userAgentData?.platform ?? "Unknown"}"`,
                                },
                                {
                                    header: "sec-ch-ua-platform-version",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: `"${uaData?.platformVersion ?? ""}"`,
                                },
                                {
                                    header: "sec-ch-ua-full-version",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: `"${uaData?.fullVersionList?.at(-1)?.version ?? ""}"`,
                                },
                                {
                                    header: "sec-ch-ua-full-version-list",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: headerValue,
                                },
                                {
                                    header: "sec-ch-ua-mobile",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: "?0",
                                },
                                {
                                    header: "sec-ch-ua-bitness",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: `"${uaData?.bitness ?? ""}"`,
                                },
                                {
                                    header: "sec-ch-ua-model",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: `"${uaData?.model ?? ""}"`,
                                },
                                {
                                    header: "sec-ch-ua-arch",
                                    operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                    value: `"${uaData?.architecture ?? ""}"`,
                                },
                            ],
                        },
                    },
                ],
            });
        }
        catch (error) {
            console.warn("[Vinted] Failed to install header rules", error);
        }
    }
    async refreshTokens() {
        // Check cooldown to prevent tab spam
        const timeSinceLastTab = Date.now() - VintedClient.lastTabRefresh;
        if (timeSinceLastTab < VintedClient.TAB_REFRESH_COOLDOWN_MS) {
            console.log("[Vinted] Tab refresh on cooldown, skipping. Time remaining:", Math.round((VintedClient.TAB_REFRESH_COOLDOWN_MS - timeSinceLastTab) / 1000), "seconds");
            return ""; // Return empty to trigger fallback to direct fetch
        }
        VintedClient.lastTabRefresh = Date.now();
        console.log("[Vinted] Opening background tab for token refresh...");
        return new Promise(async (resolve, reject) => {
            const tab = await chrome.tabs.create({
                url: this.baseUrl,
                active: false,
            });
            if (!tab?.id) {
                reject(new Error("Unable to open Vinted tab for auth refresh"));
                return;
            }
            let completed = false;
            const timeout = setTimeout(async () => {
                completed = true;
                await chrome.tabs.remove(tab.id).catch(() => { }); // Handle tab already closed
                resolve("");
            }, 40000);
            const fetchHtml = () => document.documentElement.outerHTML;
            const listener = async (tabId, info) => {
                if (completed || tabId !== tab.id || info.status !== "complete") {
                    return;
                }
                let html = "";
                let attempts = 0;
                const maxAttempts = 8; // 8 attempts * 5 seconds = 40 seconds max
                do {
                    if (completed)
                        return;
                    await wait(5000);
                    attempts++;
                    try {
                        const result = await chrome.scripting.executeScript({
                            target: { tabId },
                            func: fetchHtml,
                        });
                        html = result?.[0]?.result ?? "";
                        // Check if we're on a login page
                        if (html && (html.includes("signup") || html.includes("login") || html.includes("session-refresh"))) {
                            completed = true;
                            await chrome.tabs.remove(tab.id).catch(() => { }); // Handle tab already closed
                            chrome.tabs.onUpdated.removeListener(listener);
                            clearTimeout(timeout);
                            resolve(""); // Return empty to indicate login needed
                            return;
                        }
                    }
                    catch (error) {
                        // If we can't execute script, tab might be closed or inaccessible
                        if (attempts >= maxAttempts) {
                            completed = true;
                            await chrome.tabs.remove(tab.id).catch(() => { });
                            chrome.tabs.onUpdated.removeListener(listener);
                            clearTimeout(timeout);
                            resolve("");
                            return;
                        }
                    }
                } while (!html.includes("CSRF") && attempts < maxAttempts);
                completed = true;
                await chrome.tabs.remove(tab.id).catch(() => { }); // Handle tab already closed
                chrome.tabs.onUpdated.removeListener(listener);
                clearTimeout(timeout);
                resolve(html);
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    }
    async setTokens(force = false) {
        try {
            console.log("[Vinted] Debug: setTokens called, force:", force);
            // First, check in-memory global cache (fastest, prevents tab opens entirely)
            if (!force &&
                VintedClient.globalTokens &&
                VintedClient.globalTokens.tld === this.tld &&
                VintedClient.globalTokens.csrfToken &&
                VintedClient.globalTokens.anonId &&
                Date.now() - VintedClient.globalTokens.lastRefresh < VintedClient.TOKEN_TTL_MS) {
                this.csrfToken = VintedClient.globalTokens.csrfToken;
                this.anonId = VintedClient.globalTokens.anonId;
                this.username = VintedClient.globalTokens.username;
                this.uploadSessionId = VintedClient.globalTokens.uploadSessionId;
                console.log("[Vinted] Debug: Using global cache tokens, age:", Math.round((Date.now() - VintedClient.globalTokens.lastRefresh) / 1000), "s");
                return;
            }
            // Then check chrome.storage.local (persists across extension restarts)
            const storageKeys = await chrome.storage.local.get([
                "vintedCsrfToken",
                "vintedAnonId",
                "vintedUsername",
                "vintedUploadSessionId",
            ]);
            if (!force &&
                storageKeys.vintedCsrfToken &&
                storageKeys.vintedAnonId &&
                storageKeys.vintedUsername) {
                this.csrfToken = storageKeys.vintedCsrfToken;
                this.anonId = storageKeys.vintedAnonId;
                this.username = storageKeys.vintedUsername;
                this.uploadSessionId = storageKeys.vintedUploadSessionId || "";
                // Also populate global cache from storage
                VintedClient.globalTokens = {
                    csrfToken: this.csrfToken,
                    anonId: this.anonId,
                    username: this.username,
                    uploadSessionId: this.uploadSessionId,
                    tld: this.tld,
                    lastRefresh: Date.now(),
                };
                console.log("[Vinted] Debug: Using storage tokens, username:", this.username);
                return;
            }
            console.log("[Vinted] Debug: No cached tokens or force=true, fetching new tokens...");
            // Try direct fetch first (fast, no tab overhead)
            // Falls back to hidden tab refresh if Cloudflare blocks or CSRF not found
            let html = "";
            try {
                console.log("[Vinted] Trying direct fetch first...");
                const response = await fetch(this.baseUrl, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    },
                });
                if (response.ok) {
                    html = await response.text();
                }
                else {
                    console.log("[Vinted] Direct fetch returned status:", response.status);
                }
            }
            catch (err) {
                console.log("[Vinted] Direct fetch failed, will try tab fallback:", err);
            }
            // Check if direct fetch returned a valid CSRF token
            let match = html ? html.match(/"CSRF_TOKEN\\?":.*?\\?"([a-z\-0-9]+)\\?"/) : null;
            if (!match || match.length < 2) {
                // Fallback: open hidden tab (handles Cloudflare challenges)
                console.log("[Vinted] Direct fetch didn't return CSRF, trying tab refresh...");
                html = await this.refreshTokens();
                if (!html) {
                    throw new Error("Failed to fetch Vinted tokens via both direct fetch and tab refresh");
                }
                match = html.match(/"CSRF_TOKEN\\?":.*?\\?"([a-z\-0-9]+)\\?"/);
                if (!match || match.length < 2) {
                    throw new Error("CSRF token not found in HTML response");
                }
            }
            this.csrfToken = match[1];
            // Extract anon_id using Crosslist pattern
            match = html.match(/"anon_id\\":\\"([a-z\-0-9]+)\\"/);
            if (!match || match.length < 2) {
                throw new Error("Anon id not found in HTML response");
            }
            this.anonId = match[1];
            // Extract uploadSessionId from HTML (Crosslist pattern)
            // This is embedded in the page's JSON data and used for temp_uuid + upload_session_id
            const uploadMatch = html.match(/"uploadSessionId\\?":.*?\\?"([a-z\-0-9]+)\\?"/);
            if (uploadMatch && uploadMatch[1]) {
                this.uploadSessionId = uploadMatch[1];
                console.log("[Vinted] Debug: Found uploadSessionId from HTML:", this.uploadSessionId);
            }
            else {
                // Try fetching from /items/new page which always has it
                console.log("[Vinted] Debug: uploadSessionId not in homepage HTML, trying /items/new...");
                try {
                    const newItemResp = await fetch(`${this.baseUrl}/items/new`, {
                        method: "GET",
                        credentials: "include",
                        headers: {
                            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        },
                    });
                    if (newItemResp.ok) {
                        const newItemHtml = await newItemResp.text();
                        const newItemMatch = newItemHtml.match(/"uploadSessionId\\?":.*?\\?"([a-z\-0-9]+)\\?"/);
                        if (newItemMatch && newItemMatch[1]) {
                            this.uploadSessionId = newItemMatch[1];
                            console.log("[Vinted] Debug: Found uploadSessionId from /items/new:", this.uploadSessionId);
                        }
                    }
                }
                catch (err) {
                    console.warn("[Vinted] Debug: Failed to fetch /items/new for uploadSessionId:", err);
                }
                // Fallback to random UUID if we still don't have one
                if (!this.uploadSessionId) {
                    this.uploadSessionId = crypto.randomUUID();
                    console.log("[Vinted] Debug: Using fallback random uploadSessionId:", this.uploadSessionId);
                }
            }
            // Debug logging for username extraction
            console.log("[Vinted] Debug: HTML length:", html.length);
            console.log("[Vinted] Debug: Found CSRF:", this.csrfToken);
            console.log("[Vinted] Debug: Found anon_id:", this.anonId);
            // Try to extract username from v_uid cookie first (most reliable method)
            try {
                // Search all cookies for v_uid (works across all Vinted TLDs)
                // This is more reliable than domain-specific search since user might be on .co.uk but extension uses .com
                console.log("[Vinted] Debug: Searching all cookies for v_uid...");
                const allCookies = await chrome.cookies.getAll({});
                const vintedCookies = allCookies.filter(c => c.domain.includes('vinted') && c.name === "v_uid");
                if (vintedCookies.length > 0) {
                    const vUidCookie = vintedCookies[0];
                    this.username = vUidCookie.value;
                    console.log(`[Vinted] Debug: Found username from v_uid cookie on domain: ${vUidCookie.domain}, value: ${this.username}`);
                }
                else {
                    // Fallback: try domain-specific patterns
                    const domainPatterns = [
                        `.vinted.${this.tld}`, // .vinted.co.uk
                        `www.vinted.${this.tld}`, // www.vinted.co.uk
                        `vinted.${this.tld}`, // vinted.co.uk (without dot)
                        `.vinted.com`, // .vinted.com (fallback)
                        `www.vinted.com`, // www.vinted.com (fallback)
                    ];
                    let allDomainCookies = [];
                    for (const domain of domainPatterns) {
                        try {
                            const cookies = await chrome.cookies.getAll({ domain });
                            console.log(`[Vinted] Debug: Found ${cookies.length} cookies for domain: ${domain}`);
                            allDomainCookies = allDomainCookies.concat(cookies);
                            const found = cookies.find(cookie => cookie.name === "v_uid");
                            if (found) {
                                this.username = found.value;
                                console.log(`[Vinted] Debug: Found v_uid cookie on domain: ${domain}, value: ${this.username}`);
                                break;
                            }
                        }
                        catch (err) {
                            console.log(`[Vinted] Debug: Failed to get cookies for ${domain}:`, err);
                        }
                    }
                    if (!this.username) {
                        console.log("[Vinted] Debug: v_uid cookie not found. Available Vinted cookie names:", allDomainCookies.filter(c => c.domain.includes('vinted')).map(c => `${c.name} (${c.domain})`).join(", "));
                    }
                }
            }
            catch (cookieError) {
                console.log("[Vinted] Debug: Failed to read cookies:", cookieError);
            }
            const anonIdIndex = html.indexOf(this.anonId);
            if (anonIdIndex > 0) {
                // Log context around anon_id for debugging
                const contextStart = Math.max(0, anonIdIndex - 200);
                const contextEnd = Math.min(html.length, anonIdIndex + this.anonId.length + 200);
                const context = html.substring(contextStart, contextEnd);
                console.log("[Vinted] Debug: Context around anon_id:", context);
            }
            // Extract user_id using Crosslist pattern (exact pattern from working crosslist extension)
            // Only try HTML parsing if we didn't get username from cookie
            // This regex has two alternatives with OR: 
            // 1. Matches "user_id":123 or "userId":123
            // 2. Matches "id":123,"anon_id" (id comes before anon_id in JSON)
            // Only one capture group will be populated depending on which alternative matches
            if (!this.username) {
                match = html.match(/"(?:user_id|userId)[\\]*":[\\"]*([0-9]+)[\\"]*|[\\]*"id[\\]*":([0-9]+),[\\]*"anon_id[\\]*"/);
            }
            else {
                match = null; // Skip HTML parsing if we already have username from cookie
            }
            // Check if we got a match with at least one capture group
            // With OR regex, only one of match[1] or match[2] will be populated
            if (!this.username && (!match || (!match[1] && !match[2]))) {
                const anonIdIndex = html.indexOf(this.anonId);
                if (anonIdIndex > 0) {
                    // Look backwards up to 500 chars to find the id field before anon_id
                    const contextBefore = html.substring(Math.max(0, anonIdIndex - 500), anonIdIndex);
                    // Try multiple patterns in the context around anon_id
                    // Pattern 1: "id":123,"anon_id" (id comes before anon_id)
                    match = contextBefore.match(/"id"[\\]*":[\\"]*([0-9]+)[\\"]*[,\\}][^}]*"anon_id/);
                    // Pattern 2: "user_id":123 or "userId":123 (anywhere in context)
                    if (!match || match.length < 2) {
                        match = contextBefore.match(/"user_id"[\\]*":[\\"]*([0-9]+)/) ||
                            contextBefore.match(/"userId"[\\]*":[\\"]*([0-9]+)/);
                    }
                    // Pattern 3: Look for any "id":number pattern near anon_id
                    if (!match || match.length < 2) {
                        // Search in a wider context (both before and after anon_id)
                        const widerContext = html.substring(Math.max(0, anonIdIndex - 300), anonIdIndex + 100);
                        match = widerContext.match(/"id"[\\]*":[\\"]*([0-9]+)/);
                    }
                }
            }
            // If still not found, try simpler patterns on the full HTML
            if (!this.username && (!match || match.length < 2)) {
                // Try: "user_id":123 or "userId":123 (with various escaping)
                match = html.match(/"user_id"[\\]*":[\\"]*([0-9]+)/) ||
                    html.match(/"userId"[\\]*":[\\"]*([0-9]+)/) ||
                    html.match(/user_id[\\]*":[\\"]*([0-9]+)/) ||
                    html.match(/userId[\\]*":[\\"]*([0-9]+)/);
            }
            // Try to find any numeric ID near "user" keyword
            if (!this.username && (!match || match.length < 2)) {
                const userMatches = html.match(/"user"[^}]*"id"[\\]*":[\\"]*([0-9]+)/gi);
                if (userMatches && userMatches.length > 0) {
                    const lastMatch = userMatches[userMatches.length - 1];
                    const idMatch = lastMatch.match(/([0-9]+)/);
                    if (idMatch) {
                        match = idMatch;
                    }
                }
            }
            // Try to extract from JSON-like structures in script tags
            // Vinted often embeds user data in window.__INITIAL_STATE__ or similar
            if (!this.username && (!match || match.length < 2)) {
                // Look for common patterns like window.__INITIAL_STATE__ or window.__APP_DATA__
                const stateMatches = html.match(/(?:window\.__[A-Z_]+__\s*=|__INITIAL_STATE__\s*=|__APP_DATA__\s*=)\s*({[^}]*"anon_id"[^}]*})/);
                if (stateMatches && stateMatches.length > 1) {
                    try {
                        // Try to parse as JSON (might be escaped)
                        const jsonStr = stateMatches[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
                        const parsed = JSON.parse(jsonStr);
                        const userId = parsed.id || parsed.user_id || parsed.userId;
                        if (userId) {
                            // Create a match array compatible with RegExpMatchArray
                            match = ["", userId.toString()];
                        }
                    }
                    catch (e) {
                        // If JSON parsing fails, try regex on the matched string
                        const idMatch = stateMatches[1].match(/"id"[\\]*":[\\"]*([0-9]+)/);
                        if (idMatch) {
                            match = idMatch;
                        }
                    }
                }
            }
            // Try parsing from script tags (Vinted might embed user data in script tags)
            if (!this.username && (!match || match.length < 2)) {
                const scriptMatches = html.match(/<script[^>]*>[\s\S]*?user[^}]*id[^:]*:[\s\S]*?(\d+)[\s\S]*?<\/script>/gi);
                if (scriptMatches) {
                    for (const script of scriptMatches) {
                        const idMatch = script.match(/["']id["']\s*:\s*(\d+)/i) ||
                            script.match(/["']user_id["']\s*:\s*(\d+)/i) ||
                            script.match(/["']userId["']\s*:\s*(\d+)/i);
                        if (idMatch) {
                            match = idMatch;
                            break;
                        }
                    }
                }
            }
            // Try extracting from other cookies as fallback (v_uid already checked above)
            if (!this.username && (!match || match.length < 2)) {
                try {
                    const cookies = await chrome.cookies.getAll({ domain: `.vinted.${this.tld}` });
                    for (const cookie of cookies) {
                        // Look for user ID in cookie names or values (skip v_uid as we already checked it)
                        if (cookie.name !== "v_uid" && (cookie.name.includes("user") || cookie.name.includes("id"))) {
                            const idMatch = cookie.value.match(/(\d+)/);
                            if (idMatch && idMatch[1].length > 3) { // User IDs are typically longer than 3 digits
                                match = idMatch;
                                break;
                            }
                        }
                        // Also check cookie value for user ID patterns
                        const valueMatch = cookie.value.match(/["']?(?:user_)?id["']?\s*[:=]\s*["']?(\d+)/i);
                        if (valueMatch) {
                            match = valueMatch;
                            break;
                        }
                    }
                }
                catch (cookieError) {
                    // Cookie access might fail, continue to next method
                }
            }
            // If still not found, try API call as fallback
            if (!this.username && (!match || (!match[1] && !match[2]))) {
                console.log("[Vinted] Debug: Trying API fallback for username");
                const apiEndpoints = [
                    `${this.apiUrl}/users/me`,
                    `${this.apiUrl}/user`,
                    `${this.apiUrl}/users/current`,
                    `${this.apiUrl}/users/self`,
                    `${this.apiUrl}/account`,
                ];
                for (const endpoint of apiEndpoints) {
                    try {
                        console.log("[Vinted] Debug: Trying API endpoint:", endpoint);
                        const userResponse = await fetch(endpoint, {
                            headers: {
                                Accept: "application/json, text/plain, */*",
                                "X-Csrf-Token": this.csrfToken,
                                "X-Anon-Id": this.anonId,
                                "Content-Type": "application/json",
                            },
                            credentials: "include",
                        });
                        console.log("[Vinted] Debug: API response status:", userResponse.status);
                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            console.log("[Vinted] Debug: API response data keys:", Object.keys(userData));
                            // Try various response structures
                            if (userData?.user?.id) {
                                this.username = userData.user.id.toString();
                                console.log("[Vinted] Debug: Found username via API (user.id):", this.username);
                                break;
                            }
                            else if (userData?.id) {
                                this.username = userData.id.toString();
                                console.log("[Vinted] Debug: Found username via API (id):", this.username);
                                break;
                            }
                            else if (userData?.user_id) {
                                this.username = userData.user_id.toString();
                                console.log("[Vinted] Debug: Found username via API (user_id):", this.username);
                                break;
                            }
                            else if (userData?.userId) {
                                this.username = userData.userId.toString();
                                console.log("[Vinted] Debug: Found username via API (userId):", this.username);
                                break;
                            }
                            else if (userData?.account?.id) {
                                this.username = userData.account.id.toString();
                                console.log("[Vinted] Debug: Found username via API (account.id):", this.username);
                                break;
                            }
                        }
                    }
                    catch (apiError) {
                        console.log("[Vinted] Debug: API endpoint failed:", endpoint, apiError);
                        // Try next endpoint
                        continue;
                    }
                }
            }
            // Try wardrobe endpoint with anon_id as fallback (some endpoints might work without username)
            // Only if we still don't have username
            if (!this.username) {
                try {
                    // Try to get wardrobe info which might return user data
                    const wardrobeResponse = await fetch(`${this.apiUrl}/wardrobe/items?per_page=1`, {
                        headers: {
                            Accept: "application/json, text/plain, */*",
                            "X-Csrf-Token": this.csrfToken,
                            "X-Anon-Id": this.anonId,
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                    });
                    if (wardrobeResponse.ok) {
                        const wardrobeData = await wardrobeResponse.json();
                        // Sometimes the response includes user info
                        if (wardrobeData?.user?.id) {
                            this.username = wardrobeData.user.id.toString();
                        }
                        else if (wardrobeData?.user_id) {
                            this.username = wardrobeData.user_id.toString();
                        }
                    }
                }
                catch (wardrobeError) {
                    // Continue to error if this fails
                }
            }
            // Set username from regex match if we found one
            // With OR regex, only one of match[1] or match[2] will be populated
            if (!this.username && match && (match[1] || match[2])) {
                this.username = match[1] || match[2];
                console.log("[Vinted] Debug: Found username via regex:", this.username);
            }
            // Final check - if we still don't have username, throw error
            if (!this.username) {
                console.error("[Vinted] Debug: All username extraction methods failed");
                console.error("[Vinted] Debug: HTML snippet (first 2000 chars):", html.substring(0, 2000));
                throw new Error("Username not found in HTML response");
            }
            console.log("[Vinted] Debug: Successfully extracted username:", this.username);
            // Save to chrome.storage (persists across restarts)
            await chrome.storage.local.set({
                vintedCsrfToken: this.csrfToken,
                vintedAnonId: this.anonId,
                vintedUsername: this.username,
                vintedUploadSessionId: this.uploadSessionId,
            });
            // Also update global in-memory cache
            VintedClient.globalTokens = {
                csrfToken: this.csrfToken,
                anonId: this.anonId,
                username: this.username,
                uploadSessionId: this.uploadSessionId,
                tld: this.tld,
                lastRefresh: Date.now(),
            };
            console.log("[Vinted] Debug: Updated global token cache, uploadSessionId:", this.uploadSessionId);
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Refresh the uploadSessionId by fetching the /items/new page.
     * Crosslist does this before each publish to get a fresh session.
     * Falls back to a random UUID if the page doesn't contain one.
     */
    async refreshUploadSessionId() {
        await this.setTokens();
        try {
            const resp = await fetch(`${this.baseUrl}/items/new`, {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "X-Csrf-Token": this.csrfToken,
                },
            });
            if (resp.ok) {
                const html = await resp.text();
                const m = html.match(/"uploadSessionId\\?":.*?\\?"([a-z\-0-9]+)\\?"/);
                if (m && m[1]) {
                    this.uploadSessionId = m[1];
                    console.log("[Vinted] Refreshed uploadSessionId:", this.uploadSessionId);
                    // Update storage and cache
                    await chrome.storage.local.set({ vintedUploadSessionId: this.uploadSessionId });
                    if (VintedClient.globalTokens) {
                        VintedClient.globalTokens.uploadSessionId = this.uploadSessionId;
                    }
                    return this.uploadSessionId;
                }
            }
        }
        catch (err) {
            console.warn("[Vinted] Failed to refresh uploadSessionId:", err);
        }
        // Fallback: generate a fresh random UUID
        if (!this.uploadSessionId) {
            this.uploadSessionId = crypto.randomUUID();
            console.log("[Vinted] Using fallback random uploadSessionId:", this.uploadSessionId);
        }
        return this.uploadSessionId;
    }
    async uploadImage(file, tempUuid) {
        await this.setTokens();
        const form = new FormData();
        form.append("photo[temp_uuid]", tempUuid);
        form.append("photo[file]", file, file.name);
        form.append("photo[type]", "item");
        const response = await fetch(this.imageUploadUrl, {
            method: "POST",
            headers: {
                Accept: "application/json, text/plain, */*",
                "Accept-Language": "en-us-fr",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
            },
            credentials: "include",
            body: form,
        }).then((res) => res.json());
        return response;
    }
    async fetchBrands(keyword) {
        await this.setTokens();
        const response = await fetch(`${this.brandsUrl}&keyword=${keyword ?? ""}`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
                "Content-Type": "application/json",
            },
            credentials: "include",
        }).then((res) => res.json());
        const brands = response?.brands ?? [];
        return brands.filter((brand) => brand).map((brand) => ({
            id: brand.id,
            title: brand.title,
        }));
    }
    async fetchAvailablePackageSizes(catalogId) {
        try {
            await this.setTokens();
            const response = await fetch(`${this.apiUrl}/catalogs/${catalogId}/package_sizes`, {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                    "Content-Type": "application/json",
                },
                credentials: "include",
            }).then((res) => res.json());
            if (!response.package_sizes) {
                console.warn("[Vinted] Package sizes API returned no data for catalog", catalogId, response);
                return [];
            }
            return response.package_sizes;
        }
        catch (error) {
            // Match Crosslist's approach: log error and return empty array instead of throwing.
            // The mapper has hardcoded weight-to-code fallbacks and will use default package size.
            console.error("[Vinted] fetchAvailablePackageSizes failed for catalog", catalogId, error);
            return [];
        }
    }
    async fetchISBNInfo(isbn) {
        await this.setTokens();
        const response = await fetch(`${this.apiUrl}/item_upload/isbn_records?isbn=${isbn}`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
                "Content-Type": "application/json",
            },
            credentials: "include",
        }).then((res) => res.json());
        if (!response.attributes) {
            throw new Error("Unable to fetch ISBN info");
        }
        return response.attributes;
    }
    async fetchConditions() {
        const response = await fetch(this.conditionsUrl).then((res) => res.json());
        return response?.statuses ?? [];
    }
    async postListing(payload) {
        await this.setTokens();
        this.storeCategories();
        const shippingAddress = payload.shippingAddress;
        delete payload.shippingAddress;
        console.log('[Vinted] postListing payload:', JSON.stringify(payload, null, 2));
        const response = await (async () => {
            const res = await fetch(this.createListingUrl, {
                method: "POST",
                headers: {
                    "Accept-Language": "en-us-fr",
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                    "X-Money-Object": "true",
                    "x-recommend-package-size": "false",
                    "x-enable-multiple-size-groups": "true",
                    "x-upload-form": "true",
                },
                credentials: "include",
                body: JSON.stringify(payload),
            });
            const text = await res.text();
            if (!res.ok) {
                console.error("[Vinted] postListing failed", res.status, text);
                // Check if the response contains a CAPTCHA URL (DataDome bot protection)
                try {
                    const errorData = JSON.parse(text);
                    if (errorData.url && errorData.url.includes("captcha")) {
                        console.log("[Vinted] CAPTCHA detected:", errorData.url);
                        return {
                            code: "captcha_required",
                            url: errorData.url,
                            message: `Vinted requires you to complete a captcha before listing further. Click here to complete the captcha: ${errorData.url} — If you see this message continuously, please try listing one item manually through the Vinted website (not the mobile app). If the captcha persists, take a short break from listing to avoid account restrictions.`,
                            errors: [{ value: text }],
                        };
                    }
                }
                catch {
                    // Not JSON or no captcha URL - continue with generic error
                }
                return {
                    code: "post_failed",
                    message: `Listing request failed: ${res.status}`,
                    errors: [{ value: text }],
                };
            }
            try {
                return JSON.parse(text);
            }
            catch (err) {
                console.error("[Vinted] postListing JSON parse error", err, text);
                return {
                    code: "parse_error",
                    message: "Failed to parse listing response",
                    errors: [{ value: text }],
                };
            }
        })();
        if (response.code === 131) {
            const address = shippingAddress;
            if (!address?.zipCode) {
                return { success: false, message: "Zipcode is missing", type: "validation" };
            }
            await this.addShippingAddress(address);
            return this.postListing({ ...payload, shippingAddress });
        }
        const error = this.handlePostErrors(response);
        if (error) {
            return error;
        }
        return {
            success: true,
            product: {
                id: response.item?.id,
                url: `${this.baseUrl}/items/${response.item?.id}`,
            },
        };
    }
    async updateListing(marketplaceId, payload, shippingAddress) {
        await this.setTokens();
        payload.item = payload.item ?? {};
        payload.item.id = Number(marketplaceId);
        payload.parcel = null;
        payload.push_up = false;
        console.log('[Vinted] updateListing payload:', JSON.stringify(payload, null, 2));
        const res = await fetch(`${this.createListingUrl}/${marketplaceId}`, {
            method: "PUT",
            headers: {
                "Accept-Language": "en-us-fr",
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
                "X-Money-Object": "true",
                "x-recommend-package-size": "false",
                "x-enable-multiple-size-groups": "true",
                "x-upload-form": "true",
            },
            credentials: "include",
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        console.log('[Vinted] updateListing response status:', res.status);
        console.log('[Vinted] updateListing response body:', text);
        let response;
        try {
            response = JSON.parse(text);
        }
        catch (e) {
            console.error('[Vinted] updateListing failed to parse response:', e);
            return { success: false, message: `Failed to parse response: ${text.substring(0, 200)}` };
        }
        if (response.code === 131) {
            const address = shippingAddress;
            if (!address?.zipCode) {
                return { success: false, message: "Zipcode is missing", type: "validation" };
            }
            await this.addShippingAddress(address);
            return this.updateListing(marketplaceId, payload, shippingAddress);
        }
        const error = this.handlePostErrors(response);
        if (error) {
            return error;
        }
        return {
            success: true,
            product: {
                id: marketplaceId,
                url: `${this.baseUrl}/items/${marketplaceId}`,
            },
        };
    }
    handlePostErrors(response) {
        if (response.code === "account_banned") {
            return { success: false, message: response.message };
        }
        if (response.errors?.length) {
            if (response.message === "validation_error") {
                return {
                    success: false,
                    message: response.errors.map((entry) => entry.value).join("\n"),
                    internalErrors: JSON.stringify(response),
                };
            }
            return {
                success: false,
                message: response.message ?? "Failed to publish listing",
                internalErrors: JSON.stringify(response),
            };
        }
        if (!response.item) {
            // Check for CAPTCHA URL in response (matches Crosslist approach)
            if (response.url && response.url.includes("captcha")) {
                return {
                    success: false,
                    message: `Vinted requires you to complete a captcha before listing. If this happens repeatedly, try listing one item manually on Vinted's website, then return here.`,
                    captchaUrl: response.url,
                    internalErrors: JSON.stringify(response),
                };
            }
            if (response.code === 52) {
                return {
                    success: false,
                    message: "Please upload at least 3 images when listing a well-known brand.",
                    internalErrors: JSON.stringify(response),
                };
            }
            return {
                success: false,
                message: response.message ?? "An unknown error occurred while listing on Vinted.",
                internalErrors: JSON.stringify(response),
            };
        }
        return null;
    }
    async addShippingAddress(address) {
        await this.setTokens();
        const response = await fetch(`${this.apiUrl}/user_addresses/missing_info`, {
            method: "POST",
            headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
            },
            credentials: "include",
            body: JSON.stringify({ user_address: { postal_code: address.zipCode } }),
        });
        if (!response.ok) {
            throw new Error(await response.text());
        }
        return response.json();
    }
    /**
     * Get user's saved addresses - needed for seller_address_id when ordering labels
     */
    async getUserAddresses(retry = false) {
        await this.setTokens(retry);
        const url = `${this.apiUrl}/user_addresses`;
        console.log(`[Vinted] Fetching user addresses: ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                },
                credentials: "include",
            });
            if (response.status === 401 && !retry) {
                return this.getUserAddresses(true);
            }
            if (!response.ok) {
                console.error(`[Vinted] User addresses request failed: ${response.status}`);
                return [];
            }
            const body = await response.json();
            console.log('[Vinted] User addresses response:', JSON.stringify(body).substring(0, 500));
            // Extract addresses from response - try various possible structures
            const addresses = body.user_addresses || body.addresses || body.data || [];
            return addresses.map((addr) => ({
                id: String(addr.id),
                name: addr.name || addr.label || addr.full_name,
                isDefault: addr.is_default || addr.default || addr.primary || false,
                line1: addr.line1 || addr.address_line_1 || addr.street,
                city: addr.city,
                postalCode: addr.postal_code || addr.postcode,
            }));
        }
        catch (err) {
            console.error('[Vinted] Error fetching user addresses:', err);
            return [];
        }
    }
    async delistListing(id) {
        await this.setTokens();
        const url = `${this.apiUrl}/items/${id}/delete`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
            },
            credentials: "include",
        });
        if (!response.ok) {
            const text = await response.text();
            return { success: false, message: text, internalErrors: text };
        }
        const body = await response.json();
        return body.code === 0 ? { success: true } : { success: false, internalErrors: JSON.stringify(body) };
    }
    async storeCategories() {
        try {
            await checkAlreadyExecuted("categoryLastLoggedVinted", async () => {
                const info = (await getLoggingInfo("Category", "vinted", this.tld));
                if (info?.isLogged)
                    return;
                const catalogs = await fetch(`${this.apiUrl}/catalogs`, {
                    headers: {
                        Accept: "application/json, text/plain, */*",
                        "X-Csrf-Token": this.csrfToken,
                        "X-Anon-Id": this.anonId,
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                }).then((res) => res.json());
                const sizeGroups = await fetch(`${this.apiUrl}/size_groups`, {
                    headers: {
                        Accept: "application/json, text/plain, */*",
                        "X-Csrf-Token": this.csrfToken,
                        "X-Anon-Id": this.anonId,
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                }).then((res) => res.json());
                if (catalogs?.catalogs?.some((entry) => entry.title === "Women")) {
                    await log("Category", JSON.stringify({
                        catalogs: catalogs.catalogs,
                        sizes: sizeGroups.size_groups,
                    }), null, "vinted", this.tld);
                }
            });
        }
        catch (error) {
            console.warn("[Vinted] storeCategories failed", error);
        }
    }
    async fetchCatalogs() {
        if (this.catalogsCache) {
            return this.catalogsCache;
        }
        const fetchOnce = async () => fetch(`${this.apiUrl}/catalogs`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
                "Content-Type": "application/json",
            },
            credentials: "include",
        });
        await this.setTokens();
        let response = await fetchOnce();
        // If unauthorized, refresh tokens once and retry
        if (response.status === 401) {
            console.warn("[Vinted] fetchCatalogs got 401, refreshing tokens and retrying...");
            await this.setTokens(true);
            response = await fetchOnce();
        }
        if (!response.ok) {
            const body = await response.text().catch(() => "");
            console.error(`[Vinted] Failed to fetch catalogs: ${response.status}`, body.substring(0, 200));
            // Return empty array instead of throwing - catalog data is optional
            // The mapper will use catalogId from product data if available
            this.catalogsCache = [];
            return [];
        }
        const data = await response.json();
        this.catalogsCache = data?.catalogs || [];
        return this.catalogsCache || [];
    }
    async getCatalogId(categoryName) {
        try {
            const catalogs = await this.fetchCatalogs();
            // Try exact match first
            const catalog = catalogs.find((c) => c.title.toLowerCase() === categoryName.toLowerCase());
            if (catalog) {
                return catalog.id;
            }
            // Try partial match
            const partialMatch = catalogs.find((c) => c.title.toLowerCase().includes(categoryName.toLowerCase()));
            if (partialMatch) {
                return partialMatch.id;
            }
            console.warn(`[Vinted] Could not find catalog ID for category: ${categoryName}`);
            return null;
        }
        catch (error) {
            console.error("[Vinted] Failed to get catalog ID:", error);
            return null;
        }
    }
    async getListings(page, perPage = 96, _username, retry = false, status = 'all') {
        const pageNumber = page ? parseInt(page, 10) : 1;
        // Only force token refresh on retry, otherwise use cached tokens
        await this.setTokens(retry);
        // Map status to Vinted's cond parameter
        // 'all' = no cond filter (may not include hidden), 'active' = cond=active, 'sold' = cond=sold, 'hidden' = cond=hidden
        const condParam = status === 'all' ? '' : `&cond=${status}`;
        const response = await fetch(`${this.apiUrl}/wardrobe/${this.username}/items?page=${pageNumber}&per_page=${perPage}&order=newest_first&currency=USD${condParam}`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
                "Content-Type": "application/json",
            },
            credentials: "include",
        });
        if (response.status !== 200) {
            // Only retry with fresh tokens for auth errors (401/403)
            if (!retry && (response.status === 401 || response.status === 403)) {
                console.warn(`[Vinted] Auth error (${response.status}) fetching listings, retrying with fresh tokens...`);
                await this.setTokens(true);
                return this.getListings(page, perPage, undefined, true, status);
            }
            throw new Error("Please check you are logged in to your marketplace account.");
        }
        const body = await response.json();
        if (!body.items) {
            // Only retry with fresh tokens if we haven't retried yet (likely auth issue)
            if (!retry) {
                console.warn(`[Vinted] Empty items response, retrying with fresh tokens...`);
                await this.setTokens(true);
                return this.getListings(page, perPage, undefined, true, status);
            }
            throw new Error("Please check you are logged in to your marketplace account.");
        }
        const products = body.items
            .filter((item) => !item.is_draft) // Only filter drafts, keep sold/closed items
            .map((item) => {
            const created = new Date(1970, 0, 1);
            created.setSeconds(item.id);
            // Sold items may be marked as is_sold OR is_closed
            const isSold = item.is_sold || item.is_closed || false;
            return {
                marketplaceId: item.id.toString(),
                title: item.title,
                price: parseFloat(item.price),
                coverImage: item.photos?.[0]?.thumbnails?.[0]?.url ?? "",
                created: created.toISOString(),
                marketplaceUrl: this.getProductUrl(item.id),
                // Include status flags for sold/reserved/hidden items
                isSold,
                isReserved: item.is_reserved ?? false,
                isHidden: item.is_hidden ?? false,
            };
        });
        return {
            products,
            nextPage: pageNumber === body.pagination.total_pages ? null : (pageNumber + 1).toString(),
            username: this.username,
            pagination: {
                current_page: pageNumber,
                total_pages: body.pagination.total_pages,
                total_entries: body.pagination.total_entries,
                per_page: body.pagination.per_page,
            },
        };
    }
    async getListing(id) {
        await this.setTokens();
        const response = await fetch(`${this.apiUrl}/item_upload/items/${id}`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
                "Content-Type": "application/json",
            },
            credentials: "include",
        });
        if (response.status !== 200) {
            throw new Error(`Invalid response: ${response.status} ${await response.text()}`);
        }
        const body = await response.json();
        const item = body.item;
        if (!item) {
            return null;
        }
        const normalizeColor = (value) => {
            if (!value)
                return null;
            if (value === "Dark green")
                return Color.DarkGreen;
            if (value === "Light blue")
                return Color.LightBlue;
            if (value === "Grey")
                return Color.Gray;
            return isColor(value) ? value : null;
        };
        const conditionMap = {
            "New with tags": Condition.NewWithTags,
            "New without tags": Condition.NewWithoutTags,
            "Very good": Condition.VeryGood,
            Good: Condition.Good,
            Satisfactory: Condition.Fair,
        };
        const photos = item.photos?.map((photo) => photo.url) ?? [];
        const shippingWeight = this.packageSizeIdToWeight(item.package_size_id);
        // Extract color IDs and titles
        const colorIds = [];
        const colorTitles = [];
        if (item.color1_id)
            colorIds.push(item.color1_id);
        if (item.color2_id)
            colorIds.push(item.color2_id);
        if (item.color1)
            colorTitles.push(item.color1);
        if (item.color2)
            colorTitles.push(item.color2);
        // Build comprehensive Vinted metadata for relisting
        const vintedMetadata = {
            // Core Vinted IDs (essential for relisting)
            catalog_id: item.catalog_id,
            brand_id: item.brand_dto?.id,
            brand_title: item.brand_dto?.title,
            size_id: item.size_id,
            size_title: item.size_title,
            color_ids: colorIds.length > 0 ? colorIds : undefined,
            color_titles: colorTitles.length > 0 ? colorTitles : undefined,
            material_id: item.material_id,
            package_size_id: item.package_size_id,
            status_id: item.status_id,
            // Dynamic attributes (ISBN, language, platform, etc.)
            isbn: item.isbn,
            item_attributes: item.item_attributes,
            // Pricing
            original_price: item.original_price_numeric ?? item.original_price,
            currency: item.price?.currency_code || item.currency || "GBP",
            is_offerable: item.is_offerable,
            // Tags
            tags: item.hashtags,
            // Shipping details
            shipping: {
                package_size_id: item.package_size_id,
                weight_grams: shippingWeight?.unit === "Grams" ? shippingWeight.value : undefined,
                dimensions: item.measurement_length || item.measurement_width ? {
                    length: item.measurement_length,
                    width: item.measurement_width,
                } : undefined,
            },
            // Photos with thumbnails for faster UI loading
            photos: item.photos?.map((p) => ({
                id: p.id,
                url: p.url,
                full_size_url: p.full_size_url || p.url,
                thumbnail_url: p.thumbnails?.[0]?.url,
            })),
            // Analytics
            view_count: item.view_count,
            favourite_count: item.favourite_count,
            // Status flags
            is_sold: item.is_sold,
            is_reserved: item.is_reserved,
            is_hidden: item.is_hidden,
            is_closed: item.is_closed,
            is_draft: item.is_draft,
            // Timestamps
            created_at_ts: item.created_at_ts,
            updated_at_ts: item.updated_at_ts,
            // Seller info
            user: item.user ? {
                id: item.user.id,
                login: item.user.login,
                feedback_reputation: item.user.feedback_reputation,
                is_verified: item.user.verification?.email?.valid,
            } : undefined,
            // Import timestamp
            imported_at: new Date().toISOString(),
        };
        return {
            id: id,
            marketPlaceId: id,
            images: photos,
            title: item.title,
            description: item.description,
            category: [(item.catalog_id ?? "").toString()],
            brand: item.brand_dto?.title ?? null,
            size: item.size_id ? [item.size_id.toString()] : undefined,
            color: normalizeColor(item.color1),
            color2: normalizeColor(item.color2),
            tags: item.hashtags?.join(",") || "",
            condition: conditionMap[item.status] ?? Condition.Good,
            price: parseFloat(item.price?.amount ?? "0"),
            originalPrice: item.original_price_numeric ?? item.original_price,
            acceptOffers: item.is_offerable ?? false,
            quantity: 1, // Vinted is always single items
            smartPricing: false,
            smartPricingPrice: undefined,
            dynamicProperties: {},
            shipping: {
                shippingWeight,
            },
            marketplaceUrl: this.getProductUrl(id),
            // Include full Vinted metadata for cross-marketplace support
            vintedMetadata,
        };
    }
    packageSizeIdToWeight(id) {
        if (id == null)
            return null;
        if (this.tld === "co.uk") {
            const weights = {
                1: 500,
                2: 1000,
                3: 2000,
                8: 5000,
                9: 10000,
                10: 20000,
            };
            if (weights[id]) {
                return { value: weights[id], unit: "Grams" };
            }
        }
        else {
            const weights = {
                1: 16,
                2: 32,
                3: 64,
                8: 176,
                9: 352,
                10: 705,
            };
            if (weights[id]) {
                return { value: weights[id], unit: "Ounces" };
            }
        }
        return null;
    }
    async checkLogin() {
        try {
            // Check for v_uid cookie which indicates an active Vinted session
            // This is more reliable than checking redirects
            const allCookies = await chrome.cookies.getAll({});
            const vUidCookie = allCookies.find(c => c.domain.includes('vinted') && c.name === "v_uid");
            // If we have a v_uid cookie, user is logged in
            if (vUidCookie) {
                return true;
            }
            // Fallback: check if we get redirected to signup/session-refresh
            const response = await fetch(`${this.baseUrl}/items/new`, {
                method: "GET",
                credentials: "include",
            });
            return !(response.redirected &&
                (response.url.includes("signup") || response.url.includes("session-refresh")));
        }
        catch (error) {
            console.error('Vinted checkLogin error:', error);
            return false;
        }
    }
    getProductUrl(id) {
        return `${this.baseUrl}/items/${id}`;
    }
    /**
     * Fetch conversation details to get bundle items
     * Vinted stores individual bundle items in the conversation
     */
    async getConversationItems(conversationId, retry = false) {
        await this.setTokens(retry);
        // Try to fetch conversation which may contain individual items
        const response = await fetch(`${this.apiUrl}/conversations/${conversationId}`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
                "Content-Type": "application/json",
            },
            credentials: "include",
        });
        if (response.status !== 200) {
            // 404 = conversation not found, don't retry
            if (response.status === 404) {
                console.error(`Failed to fetch conversation ${conversationId}: 404 (Not Found)`);
                return null;
            }
            // Only retry with fresh tokens for auth errors (401/403)
            if (!retry && (response.status === 401 || response.status === 403)) {
                console.warn(`[Vinted] Auth error (${response.status}) fetching conversation, retrying with fresh tokens...`);
                return this.getConversationItems(conversationId, true);
            }
            console.error(`Failed to fetch conversation ${conversationId}: ${response.status}`);
            return null;
        }
        const body = await response.json();
        const conversation = body.conversation || body;
        console.log('[Vinted getConversationItems] Conversation keys:', Object.keys(conversation));
        // Look for items in various possible locations
        let items = conversation.items || [];
        // Check transaction nested in conversation
        if (items.length === 0 && conversation.transaction?.items) {
            items = conversation.transaction.items;
        }
        if (items.length === 0 && conversation.transaction?.order_items) {
            items = conversation.transaction.order_items;
        }
        // Check order nested in conversation
        if (items.length === 0 && conversation.order?.items) {
            items = conversation.order.items;
        }
        if (items.length === 0 && conversation.order?.order_items) {
            items = conversation.order.order_items;
        }
        // Check context items
        if (items.length === 0 && conversation.context?.items) {
            items = conversation.context.items;
        }
        // Check offer_items or bundled_items
        if (items.length === 0 && conversation.offer_items) {
            items = conversation.offer_items;
        }
        if (items.length === 0 && conversation.bundled_items) {
            items = conversation.bundled_items;
        }
        // Check msg_thread data
        if (items.length === 0 && conversation.msg_thread?.items) {
            items = conversation.msg_thread.items;
        }
        if (items.length === 0) {
            console.log('[Vinted getConversationItems] No items found. Full response keys:', Object.keys(body));
            console.log('[Vinted getConversationItems] Conversation snippet:', JSON.stringify(conversation).substring(0, 1000));
            return null;
        }
        console.log(`[Vinted getConversationItems] Found ${items.length} items`);
        return items.map((item) => ({
            itemId: item.id?.toString() || item.item_id?.toString(),
            title: item.title,
            price: parseFloat(item.price || item.price_numeric || 0),
            thumbnailUrl: item.photo?.thumbnails?.[0]?.url || item.photos?.[0]?.thumbnails?.[0]?.url,
            itemUrl: item.url || (item.id ? this.getProductUrl(item.id) : null),
        }));
    }
    /**
     * Fetch conversation messages for displaying in Wrenlist order cards.
     * Reuses the same conversations endpoint but extracts messages instead of items.
     */
    async getConversationMessages(conversationId, retry = false) {
        await this.setTokens(retry);
        const response = await fetch(`${this.apiUrl}/conversations/${conversationId}`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
                "Content-Type": "application/json",
            },
            credentials: "include",
        });
        if (response.status !== 200) {
            if (response.status === 404) {
                console.error(`[getConversationMessages] Conversation ${conversationId} not found`);
                return null;
            }
            if (!retry && (response.status === 401 || response.status === 403)) {
                console.warn(`[getConversationMessages] Auth error (${response.status}), retrying with fresh tokens...`);
                return this.getConversationMessages(conversationId, true);
            }
            console.error(`[getConversationMessages] Failed to fetch conversation ${conversationId}: ${response.status}`);
            return null;
        }
        const body = await response.json();
        const conversation = body.conversation || body;
        const rawMessages = conversation.messages || [];
        console.log(`[getConversationMessages] Found ${rawMessages.length} messages in conversation ${conversationId}`);
        const messages = rawMessages.map((msg) => {
            const entityType = msg.entity_type;
            const entity = msg.entity || {};
            // Only 'message' entity_type is an actual user chat message.
            // Everything else (status_message, action_message, offer_message,
            // transaction_message, etc.) is a system/status message.
            if (entityType === 'message') {
                return {
                    type: 'user',
                    body: entity.body,
                    userId: entity.user_id,
                    photos: entity.photos?.map((p) => p.url || p.thumbnails?.[0]?.url).filter(Boolean) || [],
                    createdAt: entity.created_at_ts || msg.created_at_ts || 0,
                };
            }
            if (entityType === 'action_message') {
                return {
                    type: 'action',
                    title: entity.title,
                    subtitle: entity.subtitle,
                    createdAt: msg.created_at_ts || 0,
                };
            }
            // All other types: status_message, offer_message, transaction_message, etc.
            return {
                type: 'status',
                title: entity.title || entity.body || entity.subtitle,
                subtitle: entity.subtitle,
                createdAt: msg.created_at_ts || 0,
            };
        });
        const oppositeUser = conversation.opposite_user
            ? { id: conversation.opposite_user.id, login: conversation.opposite_user.login }
            : null;
        return {
            messages,
            oppositeUser,
            allowReply: conversation.allow_reply !== false,
        };
    }
    /**
     * Fetch user's sales/transactions from Vinted
     * Returns sales with buyer info, items, and financial details
     * Tries multiple endpoints as Vinted's API structure varies
     */
    /**
     * Fetch sales from Vinted
     * @param page - Page number to fetch
     * @param perPage - Number of items per page
     * @param stopAtId - Stop fetching and return early when this transaction ID is encountered (for incremental sync)
     * @param retry - Internal retry flag
     * @returns Sales and pagination info, plus stoppedEarly flag if stopAtId was found
     */
    async getSales(page = 1, perPage = 20, stopAtId, retry = false) {
        await this.setTokens(retry);
        // Try multiple endpoint variations as Vinted's API structure changes
        // /my_orders is the currently working endpoint (as of Dec 2024)
        // Added order=newest to ensure most recent sales come first
        const endpoints = [
            `${this.apiUrl}/my_orders?page=${page}&per_page=${perPage}&type=sold&order=newest`,
            `${this.apiUrl}/users/${this.username}/transactions?page=${page}&per_page=${perPage}&type=sold&order=newest`,
            `${this.apiUrl}/transactions?page=${page}&per_page=${perPage}&type=sold&order=newest`,
            `${this.baseUrl}/api/v2/users/${this.username}/sold_items?page=${page}&per_page=${perPage}&order=newest`,
        ];
        let response = null;
        let lastError = '';
        let hadAuthError = false;
        for (const endpoint of endpoints) {
            try {
                console.log(`[Vinted] Trying sales endpoint: ${endpoint}`);
                response = await fetch(endpoint, {
                    headers: {
                        Accept: "application/json, text/plain, */*",
                        "X-Csrf-Token": this.csrfToken,
                        "X-Anon-Id": this.anonId,
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                });
                if (response.status === 200) {
                    console.log(`[Vinted] Successfully fetched sales from: ${endpoint}`);
                    break;
                }
                else {
                    lastError = `${endpoint} returned ${response.status}`;
                    console.log(`[Vinted] Endpoint failed: ${lastError}`);
                    // Track if we got an auth error
                    if (response.status === 401 || response.status === 403) {
                        hadAuthError = true;
                    }
                    response = null;
                }
            }
            catch (err) {
                lastError = `${endpoint} threw error: ${err}`;
                console.log(`[Vinted] Endpoint error: ${lastError}`);
                response = null;
            }
        }
        if (!response || response.status !== 200) {
            // Only retry with fresh tokens if we got auth errors, not for other failures
            if (!retry && hadAuthError) {
                console.warn(`[Vinted] Auth error fetching sales, retrying with fresh tokens...`);
                return this.getSales(page, perPage, stopAtId, true);
            }
            throw new Error(`Failed to fetch sales from all endpoints. Last error: ${lastError}`);
        }
        const body = await response.json();
        // Helper to safely parse floats
        const safeParseFloat = (value) => {
            if (value === null || value === undefined || value === '')
                return 0;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        };
        // Get price - handle both direct value and object { amount, currency_code }
        const parsePrice = (p) => {
            if (!p)
                return 0;
            if (typeof p === 'number')
                return p;
            if (typeof p === 'string')
                return safeParseFloat(p);
            if (p.amount)
                return safeParseFloat(p.amount);
            return 0;
        };
        // Process transactions - use loop instead of map to support early termination
        const transactions = body.transactions || body.my_orders || [];
        const sales = [];
        let stoppedEarly = false;
        for (const tx of transactions) {
            // Extract transaction ID first to check against stopAtId
            const transactionId = tx.id?.toString() || tx.transaction_id?.toString() || `unknown_${Date.now()}`;
            // Check if we've reached the stop point (for incremental sync)
            if (stopAtId && transactionId === stopAtId) {
                console.log(`[Vinted] Reached stop point (stopAtId: ${stopAtId}), stopping early`);
                stoppedEarly = true;
                break;
            }
            // Extract item(s) from transaction - could be single, bundle, or embedded in order (my_orders format)
            let items = tx.items || (tx.item ? [tx.item] : []);
            // Handle /my_orders format where item data is embedded directly in the order
            // Check if this looks like embedded item data (has title and photo at root, but no items array)
            if (items.length === 0 && tx.title && (tx.photo || tx.photos)) {
                // Extract item from the order itself - /my_orders format
                // Try to get item_id from various possible fields
                const itemId = tx.item_id || tx.product_id || tx.item?.id || tx.photo?.id?.toString()?.slice(0, -5) || null;
                items = [{
                        id: itemId,
                        title: tx.title,
                        price: tx.price?.amount || tx.price_numeric || tx.price,
                        photo: tx.photo,
                        photos: tx.photos,
                        url: tx.item_url || tx.url,
                    }];
                console.log('[Vinted] Extracted embedded item from my_orders:', { itemId, title: tx.title });
            }
            sales.push({
                transactionId,
                conversationId: tx.conversation_id?.toString(),
                status: tx.status || tx.transaction_user_status || 'unknown',
                statusCode: tx.status_id,
                // Financial details - use safe parsing, handle price object
                // Seller receives full item price - service_fee is paid by buyer as "buyer protection"
                grossAmount: parsePrice(tx.offer_price) || parsePrice(tx.total) || parsePrice(tx.price),
                serviceFee: safeParseFloat(tx.service_fee),
                netAmount: safeParseFloat(tx.payout) || safeParseFloat(tx.net_amount) || safeParseFloat(tx.total_after_fees) || parsePrice(tx.offer_price) || parsePrice(tx.total) || parsePrice(tx.price),
                currency: tx.currency || tx.price?.currency_code || 'GBP',
                // Buyer info
                buyer: tx.buyer || tx.other_party || tx.counterparty ? {
                    id: (tx.buyer?.id || tx.other_party?.id || tx.counterparty?.id)?.toString(),
                    username: tx.buyer?.login || tx.other_party?.login || tx.counterparty?.login,
                    profileUrl: tx.buyer?.profile_url || tx.other_party?.profile_url,
                    location: tx.buyer?.city || tx.other_party?.city,
                } : undefined,
                // Items in the transaction
                items: items.map((item) => ({
                    itemId: item.id?.toString() || item.item_id?.toString() || 'unknown',
                    title: item.title || 'Unknown Item',
                    price: parsePrice(item.price) || parsePrice(item.price_numeric),
                    thumbnailUrl: item.photo?.thumbnails?.[0]?.url || item.photos?.[0]?.thumbnails?.[0]?.url,
                    itemUrl: item.url || (item.id ? this.getProductUrl(item.id) : null),
                })),
                // Bundle detection
                isBundle: items.length > 1,
                itemCount: items.length || 1,
                // Shipping
                shipmentId: tx.shipment?.id?.toString(),
                trackingNumber: tx.shipment?.tracking_code || tx.tracking_number,
                carrier: tx.shipment?.carrier?.name || tx.carrier,
                // Timestamps
                orderDate: tx.created_at || tx.date,
                completedDate: tx.completed_at,
                // Raw data for debugging
                rawData: tx,
            });
        }
        return {
            sales,
            pagination: {
                current_page: body.pagination?.current_page || page,
                total_pages: stoppedEarly ? page : (body.pagination?.total_pages || 1), // If stopped early, don't report more pages
                total_entries: body.pagination?.total_entries || sales.length,
            },
            stoppedEarly,
        };
    }
    /**
     * Get detailed information about a specific transaction/order
     */
    async getOrderDetails(transactionId, retry = false, retryCount = 0) {
        await this.setTokens(retry);
        const response = await fetch(`${this.apiUrl}/transactions/${transactionId}`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "X-Csrf-Token": this.csrfToken,
                "X-Anon-Id": this.anonId,
                "Content-Type": "application/json",
            },
            credentials: "include",
        });
        // Handle rate limiting (429) with exponential backoff
        if (response.status === 429) {
            const maxRetries = 3;
            if (retryCount < maxRetries) {
                // Exponential backoff: 2s, 4s, 8s
                const delayMs = Math.pow(2, retryCount) * 1000;
                console.warn(`[Vinted] Rate limited (429) on order details. Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return this.getOrderDetails(transactionId, retry, retryCount + 1);
            }
            else {
                console.error(`[Vinted] Failed to fetch order ${transactionId}: 429 (Too Many Requests) after ${maxRetries} retries`);
                return null;
            }
        }
        if (response.status !== 200) {
            // 404 = not found, don't retry (it's not a token issue)
            // 401/403 = auth issue, retry with fresh tokens
            if (response.status === 404) {
                console.error(`Failed to fetch order ${transactionId}: 404 (Not Found)`);
                return null;
            }
            if (!retry && (response.status === 401 || response.status === 403)) {
                console.warn(`[Vinted] Auth error (${response.status}) fetching order ${transactionId}, retrying with fresh tokens...`);
                return this.getOrderDetails(transactionId, true, retryCount);
            }
            console.error(`Failed to fetch order ${transactionId}: ${response.status}`);
            return null;
        }
        const body = await response.json();
        const tx = body.transaction || body;
        if (!tx || !tx.id) {
            return null;
        }
        // DEBUG: Log ALL top-level keys and shipping-related data to find where address is stored
        console.log(`[Vinted getOrderDetails] tx ${transactionId} ALL KEYS:`, Object.keys(tx));
        console.log(`[Vinted getOrderDetails] tx ${transactionId} shipment:`, tx.shipment ? JSON.stringify(tx.shipment) : 'null');
        console.log(`[Vinted getOrderDetails] tx ${transactionId} shipping_address:`, tx.shipping_address ? JSON.stringify(tx.shipping_address) : 'null');
        console.log(`[Vinted getOrderDetails] tx ${transactionId} invoice_address:`, tx.invoice_address ? JSON.stringify(tx.invoice_address) : 'null');
        console.log(`[Vinted getOrderDetails] tx ${transactionId} delivery_address:`, tx.delivery_address ? JSON.stringify(tx.delivery_address) : 'null');
        console.log(`[Vinted getOrderDetails] tx ${transactionId} billing_address:`, tx.billing_address ? JSON.stringify(tx.billing_address) : 'null');
        console.log(`[Vinted getOrderDetails] tx ${transactionId} buyer_address:`, tx.buyer_address ? JSON.stringify(tx.buyer_address) : 'null');
        console.log(`[Vinted getOrderDetails] tx ${transactionId} address:`, tx.address ? JSON.stringify(tx.address) : 'null');
        console.log(`[Vinted getOrderDetails] tx ${transactionId} recipient:`, tx.recipient ? JSON.stringify(tx.recipient) : 'null');
        console.log(`[Vinted getOrderDetails] tx ${transactionId} receiver:`, tx.receiver ? JSON.stringify(tx.receiver) : 'null');
        // Log order object which might contain address
        console.log(`[Vinted getOrderDetails] tx ${transactionId} order:`, tx.order ? JSON.stringify(tx.order).substring(0, 2000) : 'null');
        // Log offer object which might contain address  
        console.log(`[Vinted getOrderDetails] tx ${transactionId} offer:`, tx.offer ? JSON.stringify(tx.offer).substring(0, 1500) : 'null');
        // Log invoicing_details if it exists
        console.log(`[Vinted getOrderDetails] tx ${transactionId} invoicing_details:`, tx.invoicing_details ? JSON.stringify(tx.invoicing_details) : 'null');
        console.log(`[Vinted getOrderDetails] tx ${transactionId} invoicing:`, tx.invoicing ? JSON.stringify(tx.invoicing) : 'null');
        // Log full shipment with nested objects
        if (tx.shipment) {
            console.log(`[Vinted getOrderDetails] tx ${transactionId} shipment KEYS:`, Object.keys(tx.shipment));
            console.log(`[Vinted getOrderDetails] tx ${transactionId} shipment.delivery_address:`, tx.shipment.delivery_address ? JSON.stringify(tx.shipment.delivery_address) : 'null');
            console.log(`[Vinted getOrderDetails] tx ${transactionId} shipment.receiver_address:`, tx.shipment.receiver_address ? JSON.stringify(tx.shipment.receiver_address) : 'null');
            console.log(`[Vinted getOrderDetails] tx ${transactionId} shipment.to_address:`, tx.shipment.to_address ? JSON.stringify(tx.shipment.to_address) : 'null');
        }
        // Try to fetch invoicing info from separate endpoint (contains buyer address for business accounts!)
        const invoicingInfo = await this.getInvoicingInfo(transactionId);
        let buyerAddressFromInvoicing = null;
        if (invoicingInfo?.buyerAddress) {
            console.log(`[Vinted getOrderDetails] Got buyer address from invoicing for ${transactionId}:`, JSON.stringify(invoicingInfo.buyerAddress));
            buyerAddressFromInvoicing = invoicingInfo.buyerAddress;
        }
        // PRIMARY LOCATION: transaction.order.items - this is where Vinted puts bundle items
        let items = tx.order?.items || [];
        // Fallback: Check transaction.items directly
        if (items.length === 0 && tx.items) {
            items = tx.items;
        }
        // Fallback: Check transaction.item (single item)
        if (items.length === 0 && tx.item) {
            items = [tx.item];
        }
        // Fallback: Check transaction.order_items
        if (items.length === 0 && tx.order_items) {
            items = tx.order_items;
        }
        // Fallback: Check transaction.offer.items or transaction.offer.order_items
        if (items.length === 0 && tx.offer?.items) {
            items = tx.offer.items;
        }
        if (items.length === 0 && tx.offer?.order_items) {
            items = tx.offer.order_items;
        }
        // Fallback: Check nested in bundle object
        if (items.length === 0 && tx.bundle?.items) {
            items = tx.bundle.items;
        }
        console.log(`[Vinted getOrderDetails] Found ${items.length} items for transaction ${transactionId}`);
        // NOTE: Vinted API does NOT expose buyer shipping addresses for privacy.
        // See docs/vinted-api-limitations.md for details.
        // Buyer name is available via label_options endpoint, but address is only on shipping label PDF.
        // Helper to safely parse float values
        const safeParseFloat = (value) => {
            if (value === null || value === undefined || value === '')
                return 0;
            if (typeof value === 'number')
                return value;
            if (typeof value === 'object' && value.amount)
                return parseFloat(value.amount) || 0;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
        };
        // Extract service fee - can be nested as service_fee.amount or flat
        const serviceFee = safeParseFloat(tx.service_fee?.amount ?? tx.service_fee);
        // Extract gross amount from offer.price (most accurate) or fallbacks
        const grossAmount = safeParseFloat(tx.offer?.price ?? tx.offer_price ?? tx.total ?? tx.price);
        // Net amount = what seller receives. On Vinted, seller receives the full item price.
        // The service_fee is paid by the buyer (as "buyer protection"), not deducted from seller.
        // Use payout if provided by API, otherwise seller receives full gross amount.
        const netAmount = safeParseFloat(tx.payout ?? tx.net_amount) || grossAmount;
        // Log statusTitle extraction for debugging
        console.log(`[Vinted getOrderDetails] tx ${transactionId} - tx.status_title:`, tx.status_title);
        console.log(`[Vinted getOrderDetails] tx ${transactionId} - tx.shipment?.status_title:`, tx.shipment?.status_title);
        console.log(`[Vinted getOrderDetails] tx ${transactionId} - tx.status:`, tx.status);
        console.log(`[Vinted getOrderDetails] tx ${transactionId} - tx.status_id:`, tx.status_id);
        // Prioritize shipment-level status_title when present, as it's more specific to shipping status
        // This is important for cases like "Shipping label sent to seller" or "Order sent and on its way!"
        // where the shipment-level status is more descriptive than the transaction-level "Payment successful!"
        // Fall back to transaction-level status_title if shipment status is empty
        const hasShipmentStatus = tx.shipment?.status_title && tx.shipment.status_title.trim();
        console.log(`[Vinted getOrderDetails] tx ${transactionId} - hasShipmentStatus (exists and non-empty):`, !!hasShipmentStatus, hasShipmentStatus ? `"${hasShipmentStatus}"` : 'N/A');
        const statusTitle = hasShipmentStatus
            ? tx.shipment.status_title
            : (tx.status_title || null);
        console.log(`[Vinted getOrderDetails] tx ${transactionId} - Final statusTitle (prioritizing shipment):`, statusTitle);
        return {
            transactionId: tx.id?.toString(),
            conversationId: tx.conversation_id?.toString(),
            status: tx.status,
            statusCode: tx.status_id,
            statusTitle: statusTitle, // Human-readable status (with fallback to shipment status_title)
            grossAmount,
            serviceFee,
            netAmount,
            currency: tx.currency || tx.offer?.price?.currency_code || 'GBP',
            buyer: tx.buyer || tx.other_party ? {
                id: (tx.buyer?.id || tx.other_party?.id)?.toString(),
                username: tx.buyer?.login || tx.other_party?.login,
                profileUrl: tx.buyer?.profile_url || tx.other_party?.profile_url,
                location: tx.buyer?.city || tx.other_party?.city,
                countryCode: tx.buyer?.country_code || tx.other_party?.country_code,
                // Get buyer's real name - prefer invoicing info, then fall back to transaction data
                realName: buyerAddressFromInvoicing?.name || tx.shipment?.address?.name || tx.invoice_address?.name || tx.shipping_address?.name,
            } : undefined,
            // Shipping address - prefer invoicing info (business accounts), then fall back to transaction data
            shippingAddress: buyerAddressFromInvoicing || tx.shipment?.address || tx.shipping_address || tx.invoice_address ? {
                name: buyerAddressFromInvoicing?.name || tx.shipment?.address?.name || tx.shipping_address?.name || tx.invoice_address?.name,
                line1: buyerAddressFromInvoicing?.line1 || tx.shipment?.address?.line1 || tx.shipment?.address?.street || tx.shipping_address?.line1,
                line2: buyerAddressFromInvoicing?.line2 || tx.shipment?.address?.line2 || tx.shipping_address?.line2,
                city: buyerAddressFromInvoicing?.city || tx.shipment?.address?.city || tx.shipping_address?.city,
                postalCode: buyerAddressFromInvoicing?.postalCode || tx.shipment?.address?.postal_code || tx.shipment?.address?.postcode || tx.shipping_address?.postal_code,
                country: buyerAddressFromInvoicing?.country || tx.shipment?.address?.country?.name || tx.shipment?.address?.country || tx.shipping_address?.country,
                email: buyerAddressFromInvoicing?.email || tx.invoice_address?.email || tx.buyer?.email,
            } : undefined,
            items: items.map((item) => ({
                itemId: item.id?.toString(),
                title: item.title,
                price: safeParseFloat(item.price),
                thumbnailUrl: item.photo?.thumbnails?.[0]?.url || item.photos?.[0]?.thumbnails?.[0]?.url,
                itemUrl: item.url || (item.id ? this.getProductUrl(item.id) : undefined),
            })),
            isBundle: items.length > 1,
            itemCount: items.length,
            // Shipment details including status
            shipmentId: tx.shipment?.id?.toString(),
            trackingNumber: tx.shipment?.tracking_code,
            carrier: tx.shipment?.carrier?.name,
            shipmentStatus: tx.shipment?.status, // Numeric (e.g., 400 = delivered)
            shipmentStatusTitle: tx.shipment?.status_title, // "Package delivered."
            shipmentStatusUpdatedAt: tx.shipment?.status_updated_at, // Delivery timestamp
            labelUrl: tx.shipment?.label_url || tx.shipping_label_url, // Shipping label PDF URL
            orderDate: tx.created_at,
            completedDate: tx.completed_at,
            rawData: tx,
        };
    }
    /**
     * Get shipment details including shipping address
     * This endpoint typically has the full address data
     */
    async getShipmentDetails(shipmentId, retry = false, retryCount = 0) {
        await this.setTokens(retry);
        const url = `${this.apiUrl}/shipments/${shipmentId}`;
        console.log(`[Vinted] Fetching shipment details: ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                },
                credentials: "include",
            });
            if (response.status === 401 && !retry) {
                return this.getShipmentDetails(shipmentId, true, retryCount);
            }
            // Handle rate limiting (429) with exponential backoff
            if (response.status === 429) {
                const maxRetries = 3;
                if (retryCount < maxRetries) {
                    // Exponential backoff: 2s, 4s, 8s
                    const delayMs = Math.pow(2, retryCount) * 1000;
                    console.warn(`[Vinted] Rate limited (429). Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return this.getShipmentDetails(shipmentId, retry, retryCount + 1);
                }
                else {
                    console.error(`[Vinted] Shipment details request failed: 429 (Too Many Requests) after ${maxRetries} retries`);
                    return null;
                }
            }
            if (!response.ok) {
                console.error(`[Vinted] Shipment details request failed: ${response.status}`);
                return null;
            }
            const body = await response.json();
            const shipment = body.shipment || body;
            // NOTE: Vinted API does NOT expose buyer addresses in shipment details.
            // The endpoint only returns: { delivery_type, code }
            // Buyer address is only available on the printed shipping label PDF.
            return {
                // Address is NOT available via API - only on shipping label PDF
                address: undefined,
                deliveryType: shipment.delivery_type,
                trackingNumber: shipment.tracking_code || shipment.tracking_number,
                carrier: shipment.carrier?.name || shipment.carrier_name,
                status: shipment.status,
                statusTitle: shipment.status_title,
            };
        }
        catch (err) {
            console.error('[Vinted] Error fetching shipment details:', err);
            return null;
        }
    }
    /**
     * Get invoicing/billing information for a transaction (business accounts)
     * This contains the buyer's shipping address!
     */
    async getInvoicingInfo(transactionId, retry = false, retryCount = 0) {
        await this.setTokens(retry);
        // The correct endpoint for business accounts
        const url = `${this.apiUrl}/transactions/${transactionId}/business_account_invoice_instructions`;
        console.log(`[Vinted] Fetching invoicing info: ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                },
                credentials: "include",
            });
            if (response.status === 401 && !retry) {
                return this.getInvoicingInfo(transactionId, true, retryCount);
            }
            // Handle rate limiting (429) with exponential backoff
            if (response.status === 429) {
                const maxRetries = 3;
                if (retryCount < maxRetries) {
                    // Exponential backoff: 2s, 4s, 8s
                    const delayMs = Math.pow(2, retryCount) * 1000;
                    console.warn(`[Vinted] Rate limited (429) on invoicing info. Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return this.getInvoicingInfo(transactionId, retry, retryCount + 1);
                }
                else {
                    console.error(`[Vinted] Failed to fetch invoicing info for ${transactionId}: 429 (Too Many Requests) after ${maxRetries} retries`);
                    return null;
                }
            }
            if (response.status === 200) {
                const body = await response.json();
                console.log(`[Vinted] SUCCESS! Invoicing info returned:`, JSON.stringify(body).substring(0, 3000));
                // Extract buyer address from the response
                // Structure is: { business_account_invoice_instructions: { buyer: { email, address: {...} } } }
                const instructions = body.business_account_invoice_instructions || body.invoice_instructions || body;
                const buyerInfo = instructions.buyer || instructions.customer || body.buyer;
                const address = buyerInfo?.address;
                if (address) {
                    console.log(`[Vinted] Extracted buyer address:`, JSON.stringify(address));
                    return {
                        buyerAddress: {
                            name: address.name || address.full_name,
                            line1: address.line1 || address.line_1 || address.street,
                            line2: address.line2 || address.line_2,
                            city: address.city || address.town,
                            postalCode: address.postal_code || address.postcode || address.zip_code,
                            country: address.country || address.country_name,
                            email: buyerInfo?.email,
                        },
                        rawData: body,
                    };
                }
                return { rawData: body };
            }
            else {
                console.log(`[Vinted] Invoicing endpoint returned ${response.status}`);
            }
        }
        catch (err) {
            console.log(`[Vinted] Invoicing endpoint failed:`, err);
        }
        return null;
    }
    /**
     * Get shipping label options for a shipment
     * Returns available label types (printable, QR code) and carrier info
     */
    async getShipmentLabelOptions(shipmentId, retry = false) {
        await this.setTokens(retry);
        const url = `${this.apiUrl}/shipments/${shipmentId}/label_options?drop_off_rewrite=true`;
        console.log(`[Vinted] Fetching label options: ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                },
                credentials: "include",
            });
            if (response.status === 401 && !retry) {
                return this.getShipmentLabelOptions(shipmentId, true);
            }
            if (!response.ok) {
                console.error(`[Vinted] Label options request failed: ${response.status}`);
                return null;
            }
            const body = await response.json();
            const opts = body.label_options || body;
            // NOTE: Vinted API does NOT expose buyer shipping addresses for privacy.
            // The receiver object only contains: { photo_url, name }
            // Full address is only available on the shipping label PDF.
            const receiver = opts.receiver;
            const receiverInfo = receiver ? {
                name: receiver.name || null,
                photoUrl: receiver.photo_url || null,
                // Address fields are NOT available via API (privacy protection)
            } : undefined;
            return {
                shipmentId,
                labelOptions: opts.label_types || body.label_options || body.options || [],
                carrier: opts.carrier || body.carrier || body.shipping_carrier,
                dropOffPoints: body.drop_off_points || opts.drop_offs || [],
                receiverInfo,
                senderPhone: opts.sender?.phone_number || null,
                shippingOrderId: opts.shipping_order_id || null,
                rawData: body,
            };
        }
        catch (err) {
            console.error('[Vinted] Error fetching label options:', err);
            return null;
        }
    }
    /**
     * Get nearby drop-off points for a shipment
     */
    async getNearbyDropOffPoints(shipmentId, labelType = 'printable', latitude, longitude, retry = false) {
        await this.setTokens(retry);
        let url = `${this.apiUrl}/shipments/${shipmentId}/nearby_drop_off_points?label_type_id=${labelType}&label_type=${labelType}&country_code=GB`;
        if (latitude && longitude) {
            url += `&latitude=${latitude}&longitude=${longitude}`;
        }
        console.log(`[Vinted] Fetching drop-off points: ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                },
                credentials: "include",
            });
            if (response.status === 401 && !retry) {
                return this.getNearbyDropOffPoints(shipmentId, labelType, latitude, longitude, true);
            }
            if (!response.ok) {
                console.error(`[Vinted] Drop-off points request failed: ${response.status}`);
                return [];
            }
            const body = await response.json();
            const points = body.drop_off_points || body.points || [];
            return points.map((p) => ({
                id: p.id,
                name: p.name,
                address: p.address || p.full_address,
                distance: p.distance,
                openingHours: p.opening_hours,
                carrier: p.carrier,
            }));
        }
        catch (err) {
            console.error('[Vinted] Error fetching drop-off points:', err);
            return [];
        }
    }
    /**
     * Generate/order a shipping label for a transaction
     * Returns the label URL after successful generation
     */
    async orderShipmentLabel(transactionId, labelType = 'printable', dropOffPointId, sellerAddressId, retry = false) {
        await this.setTokens(retry);
        // If no seller address provided, fetch the user's addresses
        let addressId = sellerAddressId;
        if (!addressId) {
            console.log('[Vinted] No seller address provided, fetching user addresses...');
            const addresses = await this.getUserAddresses();
            if (addresses.length > 0) {
                // Prefer default address, otherwise use first one
                const defaultAddr = addresses.find(a => a.isDefault);
                addressId = defaultAddr?.id || addresses[0].id;
                console.log(`[Vinted] Using seller address: ${addressId}`);
            }
            else {
                console.error('[Vinted] No user addresses found - label order will likely fail');
            }
        }
        const url = `${this.apiUrl}/transactions/${transactionId}/shipment/order`;
        console.log(`[Vinted] Ordering shipping label: ${url}`);
        const body = {
            label_type: labelType,
        };
        if (dropOffPointId) {
            body.drop_off_point_id = dropOffPointId;
        }
        if (addressId) {
            body.seller_address_id = addressId;
        }
        console.log('[Vinted] Label order request body:', JSON.stringify(body));
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (response.status === 401 && !retry) {
                return this.orderShipmentLabel(transactionId, labelType, dropOffPointId, sellerAddressId, true);
            }
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Vinted] Label order failed: ${response.status}`, errorText);
                // Return error details instead of null for better debugging
                return {
                    success: false,
                    error: errorText,
                };
            }
            const result = await response.json();
            console.log('[Vinted] Label order response:', JSON.stringify(result).substring(0, 500));
            // Extract label URL from response - Vinted may return it in different ways
            const labelUrl = result.shipment?.label_url ||
                result.label_url ||
                result.shipping_label?.url ||
                result.pdf_url;
            return {
                success: true,
                labelUrl,
                trackingNumber: result.shipment?.tracking_code || result.tracking_number,
                carrier: result.shipment?.carrier?.name || result.carrier,
                dropOffPoint: result.drop_off_point,
                rawData: result,
            };
        }
        catch (err) {
            console.error('[Vinted] Error ordering label:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
            };
        }
    }
    /**
     * Get the shipping label URL for an existing shipment
     * Call this if label was already generated
     * @param shipmentId - The shipment ID (not transaction ID)
     */
    async getShipmentLabel(shipmentId, retry = false) {
        await this.setTokens(retry);
        // Use the /label_url sub-endpoint - this is where Vinted serves label URLs
        const url = `${this.apiUrl}/shipments/${shipmentId}/label_url`;
        console.log(`[Vinted] Fetching label URL: ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                },
                credentials: "include",
            });
            if (response.status === 401 && !retry) {
                return this.getShipmentLabel(shipmentId, true);
            }
            if (!response.ok) {
                console.log(`[Vinted] Label URL fetch failed: ${response.status}`);
                return null;
            }
            const body = await response.json();
            console.log(`[Vinted] Label URL response:`, JSON.stringify(body).substring(0, 500));
            // The /label_url endpoint returns { label_url: "..." } or { url: "..." }
            const labelUrl = body.label_url || body.url || null;
            console.log(`[Vinted] Extracted label_url:`, labelUrl ? labelUrl.substring(0, 80) + '...' : 'NOT FOUND');
            return labelUrl;
        }
        catch (err) {
            console.error('[Vinted] Error getting shipment label:', err);
            return null;
        }
    }
    /**
     * Order a label and poll for the URL until it's ready
     * @param transactionId - The transaction ID
     * @param shipmentId - The shipment ID (for polling)
     * @param labelType - Label type (printable/digital)
     * @param dropOffPointId - Optional drop-off point
     * @param maxAttempts - Max polling attempts (default 5)
     * @param pollIntervalMs - Interval between polls in ms (default 2000)
     */
    async orderLabelAndPoll(transactionId, shipmentId, labelType = 'printable', dropOffPointId, maxAttempts = 5, pollIntervalMs = 2000) {
        console.log(`[Vinted] orderLabelAndPoll: Starting for tx ${transactionId}, shipment ${shipmentId}`);
        // Step 1: Order the label
        const orderResult = await this.orderShipmentLabel(transactionId, labelType, dropOffPointId);
        if (!orderResult?.success) {
            const errorStr = orderResult?.error || '';
            console.error('[Vinted] orderLabelAndPoll: Order failed', errorStr);
            // Check if error indicates label already exists (status 200-299 typically means label stage)
            // Error like: "Can't order the shipping label for X with status 230"
            const statusMatch = errorStr.match(/status\s*(\d+)/i);
            const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
            // Status 200-399 usually means label exists or shipment is in progress
            // Try to fetch existing label instead of failing
            if (statusCode && statusCode >= 200 && statusCode < 400) {
                console.log(`[Vinted] orderLabelAndPoll: Order status ${statusCode} suggests label may already exist, trying to fetch...`);
                const existingLabel = await this.getShipmentLabelDetails(shipmentId);
                if (existingLabel.labelUrl) {
                    console.log('[Vinted] orderLabelAndPoll: Found existing label URL!');
                    return {
                        success: true,
                        labelUrl: existingLabel.labelUrl,
                        trackingNumber: existingLabel.trackingNumber || undefined,
                        carrier: existingLabel.carrier || undefined,
                    };
                }
                // If no URL but status suggests it's shipped, return appropriate message
                if (statusCode >= 300) {
                    return {
                        success: false,
                        error: 'This order is already in transit or delivered. No label needed.',
                    };
                }
            }
            return {
                success: false,
                error: orderResult?.error || 'Failed to order label',
            };
        }
        console.log('[Vinted] orderLabelAndPoll: Order successful, starting poll...');
        // If we already have a label URL from the order response, return it
        if (orderResult.labelUrl) {
            console.log('[Vinted] orderLabelAndPoll: Label URL already in order response');
            return orderResult;
        }
        // Step 2: Poll for the label URL
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`[Vinted] orderLabelAndPoll: Poll attempt ${attempt}/${maxAttempts}`);
            // Wait before polling
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            try {
                const details = await this.getShipmentLabelDetails(shipmentId);
                if (details.labelUrl) {
                    console.log(`[Vinted] orderLabelAndPoll: Got label URL on attempt ${attempt}`);
                    return {
                        success: true,
                        labelUrl: details.labelUrl,
                        trackingNumber: details.trackingNumber || orderResult.trackingNumber,
                        carrier: details.carrier || orderResult.carrier,
                        rawData: orderResult.rawData,
                    };
                }
                console.log(`[Vinted] orderLabelAndPoll: No URL yet on attempt ${attempt}`);
            }
            catch (err) {
                console.error(`[Vinted] orderLabelAndPoll: Poll attempt ${attempt} failed:`, err);
            }
        }
        // Return what we have even if no URL (might be pending)
        console.log('[Vinted] orderLabelAndPoll: Max attempts reached, returning without URL');
        return {
            success: true,
            labelUrl: undefined,
            trackingNumber: orderResult.trackingNumber,
            carrier: orderResult.carrier,
            rawData: orderResult.rawData,
            error: 'Label URL not ready yet - check back in a few moments',
        };
    }
    /**
     * Get full shipment details including label URL, tracking, and carrier info
     */
    async getShipmentLabelDetails(shipmentId, retry = false, retryCount = 0) {
        await this.setTokens(retry);
        // Use the /label_url sub-endpoint
        const url = `${this.apiUrl}/shipments/${shipmentId}/label_url`;
        console.log(`[Vinted] Fetching shipment label details: ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Csrf-Token": this.csrfToken,
                    "X-Anon-Id": this.anonId,
                },
                credentials: "include",
            });
            if (response.status === 401 && !retry) {
                return this.getShipmentLabelDetails(shipmentId, true, retryCount);
            }
            // Handle rate limiting (429) with exponential backoff
            if (response.status === 429) {
                const maxRetries = 3;
                if (retryCount < maxRetries) {
                    // Exponential backoff: 2s, 4s, 8s
                    const delayMs = Math.pow(2, retryCount) * 1000;
                    console.warn(`[Vinted] Rate limited (429) on label details. Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return this.getShipmentLabelDetails(shipmentId, retry, retryCount + 1);
                }
                else {
                    console.error(`[Vinted] Shipment label details fetch failed: 429 (Too Many Requests) after ${maxRetries} retries`);
                    return { labelUrl: null, trackingNumber: null, carrier: null };
                }
            }
            if (!response.ok) {
                console.log(`[Vinted] Shipment label details fetch failed: ${response.status}`);
                return { labelUrl: null, trackingNumber: null, carrier: null };
            }
            const body = await response.json();
            console.log(`[Vinted] Label details response:`, JSON.stringify(body).substring(0, 500));
            return {
                labelUrl: body.label_url || body.url || null,
                trackingNumber: body.tracking_code || body.tracking_number || null,
                carrier: body.carrier?.name || body.shipping_carrier || null,
            };
        }
        catch (err) {
            console.error('[Vinted] Error getting shipment label details:', err);
            return { labelUrl: null, trackingNumber: null, carrier: null };
        }
    }
}
