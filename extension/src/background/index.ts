import type { CrosslistProduct, VintedImportMetadata } from "./types.js";
import { EXTENSION_VERSION } from "./shared/crosslistApi.js";
import {
  delistFromMarketplace,
  publishToMarketplace,
} from "./orchestrator/publisher.js";
import {
  checkMarketplaceLogin,
  fetchMarketplaceListing,
  fetchMarketplaceListings,
  updateMarketplaceListing,
} from "./orchestrator/marketplaceActions.js";
import type { ListingActionResult, SupportedMarketplace } from "./orchestrator/types.js";
import { normalizeError } from "./orchestrator/utils.js";
import { createVintedServices } from "./marketplaces/vinted/index.js";
import type { VintedClient } from "./marketplaces/vinted/client.js";
import { Condition } from "./shared/enums.js";
import { ShopifyClient } from "./marketplaces/shopify/client.js";
import { ShopifyMapper } from "./marketplaces/shopify/mapper.js";

const KEEP_ALIVE_INTERVAL_MS = 20_000;
const DEFAULT_WRENLIST_BASE_URL = "https://wrenlist.com";
const ICON_PATH = "icons/icon128.png";

type ExternalMessage = Record<string, unknown>;

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
    if (alarm.name !== SESSION_CHECK_ALARM) return;

    console.log("[SessionHealth] Running periodic marketplace session check...");

    const marketplaces: SupportedMarketplace[] = [
      "vinted",
      "poshmark",
      "depop",
      "mercari",
      "grailed",
      "facebook",
      "whatnot",
      "etsy",
    ];

    const results: Record<string, boolean> = {};

    for (const mp of marketplaces) {
      try {
        results[mp] = await checkMarketplaceLogin(mp);
      } catch {
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
            .catch(() => {});
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
    if (alarm.name !== QUEUE_POLL_ALARM) return;

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
          const mp = item.marketplace as SupportedMarketplace;
          const find = item.find;
          if (!find) continue;

          console.log(`[QueuePoll] Publishing ${find.name} to ${mp}...`);

          // Build CrosslistProduct from find data
          const product: CrosslistProduct = {
            id: find.id,
            marketPlaceId: find.id,
            title: find.name ?? "Untitled",
            description: find.description ?? "",
            price: find.asking_price_gbp ?? 0,
            images: find.photos ?? [],
            brand: find.brand ?? undefined,
            condition: Condition.Good,
            category: [],
            tags: "",
            shipping: { shippingWeight: undefined },
            dynamicProperties: {},
          };

          const result = await publishToMarketplace(mp, product);

          // Report back to Wrenlist API
          try {
            await fetch(`${baseUrl}/api/marketplace/publish-queue`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                find_id: item.find_id,
                marketplace: mp,
                platform_listing_id: result.product?.id ? String(result.product.id) : null,
                platform_listing_url: result.product?.url ?? null,
              }),
            });
          } catch (e) {
            console.warn("[QueuePoll] Failed to report publish result:", e);
          }

          if (result.success) {
            console.log(`[QueuePoll] Published ${find.name} to ${mp}`);
          } else {
            console.warn(`[QueuePoll] Failed to publish ${find.name} to ${mp}:`, result.message);
          }
        }
      }
    } catch (e) {
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
          const mp = item.marketplace as SupportedMarketplace;
          const listingId = item.platform_listing_id;
          if (!listingId) continue;

          console.log(`[QueuePoll] Delisting ${listingId} from ${mp}...`);

          const result = await delistFromMarketplace(mp, listingId);

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
          } catch (e) {
            console.warn("[QueuePoll] Failed to report delist result:", e);
          }

          if (result.success) {
            console.log(`[QueuePoll] Delisted ${listingId} from ${mp}`);
          } else {
            console.warn(`[QueuePoll] Failed to delist ${listingId} from ${mp}:`, result.message);
          }
        }
      }
    } catch (e) {
      console.debug("[QueuePoll] Delist queue poll failed:", e);
    }
  });

  chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (!message || (!("action" in message) && !("type" in message))) {
      sendResponse(withError("Unknown action"));
      return false;
    }

    void dispatchExternalMessage(message as ExternalMessage)
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
      default:
        return false;
    }
  });

  chrome.runtime.onUpdateAvailable.addListener(() => chrome.runtime.reload());
})();

async function dispatchExternalMessage(message: ExternalMessage) {
  const command = normalizeCommand(message);

  switch (command) {
    case "postlistingtomarketplace":
    case "publishtomarketplace":
    case "publish_to_marketplace":
      return handlePublishCommand(message);
    case "crosslist_to_shopify":
      return handleCrosslistToShopify(message);
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
    case "fetch_crosslist_api":
    case "fetchcrosslistapi":
      return handleFetchCrosslistApi(message);
    default:
      throw new Error(`Unsupported action: ${String(message.action ?? message.type ?? "unknown")}`);
  }
}

async function handlePublishCommand(message: ExternalMessage) {
  const marketplace = resolveMarketplace(message);
  const product = resolveProduct(message);
  return withExtensionVersion(
    await publishToMarketplace(marketplace, product, {
      settings: resolveSettings(message),
      tld: resolveTldFromMessage(message, marketplace),
    }),
  );
}

async function handleUpdateCommand(message: ExternalMessage) {
  const marketplace = resolveMarketplace(message);
  const product = resolveProduct(message);
  return withExtensionVersion(
    await updateMarketplaceListing(marketplace, product, {
      settings: resolveSettings(message),
      tld: resolveTldFromMessage(message, marketplace),
    }),
  );
}

async function handleDelistCommand(message: ExternalMessage) {
  const marketplace = resolveMarketplace(message);
  const listingId =
    (message.productId as string | undefined) ??
    (message.listingId as string | undefined) ??
    (message.marketplaceId as string | undefined);
  if (!listingId) {
    throw new Error("Missing listing id");
  }

  return withExtensionVersion(
    await delistFromMarketplace(marketplace, listingId, {
      settings: resolveSettings(message),
      tld: resolveTldFromMessage(message, marketplace),
    }),
  );
}

async function handleCrosslistToShopify(message: ExternalMessage) {
  try {
    const productId = (message.productId as string | undefined);
    const shopId = (message.shopId as string | undefined);

    if (!productId) {
      throw new Error("Product ID is required");
    }

    if (!shopId) {
      throw new Error("Shopify store URL is required. Please set it in Marketplaces.");
    }

    // Fetch product payload from Wrenlist API
    const baseUrl = await getWrenlistBaseUrl((message as any).wrenlistBaseUrl);
    const payloadResponse = await fetch(
      `${baseUrl}/api/chrome-extension/shopify/product-payload/${productId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (payloadResponse.status === 401) {
      throw new Error("Please log in to Wrenlist first");
    }

    if (payloadResponse.status === 404) {
      throw new Error("Product not found");
    }

    if (!payloadResponse.ok) {
      const errorText = await payloadResponse.text();
      console.error("[Shopify] Payload fetch failed:", payloadResponse.status, errorText);
      throw new Error(
        `Failed to fetch product: ${payloadResponse.status}`
      );
    }

    const payloadData = await payloadResponse.json();
    if (!payloadData.success) {
      throw new Error(
        payloadData.error || "Failed to fetch product payload"
      );
    }

    // Create Shopify client
    const shopifyClient = new ShopifyClient(shopId);
    await shopifyClient.bootstrap();

    // Create mapper and map product
    const mapper = new ShopifyMapper({
      uploadImages: (files) => shopifyClient.uploadImages(files),
      getLocationId: () => shopifyClient.getLocationId(),
    });

    // Build CrosslistProduct from payload
    const crosslistProduct: CrosslistProduct = {
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
    const shopifyPayload = await mapper.map(crosslistProduct);

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
    } else {
      return withExtensionVersion({
        success: false,
        message: result.message || "Failed to publish to Shopify",
        internalErrors: result.internalErrors,
      });
    }
  } catch (error) {
    const normalized = normalizeError(error);
    return withExtensionVersion({
      success: false,
      message: normalized.message,
      internalErrors: normalized.internalErrors,
    });
  }
}

async function handleCheckLoginCommand(message: ExternalMessage) {
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
    const vUidCookie = allCookies.find(c => 
      c.domain.includes('vinted') && c.name === "v_uid"
    );
    
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
      
      return {
        success: true,
        loggedIn: isLoggedIn,
        username: isLoggedIn ? username : undefined,
        tld,
        extensionVersion: EXTENSION_VERSION,
      };
    } catch (bootstrapError) {
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
  } catch (error) {
    console.error("[Vinted] Session check error:", error);
    return {
      success: false,
      loggedIn: false,
      error: error instanceof Error ? error.message : "Unknown error",
      extensionVersion: EXTENSION_VERSION,
    };
  }
}

async function handleGetListings(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const rawMarketplace =
      (params.marketplace as string | undefined) ??
      (message.marketplace as string | undefined);

    if (!rawMarketplace) {
      throw new Error("Marketplace is required");
    }

    const marketplace = rawMarketplace as SupportedMarketplace;

    return await fetchMarketplaceListings({
      marketplace,
      page: (params.page as string | undefined) ?? (message.page as string | undefined),
      perPage:
        (params.nbPerPage as number | undefined) ??
        (params.perPage as number | undefined) ??
        (message.nbPerPage as number | undefined) ??
        (message.perPage as number | undefined),
      username:
        (params.username as string | number | null | undefined) ??
        (message.username as string | number | null | undefined),
      settings: (params.userSettings as Record<string, unknown>) ?? resolveSettings(message),
      tld: (params.tld as string | undefined) ?? resolveTldFromMessage(message, marketplace),
    });
  } catch (error) {
    return withError(error);
  }
}

async function handleGetListing(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const rawMarketplace =
      (params.marketplace as string | undefined) ??
      (message.marketplace as string | undefined);
    const id =
      (params.id as string | undefined) ??
      (message.id as string | undefined) ??
      (message.productId as string | undefined);

    if (!rawMarketplace || !id) {
      throw new Error("Marketplace and id are required");
    }

    const marketplace = rawMarketplace as SupportedMarketplace;

    return await fetchMarketplaceListing({
      marketplace,
      id,
      settings: (params.userSettings as Record<string, unknown>) ?? resolveSettings(message),
      tld: (params.tld as string | undefined) ?? resolveTldFromMessage(message, marketplace),
    });
  } catch (error) {
    return withError(error);
  }
}

/**
 * Fetch sales/transactions from Vinted
 * Supports incremental sync via stopAtId parameter
 */
async function handleGetVintedSales(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const page = (params.page as number | undefined) ?? (message.page as number | undefined) ?? 1;
    const perPage = (params.perPage as number | undefined) ?? (message.perPage as number | undefined) ?? 20;
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';
    // stopAtId: For incremental sync - stop fetching when this order ID is encountered
    const stopAtId = (params.stopAtId as string | undefined) ?? (message.stopAtId as string | undefined);

    const { client } = createVintedServices({ tld });
    await client.bootstrap();

    const result = await client.getSales(page, perPage, stopAtId);

    return {
      success: true,
      sales: result.sales,
      pagination: result.pagination,
      stoppedEarly: result.stoppedEarly || false,
    };
  } catch (error) {
    console.error('[handleGetVintedSales] Error:', error);
    return withError(error);
  }
}

/**
 * Get details for a specific Vinted order/transaction
 */
async function handleGetVintedOrder(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const transactionId = 
      (params.transactionId as string | undefined) ?? 
      (params.orderId as string | undefined) ??
      (message.transactionId as string | undefined) ??
      (message.orderId as string | undefined);
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';

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
  } catch (error) {
    console.error('[handleGetVintedOrder] Error:', error);
    return withError(error);
  }
}

async function handleGetVintedConversationItems(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const conversationId =
      (params.conversationId as string | undefined) ??
      (message.conversationId as string | undefined);
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';

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
  } catch (error) {
    console.error('[handleGetVintedConversationItems] Error:', error);
    return withError(error);
  }
}

/**
 * Fetch conversation messages for display in Wrenlist order cards
 */
async function handleGetVintedConversationMessages(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const conversationId =
      (params.conversationId as string | undefined) ??
      (message.conversationId as string | undefined);
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';

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
  } catch (error) {
    console.error('[handleGetVintedConversationMessages] Error:', error);
    return withError(error);
  }
}

/**
 * Get shipment details including shipping address
 */
async function handleGetVintedShipmentDetails(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const shipmentId =
      (params.shipmentId as string | undefined) ??
      (message.shipmentId as string | undefined);
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';

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
  } catch (error) {
    console.error('[handleGetVintedShipmentDetails] Error:', error);
    return withError(error);
  }
}

/**
 * Get shipping label options for a Vinted shipment
 */
async function handleGetVintedLabelOptions(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const shipmentId =
      (params.shipmentId as string | undefined) ??
      (message.shipmentId as string | undefined);
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';

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
  } catch (error) {
    console.error('[handleGetVintedLabelOptions] Error:', error);
    return withError(error);
  }
}

/**
 * Get nearby drop-off points for shipping
 */
async function handleGetVintedDropOffPoints(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const shipmentId =
      (params.shipmentId as string | undefined) ??
      (message.shipmentId as string | undefined);
    const labelType = (params.labelType as string | undefined) ?? 'printable';
    const latitude = params.latitude as number | undefined;
    const longitude = params.longitude as number | undefined;
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';

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
  } catch (error) {
    console.error('[handleGetVintedDropOffPoints] Error:', error);
    return withError(error);
  }
}

/**
 * Generate/order a shipping label for a Vinted transaction
 * Now includes polling to wait for the label URL to be ready
 */
async function handleOrderVintedLabel(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const transactionId =
      (params.transactionId as string | undefined) ??
      (message.transactionId as string | undefined);
    const shipmentId =
      (params.shipmentId as string | undefined) ??
      (message.shipmentId as string | undefined);
    const labelType = (params.labelType as string | undefined) ?? 'printable';
    const dropOffPointId = params.dropOffPointId as string | undefined;
    const sellerAddressId = params.sellerAddressId as string | undefined;
    const usePoll = (params.poll as boolean | undefined) ?? true; // Default to polling
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';

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
    } else {
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
  } catch (error) {
    console.error('[handleOrderVintedLabel] Error:', error);
    return withError(error);
  }
}

/**
 * Get existing shipping label URL for a shipment
 */
async function handleGetVintedLabel(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    // Support both shipmentId and transactionId for backwards compatibility
    const shipmentId =
      (params.shipmentId as string | undefined) ??
      (message.shipmentId as string | undefined) ??
      (params.transactionId as string | undefined) ??
      (message.transactionId as string | undefined);
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';

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
  } catch (error) {
    console.error('[handleGetVintedLabel] Error:', error);
    return withError(error);
  }
}

/**
 * Send a message via Vinted API
 * This forwards the request to the content script running on vinted.co.uk
 */
async function handleSendVintedMessage(message: ExternalMessage) {
  try {
    const params = (message.params as Record<string, unknown>) ?? {};
    const conversationId = 
      (params.conversationId as string | undefined) ?? 
      (message.conversationId as string | undefined);
    const messageText = 
      (params.message as string | undefined) ?? 
      (message.message as string | undefined);
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';

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
      await new Promise<void>((resolve) => {
        const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
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
      await chrome.tabs.remove(tab.id).catch(() => {});
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
  } catch (error) {
    console.error('[handleSendVintedMessage] Error:', error);
    return withError(error);
  }
}

function normalizeCommand(message: ExternalMessage): string {
  const raw = (message.action ??
    message.type ??
    message.command ??
    (typeof message === "object" ? (message as { name?: string }).name : undefined)) as string | undefined;
  return raw ? raw.toString().trim().toLowerCase() : "";
}

function resolveMarketplace(message: ExternalMessage): SupportedMarketplace {
  const marketplace =
    (message.marketPlace as string | undefined) ??
    (message.marketplace as string | undefined);

  if (!marketplace) {
    throw new Error("Marketplace is required");
  }

  return marketplace as SupportedMarketplace;
}

function resolveProduct(message: ExternalMessage): CrosslistProduct {
  const product =
    (message.product as CrosslistProduct | undefined) ??
    (message.productData as CrosslistProduct | undefined) ??
    (message.payload as CrosslistProduct | undefined) ??
    (message.data as CrosslistProduct | undefined);

  if (!product) {
    throw new Error("Product payload is required");
  }

  return product;
}

function resolveSettings(message: ExternalMessage): Record<string, unknown> | undefined {
  return (
    (message.settings as Record<string, unknown> | undefined) ??
    (message.userSettings as Record<string, unknown> | undefined) ??
    ((message.params as Record<string, unknown>)?.userSettings as Record<string, unknown> | undefined)
  );
}

function resolveTldFromMessage(message: ExternalMessage, marketplace: string) {
  const normalized = marketplace ? marketplace.toLowerCase() : "";
  const settings = resolveSettings(message) ?? {};

  return (
    (message.tld as string | undefined) ??
    (message.marketplaceTld as string | undefined) ??
    ((message as Record<string, unknown>)[`${normalized}Tld`] as string | undefined) ??
    (settings[`${normalized}Tld`] as string | undefined)
  );
}

async function handleImportToWrenlist(
  message: { marketplace?: string; productId?: string; url?: string; productData?: Record<string, unknown>; wrenlistBaseUrl?: string },
  _sender: chrome.runtime.MessageSender,
) {
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
    const productRecord = productData as Record<string, unknown>;
    const payload = isVinted
      ? { vintedItem: productData }
      : {
          marketplace,
          marketplaceProductId: message.productId ?? (productRecord.id as string | undefined) ?? "",
          productData,
          url: message.url ?? (productRecord.marketplace_url as string | undefined) ?? null,
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
      const errorMessage =
        data?.error ||
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

    const productId = (data?.productId as string | undefined) ?? data?.id;
    if ((settings.autoOpenWrenlist ?? true) && productId) {
      await openWrenlistProduct(baseUrl, productId);
    }

    if (settings.showNotifications !== false) {
      const productTitle =
        (productRecord.title as string | undefined) ??
        (productRecord.name as string | undefined) ??
        "Import completed";
      showImportNotification(
        productId
          ? `Imported to Wrenlist`
          : `Import from ${marketplace} completed`,
        productTitle,
        productId ? `${baseUrl}/dashboard/products/${productId}` : undefined,
      );
    }

    return {
      success: true,
      productId,
      message: data?.message || "Imported successfully",
      extensionVersion: EXTENSION_VERSION,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      success: false,
      error: normalized.message,
      internalErrors: normalized.internalErrors,
      extensionVersion: EXTENSION_VERSION,
    };
  }
}

async function handleBatchImportVinted(message: ExternalMessage) {
  try {
    const limit = resolvePositiveInteger(
      (message.limit as number | string | undefined) ??
        (message.max as number | string | undefined),
      50,
      200,
    );
    const status = (message.status as string | undefined)?.toLowerCase() ?? "active";
    if (status !== "active") {
      return withExtensionVersion({
        success: false,
        message: "Only active Vinted listings can be imported right now.",
      });
    }

    const baseUrl = await getWrenlistBaseUrl(
      (message as { wrenlistBaseUrl?: string }).wrenlistBaseUrl,
    );
    const tld = resolveTldFromMessage(message, "vinted") ?? "com";
    const { client } = createVintedServices({ tld });
    await client.bootstrap();

    // Check if specific listing IDs are provided
    const listingIds = (message as { listingIds?: string[] | number[] }).listingIds;
    let listings: BatchListingPayload[];

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
    } else {
      // Fall back to fetching all listings (original behavior)
      const loggedIn = await client.checkLogin();
      if (!loggedIn) {
        return withExtensionVersion({
          success: false,
          message: "Please log in to your Vinted account and try again.",
          needsLogin: true,
        });
      }

      listings = await collectVintedListings(client, limit, status, tld);
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
      const errorMessage =
        data?.error ||
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

    return withExtensionVersion({
      success: true,
      message: data?.message ?? `Imported ${data?.results?.success ?? listings.length} items.`,
      results: data?.results ?? null,
    });
  } catch (error) {
    const normalized = normalizeError(error);
    return withExtensionVersion({
      success: false,
      message: normalized.message,
      internalErrors: normalized.internalErrors,
    });
  }
}

interface SyncProduct {
  id: string;
  vinted_product_id: number | string;
  vinted_status?: string;
  title?: string;
  price?: string | number;
}

interface SyncUpdate {
  product_id: string;
  vinted_product_id: string;
  vinted_status: string;
  last_synced_at: string;
  price?: number;
  favourites?: number;
  views?: number;
}

interface SyncChange {
  product_id: string;
  title?: string;
  oldStatus: string;
  newStatus: string;
}

async function handleSyncVintedStatus(message: ExternalMessage) {
  try {
    console.log("[Vinted Sync] Starting status sync...");
    const data = (message.data as Record<string, unknown>) ?? message;
    const products = (data.products as SyncProduct[]) ?? [];
    const isAutoSync = (data.isAutoSync as boolean) ?? false;
    
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
    const tld = (data.domain as string)?.replace("vinted.", "") ?? "co.uk";
    const { client } = createVintedServices({ tld });
    
    try {
      await client.bootstrap();
    } catch (bootstrapError) {
      console.error("[Vinted Sync] Bootstrap failed:", bootstrapError);
      return withExtensionVersion({
        success: false,
        error: "Please log in to Vinted and try again.",
        stats: { checked: 0, updated: 0, unchanged: 0, failed: products.length },
      });
    }
    
    // Fetch all items from wardrobe (active, sold, hidden)
    const vintedItemsMap = new Map<string, { item: any; status: string }>();
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
            body.items.forEach((item: any) => {
              vintedItemsMap.set(item.id.toString(), {
                item,
                status: cond,
              });
            });
            console.log(`[Vinted Sync] Fetched ${body.items.length} ${cond} items`);
          }
        } else {
          console.warn(`[Vinted Sync] Failed to fetch ${cond} items: ${response.status}`);
        }
      } catch (fetchError) {
        console.warn(`[Vinted Sync] Error fetching ${cond} items:`, fetchError);
      }
    }
    
    console.log(`[Vinted Sync] Total Vinted items: ${vintedItemsMap.size}`);
    
    // Match products with Vinted items
    const updates: SyncUpdate[] = [];
    const changes: SyncChange[] = [];
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
        } else {
          unchanged++;
        }
      } else {
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
        } else {
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
  } catch (error) {
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
  } catch (error) {
    return { success: false, detected: false, shopSlug: null, error: String(error) };
  }
}

async function openTab(url: string, focusTab = false) {
  if (!url) {
    throw new Error("URL is required");
  }

  return new Promise<chrome.tabs.Tab | undefined>((resolve, reject) => {
    chrome.tabs.create(
      {
        url,
        active: Boolean(focusTab),
      },
      (tab) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(error);
          return;
        }
        resolve(tab);
      },
    );
  });
}

function withExtensionVersion(result: ListingActionResult) {
  return {
    ...result,
    extensionVersion: EXTENSION_VERSION,
  };
}

function withError(error: unknown) {
  const normalized = normalizeError(error);
  return withExtensionVersion({
    success: false,
    message: normalized.message,
    internalErrors: normalized.internalErrors,
  });
}

async function getWrenlistBaseUrl(override?: string) {
  if (override && override.startsWith("http")) {
    return override.replace(/\/+$/, "");
  }
  const storage = await getSyncStorage(["wrenlistApiBase"]);
  const fromStorage = storage.wrenlistApiBase as string | undefined;
  if (fromStorage && fromStorage.startsWith("http")) {
    return fromStorage.replace(/\/+$/, "");
  }
  return DEFAULT_WRENLIST_BASE_URL;
}

function getSyncStorage<T extends Record<string, unknown>>(keys: (keyof T | string)[]) {
  return new Promise<Record<string, unknown>>((resolve) => {
    chrome.storage.sync.get(keys, (items) => {
      resolve(items);
    });
  });
}

function showImportNotification(title: string, message: string, url?: string) {
  if (!chrome.notifications?.create) {
    return;
  }
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL(ICON_PATH),
      title,
      message,
      priority: 1,
      eventTime: Date.now(),
    },
    (notificationId) => {
      if (url) {
        chrome.notifications.onClicked.addListener(function handleClick(id) {
          if (id === notificationId) {
            chrome.notifications.onClicked.removeListener(handleClick);
            void openTab(url, true);
          }
        });
      }
    },
  );
}

async function openWrenlistProduct(baseUrl: string, productId: string) {
  const productUrl = `${baseUrl.replace(/\/+$/, "")}/dashboard/products/${productId}`;
  await openTab(productUrl, true);
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

interface BatchListingPayload {
  id: string;
  title: string;
  price: number;
  currency: string;
  description?: string;
  photos: string[];
  condition?: string;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  category?: string | null;
  url: string;
  status?: string;

  // Cross-marketplace fields
  originalPrice?: number;
  acceptOffers?: boolean;
  tags?: string;
  sku?: string;
  quantity?: number;

  // Full Vinted metadata for relisting
  vintedMetadata?: VintedImportMetadata;

  // Photo thumbnails for faster UI loading
  photoThumbnails?: string[];
}

async function collectVintedListings(
  client: VintedClient,
  limit: number,
  status: string,
  tld: string,
): Promise<BatchListingPayload[]> {
  const listings: BatchListingPayload[] = [];
  let nextPage: string | null = "1";

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
        if (!detail) continue;
        const listing = mapCrosslistProductToBatch(
          detail,
          product.marketplaceUrl ?? client.getProductUrl(product.marketplaceId),
          status,
          tld,
        );
        listings.push(listing);
      } catch (error) {
        console.warn(`[Batch Import] Failed to fetch Vinted listing ${product.marketplaceId}`, error);
      }
    }

    nextPage = pageResult.nextPage;
  }

  return listings;
}

async function collectVintedListingsByIds(
  client: VintedClient,
  listingIds: (string | number)[],
  status: string,
  tld: string,
): Promise<BatchListingPayload[]> {
  const listings: BatchListingPayload[] = [];

  for (const id of listingIds) {
    try {
      const idString = String(id);
      const detail = await client.getListing(idString);
      if (!detail) {
        console.warn(`[Batch Import] Listing ${idString} not found or inaccessible`);
        continue;
      }
      const listing = mapCrosslistProductToBatch(
        detail,
        client.getProductUrl(idString),
        status,
        tld,
      );
      listings.push(listing);
    } catch (error) {
      console.warn(`[Batch Import] Failed to fetch Vinted listing ${id}`, error);
      // Continue with other listings even if one fails
    }
  }

  return listings;
}

const VINTED_TLD_CURRENCY_MAP: Record<string, string> = {
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

function mapCrosslistProductToBatch(
  product: CrosslistProduct,
  url: string,
  status: string,
  tld: string,
): BatchListingPayload {
  const id =
    (product.marketplaceId ?? product.marketPlaceId ?? product.id)?.toString() ?? crypto.randomUUID();
  const price =
    typeof product.price === "number"
      ? product.price
      : Number.parseFloat(product.price ? String(product.price) : "0");
  const photos = Array.isArray(product.images)
    ? product.images.filter((photo): photo is string => Boolean(photo))
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
    .filter((url): url is string => Boolean(url));

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

async function handleFetchVintedApi(message: ExternalMessage) {
  const url = message.url as string | undefined;
  const method = (message.method as string | undefined) ?? "GET";

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
  } catch (error) {
    return withExtensionVersion({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleFetchCrosslistApi(message: ExternalMessage) {
  const url = message.url as string | undefined;
  const method = (message.method as string | undefined) ?? "GET";

  // Validate URL
  if (!url) {
    throw new Error("URL is required");
  }

  if (!url.startsWith("https://app.crosslist.com/api/")) {
    throw new Error("Only Crosslist API URLs (https://app.crosslist.com/api/*) are allowed");
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
  } catch (error) {
    return withExtensionVersion({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function mapConditionToWrenlist(condition?: Condition): string {
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

function getCurrencyForTld(tld: string): string {
  return VINTED_TLD_CURRENCY_MAP[tld] ?? "USD";
}

function resolvePositiveInteger(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.trunc(parsed), max);
}

export {};

