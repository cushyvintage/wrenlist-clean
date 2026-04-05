import { EXTENSION_VERSION } from "./shared/api.js";
import { delistFromMarketplace, publishToMarketplace, } from "./orchestrator/publisher.js";
import { checkMarketplaceLogin, fetchMarketplaceListing, fetchMarketplaceListings, updateMarketplaceListing, } from "./orchestrator/marketplaceActions.js";
import { normalizeError } from "./orchestrator/utils.js";
import { createVintedServices } from "./marketplaces/vinted/index.js";
import { Condition } from "./shared/enums.js";
import { ShopifyClient } from "./marketplaces/shopify/client.js";
import { ShopifyMapper } from "./marketplaces/shopify/mapper.js";
const KEEP_ALIVE_INTERVAL_MS = 20_000;
const DEFAULT_WRENLIST_BASE_URL = "https://wrenlist.com";
const ICON_PATH = "icons/icon128.png";
// Shopify taxonomy category IDs need to be looked up from Shopify's actual
// taxonomy API. For now, we skip category mapping and rely on customProductType
// for organisation. Category can be set manually in Shopify admin or via
// platform_category_id in product_marketplace_data.
function mapCategoryToShopify(category) {
    // Return empty — category mapping requires valid Shopify taxonomy node IDs
    // which vary by store. Users can set platform_category_id per-item.
    void category;
    return [];
}
const PRODUCT_TYPE_MAP = {
    ceramics: "Vintage Ceramics",
    glassware: "Vintage Glassware",
    books: "Books",
    jewellery: "Vintage Jewellery",
    clothing: "Vintage Clothing",
    homeware: "Vintage Homeware",
    furniture: "Vintage Furniture",
    toys: "Vintage Toys",
    collectibles: "Collectibles",
    jugs: "Vintage Ceramics",
    art: "Art & Prints",
};
function mapProductType(category) {
    if (!category)
        return "";
    return PRODUCT_TYPE_MAP[category.toLowerCase()] ?? "";
}
function mapCondition(condition) {
    switch (condition?.toLowerCase()) {
        case "excellent":
        case "new":
            return Condition.NewWithoutTags;
        case "good":
            return Condition.Good;
        case "fair":
            return Condition.Fair;
        case "poor":
            return Condition.Poor;
        default:
            return Condition.Good;
    }
}
(() => {
    if (typeof chrome === "undefined" || !chrome.runtime) {
        return;
    }
    const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, KEEP_ALIVE_INTERVAL_MS);
    chrome.runtime.onStartup.addListener(keepAlive);
    keepAlive();
    // --- Session health monitor (chrome.alarms, MV3-safe) ---
    const SESSION_CHECK_ALARM = "session_health_check";
    const SESSION_CHECK_INTERVAL_MINUTES = 30;
    chrome.alarms.create(SESSION_CHECK_ALARM, {
        periodInMinutes: SESSION_CHECK_INTERVAL_MINUTES,
    });
    chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name !== SESSION_CHECK_ALARM)
            return;
        console.log("[SessionHealth] Running periodic marketplace session check...");
        const marketplaces = [
            "vinted",
            "poshmark",
            "depop",
            "mercari",
            "grailed",
            "facebook",
            "whatnot",
            "etsy",
        ];
        const results = {};
        for (const mp of marketplaces) {
            try {
                results[mp] = await checkMarketplaceLogin(mp);
            }
            catch {
                results[mp] = false;
            }
        }
        console.log("[SessionHealth] Results:", results);
        // Notify any connected wrenlist.com tabs about expired sessions
        const expired = Object.entries(results).filter(([, ok]) => !ok);
        if (expired.length > 0) {
            const wrenlistTabs = await chrome.tabs.query({
                url: "*://*.wrenlist.com/*",
            });
            for (const tab of wrenlistTabs) {
                if (tab.id) {
                    chrome.tabs
                        .sendMessage(tab.id, {
                        type: "SESSION_WARNING",
                        expired: expired.map(([name]) => name),
                        results,
                    })
                        .catch(() => { });
                }
            }
        }
    });
    // --- Queue polling: publish-queue + delist-queue (chrome.alarms, MV3-safe) ---
    const QUEUE_POLL_ALARM = "queue_poll";
    const QUEUE_POLL_INTERVAL_MINUTES = 1;
    chrome.alarms.create(QUEUE_POLL_ALARM, {
        periodInMinutes: QUEUE_POLL_INTERVAL_MINUTES,
    });
    chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name !== QUEUE_POLL_ALARM)
            return;
        const baseUrl = await getWrenlistBaseUrl();
        // --- Poll publish-queue ---
        try {
            const pubRes = await fetch(`${baseUrl}/api/marketplace/publish-queue`, {
                credentials: "include",
            });
            if (pubRes.ok) {
                const pubData = await pubRes.json();
                const items = pubData.data ?? [];
                for (const item of items) {
                    const mp = item.marketplace;
                    const find = item.find;
                    if (!find)
                        continue;
                    console.log(`[QueuePoll] Publishing ${find.name} to ${mp}...`);
                    // Build Product from find data, enriched with per-platform overrides
                    const listingPrice = item.listing_price ?? find.asking_price_gbp ?? 0;
                    const shopifyCategory = item.platform_category_id
                        ? [item.platform_category_id]
                        : mapCategoryToShopify(find.category);
                    const weightGrams = find.shipping_weight_grams ?? find.weight_grams;
                    const product = {
                        id: find.id,
                        marketPlaceId: find.id,
                        title: find.name ?? "Untitled",
                        description: find.description ?? "",
                        price: listingPrice,
                        images: find.photos ?? [],
                        brand: find.brand ?? undefined,
                        condition: mapCondition(find.condition),
                        category: shopifyCategory,
                        tags: [find.brand, find.category, "vintage"].filter(Boolean).join(", "),
                        color: find.colour ?? undefined,
                        size: find.size ? [find.size] : undefined,
                        sku: find.sku ?? undefined,
                        shipping: {
                            shippingWeight: weightGrams
                                ? { value: weightGrams, unit: "Grams" }
                                : undefined,
                        },
                        dynamicProperties: {
                            productType: mapProductType(find.category),
                        },
                    };
                    // Pass settings (e.g. shopifyShopUrl) from the queue item
                    const publishOptions = item.settings ? { settings: item.settings } : {};
                    const result = await publishToMarketplace(mp, product, publishOptions);
                    // Report back to Wrenlist API
                    try {
                        const reportBody = {
                            find_id: item.find_id,
                            marketplace: mp,
                            platform_listing_id: result.product?.id ? String(result.product.id) : null,
                            platform_listing_url: result.product?.url ?? null,
                        };
                        // Include collection name and product type for Shopify
                        if (mp === "shopify" && result.success) {
                            const productType = product.dynamicProperties?.productType;
                            if (productType) {
                                reportBody.fields = { collection_name: productType };
                            }
                        }
                        await fetch(`${baseUrl}/api/marketplace/publish-queue`, {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(reportBody),
                        });
                    }
                    catch (e) {
                        console.warn("[QueuePoll] Failed to report publish result:", e);
                    }
                    if (result.success) {
                        console.log(`[QueuePoll] Published ${find.name} to ${mp}`);
                    }
                    else {
                        console.warn(`[QueuePoll] Failed to publish ${find.name} to ${mp}:`, result.message);
                    }
                }
            }
        }
        catch (e) {
            // Silently fail — user may not be logged in
            console.debug("[QueuePoll] Publish queue poll failed:", e);
        }
        // --- Poll delist-queue ---
        try {
            const delRes = await fetch(`${baseUrl}/api/marketplace/delist-queue`, {
                credentials: "include",
            });
            if (delRes.ok) {
                const delData = await delRes.json();
                const items = delData.data ?? [];
                for (const item of items) {
                    const mp = item.marketplace;
                    const listingId = item.platform_listing_id;
                    if (!listingId)
                        continue;
                    console.log(`[QueuePoll] Delisting ${listingId} from ${mp}...`);
                    // Pass settings (e.g. shopifyShopUrl) from the queue item
                    const delistOptions = item.settings ? { settings: item.settings } : {};
                    const result = await delistFromMarketplace(mp, listingId, delistOptions);
                    // Report back to Wrenlist API
                    try {
                        await fetch(`${baseUrl}/api/marketplace/delist-queue`, {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                find_id: item.find_id,
                                marketplace: mp,
                            }),
                        });
                    }
                    catch (e) {
                        console.warn("[QueuePoll] Failed to report delist result:", e);
                    }
                    if (result.success) {
                        console.log(`[QueuePoll] Delisted ${listingId} from ${mp}`);
                    }
                    else {
                        console.warn(`[QueuePoll] Failed to delist ${listingId} from ${mp}:`, result.message);
                    }
                }
            }
        }
        catch (e) {
            console.debug("[QueuePoll] Delist queue poll failed:", e);
        }
    });
    chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
        if (!message || (!("action" in message) && !("type" in message))) {
            sendResponse(withError("Unknown action"));
            return false;
        }
        void dispatchExternalMessage(message)
            .then(sendResponse)
            .catch((error) => sendResponse(withError(error)));
        return true;
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || (typeof message.action !== "string" && typeof message.type !== "string")) {
            return false;
        }
        const command = String(message.action ?? message.type);
        if (!command) {
            return false;
        }
        switch (command.toLowerCase()) {
            case "gettabid":
                sendResponse(sender.tab?.id);
                return true;
            case "opentab":
                void openTab(message.url, message.focusTab).then(sendResponse);
                return true;
            case "import_to_wrenlist":
                void handleImportToWrenlist(message, sender).then(sendResponse).catch((error) => {
                    sendResponse(withError(error));
                });
                return true;
            case "sync_vinted_status":
                // Handle sync requests from content script
                void handleSyncVintedStatus(message).then(sendResponse).catch((error) => {
                    sendResponse(withError(error));
                });
                return true;
            case "check_marketplace_login":
            case "checkloggedin":
                // Handle login status check from content script
                void handleCheckLoginCommand(message).then(sendResponse).catch((error) => {
                    sendResponse(withError(error));
                });
                return true;
            case "delist_from_marketplace":
            case "delistlistingfrommarketplace":
            case "delistmarketplacelisting":
                // Handle delist requests from content script
                void handleDelistCommand(message).then(sendResponse).catch((error) => {
                    sendResponse(withError(error));
                });
                return true;
            case "ping":
                // Extension detection ping from platform
                sendResponse({ success: true, version: EXTENSION_VERSION });
                return true;
            case "vinted_debug_info":
                // Vinted diagnostics
                void (async () => {
                    try {
                        const allCookies = await chrome.cookies.getAll({});
                        const vintedCookies = allCookies.filter(c => c.domain.includes("vinted"));
                        const tldCookie = vintedCookies.find(c => c.name === "v_uid" || c.name === "_vinted_session");
                        const domain = tldCookie?.domain ?? "";
                        const tld = domain.includes("co.uk") ? "co.uk" : domain.includes("vinted.") ? domain.replace(/^.*?vinted\./, "") : "unknown";
                        sendResponse({
                            success: true,
                            cookiesFound: vintedCookies.length > 0,
                            tld,
                            version: EXTENSION_VERSION,
                            lastError: null,
                        });
                    }
                    catch (e) {
                        sendResponse({ success: false, lastError: e instanceof Error ? e.message : String(e) });
                    }
                })();
                return true;
            default:
                return false;
        }
    });
    chrome.runtime.onUpdateAvailable.addListener(() => chrome.runtime.reload());
})();
async function dispatchExternalMessage(message) {
    const command = normalizeCommand(message);
    switch (command) {
        case "postlistingtomarketplace":
        case "publishtomarketplace":
        case "publish_to_marketplace":
            return handlePublishCommand(message);
        case "publish_to_shopify":
            return handlePublishToShopify(message);
        case "updatelistingonmarketplace":
        case "update_marketplace_listing":
        case "updatemarketplacelisting":
            return handleUpdateCommand(message);
        case "delistlistingfrommarketplace":
        case "delist_from_marketplace":
        case "delistmarketplacelisting":
            return handleDelistCommand(message);
        case "checkloggedin":
        case "check_marketplace_login":
            return handleCheckLoginCommand(message);
        case "get_vinted_session":
        case "getvintegsession":
        case "check_vinted_session":
            return handleGetVintedSession();
        case "getlistingsfrommarketplace":
        case "get_marketplace_listings":
            return handleGetListings(message);
        case "getlistingfrommarketplace":
        case "get_marketplace_listing":
            return handleGetListing(message);
        case "opentab":
            return openTab(String(message.url ?? ""), Boolean(message.focusTab));
        case "requestupdate":
            return chrome.runtime.requestUpdateCheck();
        case "getversion":
            return EXTENSION_VERSION;
        case "ping":
            return withExtensionVersion({ success: true, message: "Extension available" });
        case "detect_shopify_store":
        case "detectshopifystore":
            return handleDetectShopifyStore();
        case "batch_import_vinted":
        case "batchimportvinted":
            return handleBatchImportVinted(message);
        case "sync_vinted_status":
        case "syncvintedstatus":
            return handleSyncVintedStatus(message);
        case "get_vinted_sales":
        case "getvintegsales":
        case "getsalesfrommarketplace":
            return handleGetVintedSales(message);
        case "get_vinted_order":
        case "getvintedorder":
        case "getorderdetails":
            return handleGetVintedOrder(message);
        case "get_vinted_conversation_items":
        case "getvintedconversationitems":
            return handleGetVintedConversationItems(message);
        case "get_vinted_conversation_messages":
        case "getvintedconversationmessages":
            return handleGetVintedConversationMessages(message);
        case "get_vinted_label_options":
        case "getvintedlabeloptions":
            return handleGetVintedLabelOptions(message);
        case "get_vinted_shipment_details":
        case "getvintedshipmentdetails":
            return handleGetVintedShipmentDetails(message);
        case "get_vinted_drop_off_points":
        case "getvinteddropoffpoints":
            return handleGetVintedDropOffPoints(message);
        case "order_vinted_label":
        case "ordervintedlabel":
            return handleOrderVintedLabel(message);
        case "get_vinted_label":
        case "getvintedlabel":
            return handleGetVintedLabel(message);
        case "send_vinted_message":
        case "sendvintedmessage":
            return handleSendVintedMessage(message);
        case "fetch_vinted_api":
        case "fetchvintedapi":
            return handleFetchVintedApi(message);
        case "fetch_wrenlist_api":
        case "fetchwrenlistapi":
            return handleFetchWrenlistApi(message);
        case "vinted_debug_info":
            return handleVintedDebugInfo();
        default:
            throw new Error(`Unsupported action: ${String(message.action ?? message.type ?? "unknown")}`);
    }
}
async function handlePublishCommand(message) {
    const marketplace = resolveMarketplace(message);
    const product = resolveProduct(message);
    return withExtensionVersion(await publishToMarketplace(marketplace, product, {
        settings: resolveSettings(message),
        tld: resolveTldFromMessage(message, marketplace),
    }));
}
async function handleUpdateCommand(message) {
    const marketplace = resolveMarketplace(message);
    const product = resolveProduct(message);
    return withExtensionVersion(await updateMarketplaceListing(marketplace, product, {
        settings: resolveSettings(message),
        tld: resolveTldFromMessage(message, marketplace),
    }));
}
async function handleDelistCommand(message) {
    const marketplace = resolveMarketplace(message);
    const listingId = message.productId ??
        message.listingId ??
        message.marketplaceId;
    if (!listingId) {
        throw new Error("Missing listing id");
    }
    return withExtensionVersion(await delistFromMarketplace(marketplace, listingId, {
        settings: resolveSettings(message),
        tld: resolveTldFromMessage(message, marketplace),
    }));
}
async function handlePublishToShopify(message) {
    try {
        const productId = message.productId;
        const shopId = message.shopId;
        if (!productId) {
            throw new Error("Product ID is required");
        }
        if (!shopId) {
            throw new Error("Shopify store URL is required. Please set it in Marketplaces.");
        }
        // Fetch product payload from Wrenlist API
        const baseUrl = await getWrenlistBaseUrl(message.wrenlistBaseUrl);
        const payloadResponse = await fetch(`${baseUrl}/api/chrome-extension/shopify/product-payload/${productId}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (payloadResponse.status === 401) {
            throw new Error("Please log in to Wrenlist first");
        }
        if (payloadResponse.status === 404) {
            throw new Error("Product not found");
        }
        if (!payloadResponse.ok) {
            const errorText = await payloadResponse.text();
            console.error("[Shopify] Payload fetch failed:", payloadResponse.status, errorText);
            throw new Error(`Failed to fetch product: ${payloadResponse.status}`);
        }
        const payloadData = await payloadResponse.json();
        if (!payloadData.success) {
            throw new Error(payloadData.error || "Failed to fetch product payload");
        }
        // Create Shopify client
        const shopifyClient = new ShopifyClient(shopId);
        await shopifyClient.bootstrap();
        // Create mapper and map product
        const mapper = new ShopifyMapper({
            uploadImages: (files) => shopifyClient.uploadImages(files),
            getLocationId: () => shopifyClient.getLocationId(),
            getCollectionIds: async () => [],
        });
        // Build Product from payload
        const product = {
            id: payloadData.data.product.id,
            marketPlaceId: payloadData.data.product.id,
            title: payloadData.data.product.title,
            description: payloadData.data.product.description,
            price: payloadData.data.product.price,
            images: payloadData.data.images.urls || [],
            brand: payloadData.data.product.brand || undefined,
            condition: Condition.Good,
            category: [],
            tags: payloadData.data.product.metadata?.tags || "",
            shipping: {
                shippingWeight: undefined,
            },
            dynamicProperties: {},
        };
        // Map to Shopify payload
        const shopifyPayload = await mapper.map(product);
        // Publish to Shopify
        const result = await shopifyClient.postListing(shopifyPayload);
        if (result.success && result.product) {
            return withExtensionVersion({
                success: true,
                product: {
                    id: result.product.id,
                    url: result.product.url,
                },
                message: "Successfully published to Shopify",
            });
        }
        else {
            return withExtensionVersion({
                success: false,
                message: result.message || "Failed to publish to Shopify",
                internalErrors: result.internalErrors,
            });
        }
    }
    catch (error) {
        const normalized = normalizeError(error);
        return withExtensionVersion({
            success: false,
            message: normalized.message,
            internalErrors: normalized.internalErrors,
        });
    }
}
async function handleCheckLoginCommand(message) {
    const marketplace = resolveMarketplace(message);
    const isLoggedIn = await checkMarketplaceLogin(marketplace, {
        settings: resolveSettings(message),
        tld: resolveTldFromMessage(message, marketplace),
    });
    // Return in the expected format
    return {
        success: true,
        loggedIn: isLoggedIn,
        marketplace,
    };
}
async function handleGetVintedSession() {
    try {
        // First check for v_uid cookie to detect TLD and username
        const allCookies = await chrome.cookies.getAll({});
        const vUidCookie = allCookies.find(c => c.domain.includes('vinted') && c.name === "v_uid");
        if (!vUidCookie) {
            return {
                success: true,
                loggedIn: false,
                error: "No Vinted session cookie found. Please log in to Vinted.",
                extensionVersion: EXTENSION_VERSION,
            };
        }
        // Extract TLD from domain (e.g., ".vinted.co.uk" -> "co.uk")
        const domainMatch = vUidCookie.domain.match(/vinted\.([^.]+(?:\.[^.]+)?)$/);
        const tld = domainMatch?.[1] ?? "com";
        const username = vUidCookie.value;
        // Now create a Vinted client with the detected TLD and bootstrap it
        const { client } = createVintedServices({ tld });
        try {
            await client.bootstrap();
            const isLoggedIn = await client.checkLogin();
            // Use the actual username from the client (login field) if available, fall back to cookie value
            const actualUsername = client.getUsername() || username;
            return {
                success: true,
                loggedIn: isLoggedIn,
                username: isLoggedIn ? actualUsername : undefined,
                tld,
                extensionVersion: EXTENSION_VERSION,
            };
        }
        catch (bootstrapError) {
            // Bootstrap failed, but we still have the cookie
            console.warn("[Vinted] Bootstrap failed during session check:", bootstrapError);
            return {
                success: true,
                loggedIn: true, // Cookie exists, assume logged in
                username,
                tld,
                error: "Could not verify session fully, but cookie exists",
                extensionVersion: EXTENSION_VERSION,
            };
        }
    }
    catch (error) {
        console.error("[Vinted] Session check error:", error);
        return {
            success: false,
            loggedIn: false,
            error: error instanceof Error ? error.message : "Unknown error",
            extensionVersion: EXTENSION_VERSION,
        };
    }
}
async function handleGetListings(message) {
    try {
        const params = message.params ?? {};
        const rawMarketplace = params.marketplace ??
            message.marketplace;
        if (!rawMarketplace) {
            throw new Error("Marketplace is required");
        }
        const marketplace = rawMarketplace;
        return await fetchMarketplaceListings({
            marketplace,
            page: params.page ?? message.page,
            perPage: params.nbPerPage ??
                params.perPage ??
                message.nbPerPage ??
                message.perPage,
            username: params.username ??
                message.username,
            settings: params.userSettings ?? resolveSettings(message),
            tld: params.tld ?? resolveTldFromMessage(message, marketplace),
        });
    }
    catch (error) {
        return withError(error);
    }
}
async function handleGetListing(message) {
    try {
        const params = message.params ?? {};
        const rawMarketplace = params.marketplace ??
            message.marketplace;
        const id = params.id ??
            message.id ??
            message.productId;
        if (!rawMarketplace || !id) {
            throw new Error("Marketplace and id are required");
        }
        const marketplace = rawMarketplace;
        return await fetchMarketplaceListing({
            marketplace,
            id,
            settings: params.userSettings ?? resolveSettings(message),
            tld: params.tld ?? resolveTldFromMessage(message, marketplace),
        });
    }
    catch (error) {
        return withError(error);
    }
}
/**
 * Fetch sales/transactions from Vinted
 * Supports incremental sync via stopAtId parameter
 */
async function handleGetVintedSales(message) {
    try {
        const params = message.params ?? {};
        const page = params.page ?? message.page ?? 1;
        const perPage = params.perPage ?? message.perPage ?? 20;
        const tld = params.tld ?? message.tld ?? 'co.uk';
        // stopAtId: For incremental sync - stop fetching when this order ID is encountered
        const stopAtId = params.stopAtId ?? message.stopAtId;
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        const result = await client.getSales(page, perPage, stopAtId);
        return {
            success: true,
            sales: result.sales,
            pagination: result.pagination,
            stoppedEarly: result.stoppedEarly || false,
        };
    }
    catch (error) {
        console.error('[handleGetVintedSales] Error:', error);
        return withError(error);
    }
}
/**
 * Get details for a specific Vinted order/transaction
 */
async function handleGetVintedOrder(message) {
    try {
        const params = message.params ?? {};
        const transactionId = params.transactionId ??
            params.orderId ??
            message.transactionId ??
            message.orderId;
        const tld = params.tld ?? message.tld ?? 'co.uk';
        if (!transactionId) {
            throw new Error('Transaction ID is required');
        }
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        const order = await client.getOrderDetails(transactionId);
        if (!order) {
            return {
                success: false,
                message: 'Order not found',
            };
        }
        return {
            success: true,
            order,
        };
    }
    catch (error) {
        console.error('[handleGetVintedOrder] Error:', error);
        return withError(error);
    }
}
async function handleGetVintedConversationItems(message) {
    try {
        const params = message.params ?? {};
        const conversationId = params.conversationId ??
            message.conversationId;
        const tld = params.tld ?? message.tld ?? 'co.uk';
        if (!conversationId) {
            throw new Error('Conversation ID is required');
        }
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        const items = await client.getConversationItems(conversationId);
        return {
            success: true,
            items: items || [],
            hasItems: !!items && items.length > 0,
        };
    }
    catch (error) {
        console.error('[handleGetVintedConversationItems] Error:', error);
        return withError(error);
    }
}
/**
 * Fetch conversation messages for display in Wrenlist order cards
 */
async function handleGetVintedConversationMessages(message) {
    try {
        const params = message.params ?? {};
        const conversationId = params.conversationId ??
            message.conversationId;
        const tld = params.tld ?? message.tld ?? 'co.uk';
        if (!conversationId) {
            throw new Error('Conversation ID is required');
        }
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        const result = await client.getConversationMessages(conversationId);
        if (!result) {
            return { success: true, messages: [], oppositeUser: null, allowReply: false };
        }
        return {
            success: true,
            messages: result.messages,
            oppositeUser: result.oppositeUser,
            allowReply: result.allowReply,
        };
    }
    catch (error) {
        console.error('[handleGetVintedConversationMessages] Error:', error);
        return withError(error);
    }
}
/**
 * Get shipment details including shipping address
 */
async function handleGetVintedShipmentDetails(message) {
    try {
        const params = message.params ?? {};
        const shipmentId = params.shipmentId ??
            message.shipmentId;
        const tld = params.tld ?? message.tld ?? 'co.uk';
        if (!shipmentId) {
            throw new Error('Shipment ID is required');
        }
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        const details = await client.getShipmentDetails(shipmentId);
        return {
            success: true,
            shipment: details,
        };
    }
    catch (error) {
        console.error('[handleGetVintedShipmentDetails] Error:', error);
        return withError(error);
    }
}
/**
 * Get shipping label options for a Vinted shipment
 */
async function handleGetVintedLabelOptions(message) {
    try {
        const params = message.params ?? {};
        const shipmentId = params.shipmentId ??
            message.shipmentId;
        const tld = params.tld ?? message.tld ?? 'co.uk';
        if (!shipmentId) {
            throw new Error('Shipment ID is required');
        }
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        const options = await client.getShipmentLabelOptions(shipmentId);
        return {
            success: true,
            labelOptions: options,
        };
    }
    catch (error) {
        console.error('[handleGetVintedLabelOptions] Error:', error);
        return withError(error);
    }
}
/**
 * Get nearby drop-off points for shipping
 */
async function handleGetVintedDropOffPoints(message) {
    try {
        const params = message.params ?? {};
        const shipmentId = params.shipmentId ??
            message.shipmentId;
        const labelType = params.labelType ?? 'printable';
        const latitude = params.latitude;
        const longitude = params.longitude;
        const tld = params.tld ?? message.tld ?? 'co.uk';
        if (!shipmentId) {
            throw new Error('Shipment ID is required');
        }
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        const points = await client.getNearbyDropOffPoints(shipmentId, labelType, latitude, longitude);
        return {
            success: true,
            dropOffPoints: points,
        };
    }
    catch (error) {
        console.error('[handleGetVintedDropOffPoints] Error:', error);
        return withError(error);
    }
}
/**
 * Generate/order a shipping label for a Vinted transaction
 * Now includes polling to wait for the label URL to be ready
 */
async function handleOrderVintedLabel(message) {
    try {
        const params = message.params ?? {};
        const transactionId = params.transactionId ??
            message.transactionId;
        const shipmentId = params.shipmentId ??
            message.shipmentId;
        const labelType = params.labelType ?? 'printable';
        const dropOffPointId = params.dropOffPointId;
        const sellerAddressId = params.sellerAddressId;
        const usePoll = params.poll ?? true; // Default to polling
        const tld = params.tld ?? message.tld ?? 'co.uk';
        if (!transactionId) {
            throw new Error('Transaction ID is required');
        }
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        let result;
        // Use polling if shipmentId is provided and polling is enabled
        if (usePoll && shipmentId) {
            console.log(`[handleOrderVintedLabel] Using poll method with shipment ${shipmentId}`);
            result = await client.orderLabelAndPoll(transactionId, shipmentId, labelType, dropOffPointId);
        }
        else {
            // Fall back to simple order (no polling)
            console.log('[handleOrderVintedLabel] Using simple order (no poll)');
            result = await client.orderShipmentLabel(transactionId, labelType, dropOffPointId, sellerAddressId);
        }
        return {
            success: !!result?.success,
            labelUrl: result?.labelUrl,
            trackingNumber: result?.trackingNumber,
            carrier: result?.carrier,
            rawData: result?.rawData,
            error: result?.error,
        };
    }
    catch (error) {
        console.error('[handleOrderVintedLabel] Error:', error);
        return withError(error);
    }
}
/**
 * Get existing shipping label URL for a shipment
 */
async function handleGetVintedLabel(message) {
    try {
        const params = message.params ?? {};
        // Support both shipmentId and transactionId for backwards compatibility
        const shipmentId = params.shipmentId ??
            message.shipmentId ??
            params.transactionId ??
            message.transactionId;
        const tld = params.tld ?? message.tld ?? 'co.uk';
        if (!shipmentId) {
            throw new Error('Shipment ID is required');
        }
        console.log(`[handleGetVintedLabel] Fetching label for shipment ${shipmentId}`);
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        // Get full shipment details including label URL, tracking, and carrier
        const details = await client.getShipmentLabelDetails(shipmentId);
        console.log(`[handleGetVintedLabel] Result:`, details);
        return {
            success: true,
            label: details,
            labelUrl: details.labelUrl,
            hasLabel: !!details.labelUrl,
            trackingNumber: details.trackingNumber,
            carrier: details.carrier,
        };
    }
    catch (error) {
        console.error('[handleGetVintedLabel] Error:', error);
        return withError(error);
    }
}
/**
 * Send a message via Vinted API
 * This forwards the request to the content script running on vinted.co.uk
 */
async function handleSendVintedMessage(message) {
    try {
        const params = message.params ?? {};
        const conversationId = params.conversationId ??
            message.conversationId;
        const messageText = params.message ??
            message.message;
        const tld = params.tld ?? message.tld ?? 'co.uk';
        if (!conversationId || !messageText) {
            throw new Error('Conversation ID and message are required');
        }
        console.log(`[handleSendVintedMessage] Sending message to conversation ${conversationId}`);
        // Find an existing Vinted tab, or open a hidden one if none exists
        let tabs = await chrome.tabs.query({ url: `*://*.vinted.${tld}/*` });
        let createdTab = false;
        if (!tabs || tabs.length === 0) {
            console.log('[handleSendVintedMessage] No Vinted tab found, opening hidden tab...');
            const newTab = await chrome.tabs.create({
                url: `https://www.vinted.${tld}`,
                active: false,
            });
            createdTab = true;
            // Wait for tab to fully load so content script injects
            await new Promise((resolve) => {
                const listener = (tabId, info) => {
                    if (tabId === newTab.id && info.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);
                setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }, 30000);
            });
            tabs = [newTab];
        }
        const tab = tabs[0];
        if (!tab.id) {
            throw new Error('Could not determine tab ID');
        }
        const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'SEND_VINTED_MESSAGE',
            conversationId,
            message: messageText,
        });
        // Clean up hidden tab if we created it
        if (createdTab && tab.id) {
            await chrome.tabs.remove(tab.id).catch(() => { });
        }
        if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to send message via content script');
        }
        console.log('[handleSendVintedMessage] Message sent successfully');
        return {
            success: true,
            data: response.data,
            conversationId,
        };
    }
    catch (error) {
        console.error('[handleSendVintedMessage] Error:', error);
        return withError(error);
    }
}
function normalizeCommand(message) {
    const raw = (message.action ??
        message.type ??
        message.command ??
        (typeof message === "object" ? message.name : undefined));
    return raw ? raw.toString().trim().toLowerCase() : "";
}
function resolveMarketplace(message) {
    const marketplace = message.marketPlace ??
        message.marketplace;
    if (!marketplace) {
        throw new Error("Marketplace is required");
    }
    return marketplace;
}
function resolveProduct(message) {
    const product = message.product ??
        message.productData ??
        message.payload ??
        message.data;
    if (!product) {
        throw new Error("Product payload is required");
    }
    return product;
}
function resolveSettings(message) {
    return (message.settings ??
        message.userSettings ??
        message.params?.userSettings);
}
function resolveTldFromMessage(message, marketplace) {
    const normalized = marketplace ? marketplace.toLowerCase() : "";
    const settings = resolveSettings(message) ?? {};
    return (message.tld ??
        message.marketplaceTld ??
        message[`${normalized}Tld`] ??
        settings[`${normalized}Tld`]);
}
async function handleImportToWrenlist(message, _sender) {
    try {
        const marketplace = message.marketplace;
        if (!marketplace) {
            throw new Error("Marketplace is required");
        }
        const productData = message.productData;
        if (!productData) {
            throw new Error("Product data missing from request");
        }
        const baseUrl = await getWrenlistBaseUrl(message.wrenlistBaseUrl);
        const isVinted = marketplace.toLowerCase() === "vinted";
        const endpoint = isVinted ? "/api/import/vinted-item" : "/api/import/marketplace-item";
        const productRecord = productData;
        const payload = isVinted
            ? { vintedItem: productData }
            : {
                marketplace,
                marketplaceProductId: message.productId ?? productRecord.id ?? "",
                productData,
                url: message.url ?? productRecord.marketplace_url ?? null,
            };
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-Extension-Version": EXTENSION_VERSION,
            },
            body: JSON.stringify(payload),
        });
        const data = await safeJson(response);
        if (!response.ok) {
            const errorMessage = data?.error ||
                (response.status === 401
                    ? "Please log in to Wrenlist and try again."
                    : `Import failed (${response.status})`);
            const result = {
                success: false,
                error: errorMessage,
                needsLogin: response.status === 401,
                extensionVersion: EXTENSION_VERSION,
            };
            if (response.status === 401) {
                await openTab(`${baseUrl}/login`, true).catch(() => undefined);
            }
            return result;
        }
        const settings = await getSyncStorage([
            "autoOpenWrenlist",
            "showNotifications",
        ]);
        const productId = data?.productId ?? data?.id;
        if ((settings.autoOpenWrenlist ?? true) && productId) {
            await openWrenlistProduct(baseUrl, productId);
        }
        if (settings.showNotifications !== false) {
            const productTitle = productRecord.title ??
                productRecord.name ??
                "Import completed";
            showImportNotification(productId
                ? `Imported to Wrenlist`
                : `Import from ${marketplace} completed`, productTitle, productId ? `${baseUrl}/dashboard/products/${productId}` : undefined);
        }
        return {
            success: true,
            productId,
            message: data?.message || "Imported successfully",
            extensionVersion: EXTENSION_VERSION,
        };
    }
    catch (error) {
        const normalized = normalizeError(error);
        return {
            success: false,
            error: normalized.message,
            internalErrors: normalized.internalErrors,
            extensionVersion: EXTENSION_VERSION,
        };
    }
}
async function handleBatchImportVinted(message) {
    try {
        const limit = resolvePositiveInteger(message.limit ??
            message.max, 50, 200);
        const status = message.status?.toLowerCase() ?? "active";
        if (status !== "active") {
            return withExtensionVersion({
                success: false,
                message: "Only active Vinted listings can be imported right now.",
            });
        }
        const baseUrl = await getWrenlistBaseUrl(message.wrenlistBaseUrl);
        const tld = resolveTldFromMessage(message, "vinted") ?? "com";
        const { client } = createVintedServices({ tld });
        await client.bootstrap();
        // Check if specific listing IDs are provided
        const listingIds = message.listingIds;
        let listings;
        if (listingIds && Array.isArray(listingIds) && listingIds.length > 0) {
            // Fetch only the specified listings
            console.log(`[Batch Import] Fetching ${listingIds.length} specific listings by ID`);
            listings = await collectVintedListingsByIds(client, listingIds, status, tld);
            if (!listings.length) {
                return withExtensionVersion({
                    success: false,
                    message: "Failed to fetch the specified Vinted listings. Please ensure you are logged in to Vinted.",
                    needsLogin: true,
                });
            }
        }
        else {
            // Fall back to fetching all listings (original behavior)
            const loggedIn = await client.checkLogin();
            if (!loggedIn) {
                return withExtensionVersion({
                    success: false,
                    message: "Please log in to your Vinted account and try again.",
                    needsLogin: true,
                });
            }
            // Fetch all statuses: active (listed), sold, hidden (draft)
            const [activeListings, soldListings, hiddenListings] = await Promise.allSettled([
                collectVintedListings(client, limit, "active", tld),
                collectVintedListings(client, Math.min(limit, 100), "sold", tld),
                collectVintedListings(client, Math.min(limit, 100), "hidden", tld),
            ]);
            listings = [
                ...(activeListings.status === "fulfilled" ? activeListings.value : []),
                ...(soldListings.status === "fulfilled" ? soldListings.value : []),
                ...(hiddenListings.status === "fulfilled" ? hiddenListings.value : []),
            ];
            if (!listings.length) {
                return withExtensionVersion({
                    success: false,
                    message: "No Vinted listings available to import.",
                });
            }
        }
        const response = await fetch(`${baseUrl}/api/import/vinted-batch/process`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-Extension-Version": EXTENSION_VERSION,
            },
            body: JSON.stringify({ listings }),
        });
        const data = await safeJson(response);
        if (!response.ok) {
            const errorMessage = data?.error ||
                (response.status === 401
                    ? "Please log in to Wrenlist and try again."
                    : `Batch import failed (${response.status}).`);
            const result = {
                success: false,
                message: errorMessage,
                needsLogin: response.status === 401,
                internalErrors: data?.details,
            };
            if (response.status === 401) {
                await openTab(`${baseUrl}/login`, true).catch(() => undefined);
            }
            return withExtensionVersion(result);
        }
        // --- Photo mirror phase: fetch CDN URLs with cookies and upload to Wrenlist ---
        console.log("[Batch Import] Starting photo mirror phase...");
        const photoUploadErrors = [];
        const PHOTO_BATCH_SIZE = 5;
        for (let i = 0; i < listings.length; i += PHOTO_BATCH_SIZE) {
            const batch = listings.slice(i, i + PHOTO_BATCH_SIZE);
            await Promise.allSettled(batch.map(async (listing) => {
                try {
                    // Look up the find by Vinted listing ID to get the find ID
                    const findRes = await fetch(`${baseUrl}/api/import/find-by-vinted-id?listingId=${listing.id}`, {
                        credentials: "include",
                    });
                    if (!findRes.ok)
                        return;
                    const findData = await safeJson(findRes);
                    const findId = findData?.data?.findId;
                    if (!findId)
                        return;
                    // Get photos from vintedMetadata or listing.photos
                    const photoUrls = listing.vintedMetadata?.photos
                        ?.map((p) => p.full_size_url || p.url)
                        .filter(Boolean) || listing.photos?.slice(0, 5) || [];
                    if (!photoUrls.length)
                        return;
                    // Fetch each photo and convert to base64
                    const photoData = [];
                    for (let j = 0; j < Math.min(photoUrls.length, 5); j++) {
                        try {
                            const imgRes = await fetch(photoUrls[j], { credentials: "include" });
                            if (!imgRes.ok)
                                continue;
                            const buffer = await imgRes.arrayBuffer();
                            const bytes = new Uint8Array(buffer);
                            let binary = "";
                            for (let k = 0; k < bytes.byteLength; k++) {
                                binary += String.fromCharCode(bytes[k]);
                            }
                            const base64 = btoa(binary);
                            const ext = photoUrls[j]
                                .split(".")
                                .pop()
                                ?.split("?")[0]
                                ?.toLowerCase() || "jpg";
                            photoData.push({ data: base64, ext, index: j });
                        }
                        catch {
                            // Skip failed photos
                        }
                    }
                    if (!photoData.length)
                        return;
                    // Upload to Wrenlist
                    const uploadRes = await fetch(`${baseUrl}/api/finds/${findId}/photos`, {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ photos: photoData }),
                    });
                    if (!uploadRes.ok) {
                        photoUploadErrors.push(`Failed to upload photos for listing ${listing.id}`);
                    }
                }
                catch (error) {
                    photoUploadErrors.push(`Error processing photos for listing ${listing.id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }));
        }
        if (photoUploadErrors.length > 0) {
            console.warn("[Batch Import] Photo upload errors:", photoUploadErrors);
        }
        return withExtensionVersion({
            success: true,
            message: data?.message ?? `Imported ${data?.results?.success ?? listings.length} items.`,
            results: data?.results ?? null,
            photoUploadWarnings: photoUploadErrors.length > 0 ? photoUploadErrors : undefined,
        });
    }
    catch (error) {
        const normalized = normalizeError(error);
        return withExtensionVersion({
            success: false,
            message: normalized.message,
            internalErrors: normalized.internalErrors,
        });
    }
}
async function handleSyncVintedStatus(message) {
    try {
        console.log("[Vinted Sync] Starting status sync...");
        const data = message.data ?? message;
        const products = data.products ?? [];
        const isAutoSync = data.isAutoSync ?? false;
        if (products.length === 0) {
            return withExtensionVersion({
                success: true,
                updates: [],
                changes: [],
                stats: { checked: 0, updated: 0, unchanged: 0, failed: 0 },
                message: "No products to sync",
            });
        }
        console.log(`[Vinted Sync] Syncing ${products.length} products (auto: ${isAutoSync})`);
        // Create Vinted client and bootstrap
        const tld = data.domain?.replace("vinted.", "") ?? "co.uk";
        const { client } = createVintedServices({ tld });
        try {
            await client.bootstrap();
        }
        catch (bootstrapError) {
            console.error("[Vinted Sync] Bootstrap failed:", bootstrapError);
            return withExtensionVersion({
                success: false,
                error: "Please log in to Vinted and try again.",
                stats: { checked: 0, updated: 0, unchanged: 0, failed: products.length },
            });
        }
        // Fetch all items from wardrobe (active, sold, hidden)
        const vintedItemsMap = new Map();
        const apiUrl = `https://www.vinted.${tld}/api/v2`;
        const username = client.getUsername();
        if (!username) {
            console.error("[Vinted Sync] No username available");
            return withExtensionVersion({
                success: false,
                error: "Could not determine Vinted user. Please refresh Vinted and try again.",
                stats: { checked: 0, updated: 0, unchanged: 0, failed: products.length },
            });
        }
        console.log(`[Vinted Sync] Fetching items for user ${username}...`);
        // Fetch each status type
        for (const cond of ["active", "sold", "hidden"]) {
            const url = cond === "active"
                ? `${apiUrl}/wardrobe/${username}/items?page=1&per_page=200&order=relevance`
                : `${apiUrl}/wardrobe/${username}/items?page=1&per_page=200&cond=${cond}&order=relevance`;
            try {
                const response = await fetch(url, {
                    headers: {
                        Accept: "application/json, text/plain, */*",
                        "X-Csrf-Token": client.getCsrfToken(),
                        "X-Anon-Id": client.getAnonId(),
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                });
                if (response.ok) {
                    const body = await response.json();
                    if (body?.items) {
                        body.items.forEach((item) => {
                            vintedItemsMap.set(item.id.toString(), {
                                item,
                                status: cond,
                            });
                        });
                        console.log(`[Vinted Sync] Fetched ${body.items.length} ${cond} items`);
                    }
                }
                else {
                    console.warn(`[Vinted Sync] Failed to fetch ${cond} items: ${response.status}`);
                }
            }
            catch (fetchError) {
                console.warn(`[Vinted Sync] Error fetching ${cond} items:`, fetchError);
            }
        }
        console.log(`[Vinted Sync] Total Vinted items: ${vintedItemsMap.size}`);
        // Match products with Vinted items
        const updates = [];
        const changes = [];
        let checked = 0;
        let updated = 0;
        let unchanged = 0;
        let failed = 0;
        for (const product of products) {
            const vintedId = product.vinted_product_id?.toString();
            if (!vintedId) {
                failed++;
                continue;
            }
            checked++;
            const vintedData = vintedItemsMap.get(vintedId);
            const oldStatus = product.vinted_status || "active";
            if (!vintedData) {
                // Item not found - mark as hidden/deleted
                const newStatus = "hidden";
                if (oldStatus !== newStatus) {
                    updated++;
                    updates.push({
                        product_id: product.id,
                        vinted_product_id: vintedId,
                        vinted_status: newStatus,
                        last_synced_at: new Date().toISOString(),
                    });
                    changes.push({
                        product_id: product.id,
                        title: product.title,
                        oldStatus,
                        newStatus,
                    });
                }
                else {
                    unchanged++;
                }
            }
            else {
                // Item found - check if status changed
                const newStatus = vintedData.status;
                const item = vintedData.item;
                if (oldStatus !== newStatus) {
                    updated++;
                    updates.push({
                        product_id: product.id,
                        vinted_product_id: vintedId,
                        vinted_status: newStatus,
                        last_synced_at: new Date().toISOString(),
                        price: item.price ? parseFloat(item.price) : undefined,
                        favourites: item.favourite_count,
                        views: item.view_count,
                    });
                    changes.push({
                        product_id: product.id,
                        title: product.title || item.title,
                        oldStatus,
                        newStatus,
                    });
                }
                else {
                    unchanged++;
                    // Still update sync timestamp
                    updates.push({
                        product_id: product.id,
                        vinted_product_id: vintedId,
                        vinted_status: newStatus,
                        last_synced_at: new Date().toISOString(),
                        price: item.price ? parseFloat(item.price) : undefined,
                        favourites: item.favourite_count,
                        views: item.view_count,
                    });
                }
            }
        }
        console.log(`[Vinted Sync] Complete: ${checked} checked, ${updated} updated, ${unchanged} unchanged, ${failed} failed`);
        return withExtensionVersion({
            success: true,
            updates,
            changes,
            stats: { checked, updated, unchanged, failed },
            isAutoSync,
        });
    }
    catch (error) {
        console.error("[Vinted Sync] Error:", error);
        const normalized = normalizeError(error);
        return withExtensionVersion({
            success: false,
            error: normalized.message,
            stats: { checked: 0, updated: 0, unchanged: 0, failed: 0 },
        });
    }
}
async function handleDetectShopifyStore() {
    try {
        // Look for open Shopify admin tabs: admin.shopify.com/store/{slug}
        const tabs = await chrome.tabs.query({ url: '*://admin.shopify.com/store/*' });
        if (tabs.length > 0) {
            const url = tabs[0].url ?? '';
            const match = url.match(/admin\.shopify\.com\/store\/([^/?#]+)/);
            const slug = match?.[1] ?? null;
            if (slug) {
                return { success: true, detected: true, shopSlug: slug };
            }
        }
        // Also check old-style mystore.myshopify.com/admin tabs
        const legacyTabs = await chrome.tabs.query({ url: '*://*.myshopify.com/admin*' });
        if (legacyTabs.length > 0) {
            const url = legacyTabs[0].url ?? '';
            const match = url.match(/https?:\/\/([^.]+)\.myshopify\.com/);
            const slug = match?.[1] ?? null;
            if (slug) {
                return { success: true, detected: true, shopSlug: slug };
            }
        }
        return { success: true, detected: false, shopSlug: null };
    }
    catch (error) {
        return { success: false, detected: false, shopSlug: null, error: String(error) };
    }
}
async function openTab(url, focusTab = false) {
    if (!url) {
        throw new Error("URL is required");
    }
    return new Promise((resolve, reject) => {
        chrome.tabs.create({
            url,
            active: Boolean(focusTab),
        }, (tab) => {
            const error = chrome.runtime.lastError;
            if (error) {
                reject(error);
                return;
            }
            resolve(tab);
        });
    });
}
function withExtensionVersion(result) {
    return {
        ...result,
        extensionVersion: EXTENSION_VERSION,
    };
}
function withError(error) {
    const normalized = normalizeError(error);
    return withExtensionVersion({
        success: false,
        message: normalized.message,
        internalErrors: normalized.internalErrors,
    });
}
async function getWrenlistBaseUrl(override) {
    if (override && override.startsWith("http")) {
        return override.replace(/\/+$/, "");
    }
    const storage = await getSyncStorage(["wrenlistApiBase"]);
    const fromStorage = storage.wrenlistApiBase;
    if (fromStorage && fromStorage.startsWith("http")) {
        return fromStorage.replace(/\/+$/, "");
    }
    return DEFAULT_WRENLIST_BASE_URL;
}
function getSyncStorage(keys) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, (items) => {
            resolve(items);
        });
    });
}
function showImportNotification(title, message, url) {
    if (!chrome.notifications?.create) {
        return;
    }
    chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL(ICON_PATH),
        title,
        message,
        priority: 1,
        eventTime: Date.now(),
    }, (notificationId) => {
        if (url) {
            chrome.notifications.onClicked.addListener(function handleClick(id) {
                if (id === notificationId) {
                    chrome.notifications.onClicked.removeListener(handleClick);
                    void openTab(url, true);
                }
            });
        }
    });
}
async function openWrenlistProduct(baseUrl, productId) {
    const productUrl = `${baseUrl.replace(/\/+$/, "")}/dashboard/products/${productId}`;
    await openTab(productUrl, true);
}
async function safeJson(response) {
    try {
        return await response.json();
    }
    catch {
        return null;
    }
}
async function collectVintedListings(client, limit, status, tld) {
    const listings = [];
    let nextPage = "1";
    while (listings.length < limit && nextPage) {
        const remaining = limit - listings.length;
        const perPage = Math.min(Math.max(remaining, 1), 96);
        const pageResult = await client.getListings(nextPage, perPage);
        const products = pageResult.products ?? [];
        if (!products.length) {
            break;
        }
        for (const product of products) {
            if (listings.length >= limit) {
                break;
            }
            try {
                const detail = await client.getListing(product.marketplaceId);
                if (!detail)
                    continue;
                const listing = mapProductToBatch(detail, product.marketplaceUrl ?? client.getProductUrl(product.marketplaceId), status, tld);
                listings.push(listing);
            }
            catch (error) {
                console.warn(`[Batch Import] Failed to fetch Vinted listing ${product.marketplaceId}`, error);
            }
        }
        nextPage = pageResult.nextPage;
    }
    return listings;
}
async function collectVintedListingsByIds(client, listingIds, status, tld) {
    const listings = [];
    for (const id of listingIds) {
        try {
            const idString = String(id);
            const detail = await client.getListing(idString);
            if (!detail) {
                console.warn(`[Batch Import] Listing ${idString} not found or inaccessible`);
                continue;
            }
            const listing = mapProductToBatch(detail, client.getProductUrl(idString), status, tld);
            listings.push(listing);
        }
        catch (error) {
            console.warn(`[Batch Import] Failed to fetch Vinted listing ${id}`, error);
            // Continue with other listings even if one fails
        }
    }
    return listings;
}
const VINTED_TLD_CURRENCY_MAP = {
    "co.uk": "GBP",
    fr: "EUR",
    de: "EUR",
    es: "EUR",
    it: "EUR",
    nl: "EUR",
    be: "EUR",
    lt: "EUR",
    cz: "CZK",
    pl: "PLN",
    ca: "CAD",
    com: "USD",
};
function mapProductToBatch(product, url, status, tld) {
    const id = (product.marketplaceId ?? product.marketPlaceId ?? product.id)?.toString() ?? crypto.randomUUID();
    const price = typeof product.price === "number"
        ? product.price
        : Number.parseFloat(product.price ? String(product.price) : "0");
    const photos = Array.isArray(product.images)
        ? product.images.filter((photo) => Boolean(photo))
        : [];
    const sizeValue = Array.isArray(product.size)
        ? product.size[0]
        : typeof product.size === "string"
            ? product.size
            : null;
    const currency = product.dynamicProperties?.currency ?? getCurrencyForTld(tld);
    // Extract photo thumbnails if available from vintedMetadata
    const photoThumbnails = product.vintedMetadata?.photos
        ?.map((p) => p.thumbnail_url)
        .filter((url) => Boolean(url));
    return {
        id,
        title: product.title ?? "Untitled Item",
        description: product.description ?? "",
        price: Number.isFinite(price) ? price : 0,
        currency,
        photos,
        condition: mapConditionToWrenlist(product.condition),
        brand: product.brand ?? null,
        size: sizeValue,
        color: product.color ?? product.color2 ?? null,
        category: product.category?.[0] ?? null,
        url,
        status,
        // Cross-marketplace fields
        originalPrice: product.originalPrice,
        acceptOffers: product.acceptOffers,
        tags: product.tags,
        sku: product.sku,
        quantity: product.quantity ?? 1,
        // Full Vinted metadata passthrough
        vintedMetadata: product.vintedMetadata,
        // Thumbnails for faster UI
        photoThumbnails: photoThumbnails?.length ? photoThumbnails : undefined,
    };
}
async function handleFetchVintedApi(message) {
    const url = message.url;
    const method = message.method ?? "GET";
    // Validate URL
    if (!url) {
        throw new Error("URL is required");
    }
    if (!url.startsWith("https://www.vinted.")) {
        throw new Error("Only Vinted URLs (https://www.vinted.*) are allowed");
    }
    // Only allow GET requests (read-only)
    if (method.toUpperCase() !== "GET") {
        throw new Error("Only GET requests are allowed");
    }
    try {
        const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            return withExtensionVersion({
                success: false,
                error: errorText || "Request failed",
                results: { status: response.status },
            });
        }
        const data = await response.json();
        return withExtensionVersion({
            success: true,
            results: data,
        });
    }
    catch (error) {
        return withExtensionVersion({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
async function handleFetchWrenlistApi(message) {
    const url = message.url;
    const method = message.method ?? "GET";
    // Validate URL
    if (!url) {
        throw new Error("URL is required");
    }
    if (!url.startsWith("https://app.wrenlist.com/api/")) {
        throw new Error("Only Wrenlist API URLs (https://app.wrenlist.com/api/*) are allowed");
    }
    // Only allow GET requests (read-only)
    if (method.toUpperCase() !== "GET") {
        throw new Error("Only GET requests are allowed");
    }
    try {
        const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            return withExtensionVersion({
                success: false,
                error: errorText || "Request failed",
                results: { status: response.status },
            });
        }
        const data = await response.json();
        return withExtensionVersion({
            success: true,
            results: data,
        });
    }
    catch (error) {
        return withExtensionVersion({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
function mapConditionToWrenlist(condition) {
    switch (condition) {
        case Condition.NewWithTags:
        case Condition.NewWithoutTags:
            return "new";
        case Condition.VeryGood:
            return "like_new";
        case Condition.Good:
            return "good";
        case Condition.Fair:
            return "fair";
        case Condition.Poor:
            return "poor";
        default:
            return "good";
    }
}
function getCurrencyForTld(tld) {
    return VINTED_TLD_CURRENCY_MAP[tld] ?? "USD";
}
function resolvePositiveInteger(value, fallback, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.min(Math.trunc(parsed), max);
}
async function handleVintedDebugInfo() {
    try {
        const allCookies = await chrome.cookies.getAll({});
        const vintedCookies = allCookies.filter(c => c.domain.includes("vinted"));
        const tldCookie = vintedCookies.find(c => c.name === "v_uid" || c.name === "_vinted_session");
        const domain = tldCookie?.domain ?? "";
        const tld = domain.includes("co.uk") ? "co.uk" : domain.includes("vinted.") ? domain.replace(/^.*?vinted\./, "") : "unknown";
        return {
            success: true,
            cookiesFound: vintedCookies.length > 0,
            tld,
            version: EXTENSION_VERSION,
            lastError: null,
        };
    }
    catch (e) {
        return { success: false, lastError: e instanceof Error ? e.message : String(e) };
    }
}
