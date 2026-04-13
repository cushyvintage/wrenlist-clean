import type { Product, VintedImportMetadata } from "./types.js";
import { EXTENSION_VERSION, remoteLog } from "./shared/api.js";
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
import { createEtsyServices } from "./marketplaces/etsy/index.js";
import {
  VintedCooldownError,
  VintedLoggedOutError,
  VintedRetryLaterError,
  VintedTokenFetchError,
  type VintedClient,
} from "./marketplaces/vinted/client.js";
import { Condition } from "./shared/enums.js";
import { ShopifyClient } from "./marketplaces/shopify/client.js";
import { ShopifyMapper } from "./marketplaces/shopify/mapper.js";

const KEEP_ALIVE_INTERVAL_MS = 20_000;
const DEFAULT_WRENLIST_BASE_URL = "https://app.wrenlist.com";
const ICON_PATH = "icons/icon128.png";

// Shopify taxonomy category IDs need to be looked up from Shopify's actual
// taxonomy API. For now, we skip category mapping and rely on customProductType
// for organisation. Category can be set manually in Shopify admin or via
// platform_category_id in product_marketplace_data.
function mapCategoryToShopify(category?: string | null): string[] {
  // Return empty — category mapping requires valid Shopify taxonomy node IDs
  // which vary by store. Users can set platform_category_id per-item.
  void category;
  return [];
}

const PRODUCT_TYPE_MAP: Record<string, string> = {
  // Phase 3 top-level keys
  antiques: "Antiques",
  art: "Art & Prints",
  baby_toddler: "Baby & Toddler",
  books_media: "Books & Media",
  clothing: "Vintage Clothing",
  craft_supplies: "Craft Supplies",
  collectibles: "Collectibles",
  electronics: "Electronics",
  health_beauty: "Health & Beauty",
  home_garden: "Home & Garden",
  musical_instruments: "Musical Instruments",
  pet_supplies: "Pet Supplies",
  sports_outdoors: "Sports & Outdoors",
  toys_games: "Toys & Games",
  vehicles_parts: "Vehicles & Parts",
  other: "",
  // Legacy keys (backward compat)
  ceramics: "Vintage Ceramics",
  glassware: "Vintage Glassware",
  books: "Books",
  jewellery: "Vintage Jewellery",
  homeware: "Vintage Homeware",
  furniture: "Vintage Furniture",
  toys: "Vintage Toys",
  sports: "Sports & Outdoors",
  music_media: "Music & Media",
};

// Facebook Marketplace category IDs (scraped from facebook.com/marketplace/create/item)
const FACEBOOK_CATEGORY_MAP: Record<string, string> = {
  // Phase 3 top-level keys
  antiques: "694812561109098",
  art: "230517141491149",
  baby_toddler: "852990988564103",
  books_media: "298538951209945",
  clothing: "2730276503872246",
  craft_supplies: "230517141491149",
  collectibles: "694812561109098",
  electronics: "585516622131197",
  health_beauty: "585516622131197",
  home_garden: "3299126870312336",
  musical_instruments: "230517141491149",
  pet_supplies: "684964985564453",
  sports_outdoors: "852990988564103",
  toys_games: "852990988564103",
  vehicles_parts: "684964985564453",
  other: "684964985564453",
  // Legacy keys
  ceramics: "307201127289111",
  glassware: "585516622131197",
  books: "298538951209945",
  jewellery: "3151136201666261",
  homeware: "3299126870312336",
  furniture: "685207502348028",
  toys: "852990988564103",
  sports: "852990988564103",
  music_media: "298538951209945",
};

/** Resolve a compound category value against a lookup map, trying progressively shorter prefixes */
function resolveFromMap<T>(map: Record<string, T>, cat: string): T | undefined {
  if (map[cat]) return map[cat];
  const parts = cat.split("_");
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join("_");
    if (map[prefix]) return map[prefix];
  }
  return undefined;
}

function mapCategoryToFacebook(category?: string | null, platformCategoryId?: string | null): string[] {
  if (platformCategoryId) return [platformCategoryId];
  if (!category) return ["684964985564453"]; // Miscellaneous
  const cat = category.toLowerCase();
  const id = resolveFromMap(FACEBOOK_CATEGORY_MAP, cat);
  return [id ?? "684964985564453"];
}

// Depop API product types — discovered from real Depop listings via userProductView API
// Note: "decor-home-accesories" is Depop's actual spelling (missing 's')
const DEPOP_CATEGORY_MAP: Record<string, string[]> = {
  // Phase 3 top-level keys
  antiques: ["everything-else", "home", "decor-home-accesories"],
  art: ["everything-else", "art", "painting"],
  art_ceramic: ["everything-else", "art", "sculpture"],
  art_drawings: ["everything-else", "art", "drawing-and-illustration"],
  art_fiber: ["everything-else", "art", "mixed-media"],
  art_glass: ["everything-else", "art", "sculpture"],
  art_mixed: ["everything-else", "art", "mixed-media"],
  art_paintings: ["everything-else", "art", "painting"],
  art_photographs: ["everything-else", "art", "photography"],
  art_posters: ["everything-else", "art", "posters"],
  art_sculptures: ["everything-else", "art", "sculpture"],
  baby_toddler: ["everything-else", "toys", "other-toys"],
  books_media: ["everything-else", "books-and-magazines", "books"],
  books_media_catalogs: ["everything-else", "books-and-magazines", "magazines"],
  books_media_comics: ["everything-else", "books-and-magazines", "comics"],
  books_media_magazines: ["everything-else", "books-and-magazines", "magazines"],
  books_media_movies: ["everything-else", "music", "other-music"],
  books_media_music: ["everything-else", "music", "vinyl"],
  // Clothing — womenswear
  clothing: ["womenswear", "tops", "blouses"],
  clothing_womenswear: ["womenswear", "tops", "blouses"],
  clothing_womenswear_dresses: ["womenswear", "dresses", "casual-dresses"],
  clothing_womenswear_tops: ["womenswear", "tops", "blouses"],
  clothing_womenswear_womens_tops: ["womenswear", "tops", "blouses"],
  clothing_womenswear_skirts: ["womenswear", "bottoms", "skirts"],
  clothing_womenswear_womens_skirts: ["womenswear", "bottoms", "skirts"],
  clothing_womenswear_womens_coats_jackets: ["womenswear", "coats-and-jackets", "other-coats-and-jackets"],
  clothing_womenswear_womens_outerwear: ["womenswear", "coats-and-jackets", "other-coats-and-jackets"],
  clothing_womenswear_womens_jeans: ["womenswear", "bottoms", "jeans"],
  clothing_womenswear_womens_pants: ["womenswear", "bottoms", "trousers"],
  clothing_womenswear_womens_shorts: ["womenswear", "bottoms", "shorts"],
  clothing_womenswear_womens_sweaters: ["womenswear", "tops", "jumpers"],
  clothing_womenswear_womens_sweatshirts: ["womenswear", "tops", "sweatshirts"],
  clothing_womenswear_womens_activewear: ["womenswear", "tops", "other-tops"],
  clothing_womenswear_womens_swimwear: ["womenswear", "swimwear", "swimsuits"],
  clothing_womenswear_womens_intimates: ["womenswear", "underwear", "other-underwear"],
  clothing_womenswear_womens_shoes: ["womenswear", "footwear", "other-shoes"],
  clothing_womenswear_womens_bags: ["womenswear", "accessories", "bags"],
  clothing_womenswear_womens_accessories: ["womenswear", "accessories", "other-accessories"],
  clothing_womenswear_womens_jewelry: ["womenswear", "jewellery"],
  clothing_womenswear_womens_maternity: ["womenswear", "tops", "other-tops"],
  clothing_womenswear_womens_suits: ["womenswear", "suits", "other-suits"],
  // Clothing — menswear
  clothing_menswear: ["menswear", "tops", "t-shirts"],
  clothing_menswear_mens_coats_jackets: ["menswear", "coats-and-jackets", "other-coats-and-jackets"],
  clothing_menswear_mens_outerwear: ["menswear", "coats-and-jackets", "other-coats-and-jackets"],
  clothing_menswear_mens_tops: ["menswear", "tops", "t-shirts"],
  clothing_menswear_mens_tops_and_shirts: ["menswear", "tops", "shirts"],
  clothing_menswear_mens_trousers: ["menswear", "bottoms", "trousers"],
  clothing_menswear_mens_pants: ["menswear", "bottoms", "trousers"],
  clothing_menswear_mens_shirts: ["menswear", "tops", "shirts"],
  clothing_menswear_mens_jeans: ["menswear", "bottoms", "jeans"],
  clothing_menswear_mens_knitwear: ["menswear", "tops", "jumpers"],
  clothing_menswear_mens_sweaters: ["menswear", "tops", "jumpers"],
  clothing_menswear_mens_sweatshirts: ["menswear", "tops", "sweatshirts"],
  clothing_menswear_mens_shorts: ["menswear", "bottoms", "shorts"],
  clothing_menswear_mens_activewear: ["menswear", "tops", "other-tops"],
  clothing_menswear_mens_swimwear: ["menswear", "swimwear", "swim-shorts"],
  clothing_menswear_mens_intimates: ["menswear", "underwear", "other-underwear"],
  clothing_menswear_mens_shoes: ["menswear", "footwear", "other-shoes"],
  clothing_menswear_mens_bags: ["menswear", "accessories", "bags"],
  clothing_menswear_mens_accessories: ["menswear", "accessories", "other-accessories"],
  clothing_menswear_mens_suits: ["menswear", "suits", "other-suits"],
  // Clothing — kids
  clothing_boyswear: ["kidswear", "tops", "t-shirts"],
  clothing_girlswear: ["kidswear", "tops", "t-shirts"],
  clothing_unisex_kidswear: ["kidswear", "tops", "t-shirts"],
  // Non-clothing categories
  craft_supplies: ["everything-else", "home", "other-home"],
  craft_supplies_fabric: ["everything-else", "home", "textiles"],
  craft_supplies_sewing: ["everything-else", "home", "textiles"],
  craft_supplies_needlecrafts: ["everything-else", "home", "textiles"],
  craft_supplies_beading: ["womenswear", "jewellery"],
  craft_supplies_candle: ["everything-else", "home", "candles"],
  collectibles: ["everything-else", "home", "decor-home-accesories"],
  collectibles_jewelry: ["womenswear", "jewellery"],
  collectibles_kitchen: ["everything-else", "home", "kitchen"],
  collectibles_vanity_perfume: ["everything-else", "beauty", "fragrances"],
  collectibles_science_fiction: ["everything-else", "toys", "figures-and-dolls"],
  collectibles_stamps: ["everything-else", "home", "decor-home-accesories"],
  collectibles_coins: ["everything-else", "home", "decor-home-accesories"],
  electronics: ["everything-else", "tech-accessories", "other-tech-accessories"],
  electronics_cameras: ["everything-else", "cameras-and-film", "cameras"],
  electronics_headphones: ["everything-else", "tech-accessories", "headphones-and-earphones"],
  electronics_phone: ["everything-else", "tech-accessories", "phone-cases"],
  electronics_speakers: ["everything-else", "tech-accessories", "speakers"],
  health_beauty: ["everything-else", "beauty", "other-beauty"],
  health_beauty_hair: ["everything-else", "beauty", "hair-products"],
  health_beauty_makeup: ["everything-else", "beauty", "makeup"],
  health_beauty_nail: ["everything-else", "beauty", "nails"],
  health_beauty_skin: ["everything-else", "beauty", "skincare-and-body"],
  health_beauty_fragrance: ["everything-else", "beauty", "fragrances"],
  health_beauty_shaving: ["everything-else", "beauty", "beauty-tools"],
  home_garden: ["everything-else", "home", "decor-home-accesories"],
  home_garden_bathroom: ["everything-else", "home", "bathroom"],
  home_garden_bedding: ["everything-else", "home", "bedding"],
  home_garden_candles: ["everything-else", "home", "candles"],
  home_garden_dinnerware: ["everything-else", "home", "dinnerware"],
  home_garden_drinkware: ["everything-else", "home", "drinkware"],
  home_garden_furniture: ["everything-else", "home", "furniture"],
  home_garden_kitchen: ["everything-else", "home", "kitchen"],
  home_garden_lighting: ["everything-else", "home", "lighting"],
  home_garden_rugs: ["everything-else", "home", "rugs-and-carpets"],
  home_garden_storage: ["everything-else", "home", "storage"],
  home_garden_textiles: ["everything-else", "home", "textiles"],
  home_garden_plants: ["everything-else", "home", "plants-and-flowers"],
  home_garden_outdoor: ["everything-else", "home", "other-home"],
  home_garden_tools: ["everything-else", "home", "other-home"],
  musical_instruments: ["everything-else", "music", "other-music"],
  pet_supplies: ["everything-else", "home", "other-home"],
  sports_outdoors: ["everything-else", "sports-equipment"],
  sports_outdoors_camping: ["everything-else", "sports-equipment"],
  sports_outdoors_fishing: ["everything-else", "sports-equipment"],
  toys_games: ["everything-else", "toys", "other-toys"],
  toys_games_games: ["everything-else", "toys", "puzzles-and-games"],
  toys_games_puzzles: ["everything-else", "toys", "puzzles-and-games"],
  toys_games_stuffed: ["everything-else", "toys", "plushies"],
  toys_games_models: ["everything-else", "toys", "figures-and-dolls"],
  toys_games_action: ["everything-else", "toys", "figures-and-dolls"],
  vehicles_parts: ["everything-else", "home", "other-home"],
  other: ["everything-else", "home", "other-home"],
  // Legacy keys
  ceramics: ["everything-else", "home", "dinnerware"],
  glassware: ["everything-else", "home", "drinkware"],
  books: ["everything-else", "books-and-magazines", "books"],
  jewellery: ["womenswear", "jewellery"],
  homeware: ["everything-else", "home", "decor-home-accesories"],
  furniture: ["everything-else", "home", "furniture"],
  toys: ["everything-else", "toys", "other-toys"],
  sports: ["everything-else", "sports-equipment"],
  music_media: ["everything-else", "music", "vinyl"],
};

/**
 * Resolve a Depop size from category + raw size text.
 * Returns [variantSetId, sizeName] for the Depop API, or undefined if no mapping.
 * Uses GB region size sets from depop-attributes-full.json.
 */
function resolveDepopSize(category: string | null, sizeText: string | null): [string, string] | undefined {
  if (!sizeText || !category) return undefined;
  const cat = category.toLowerCase();
  const size = sizeText.trim().toUpperCase();

  // Determine which size set to use based on category
  let setId: number;
  if (cat.includes('menswear') && (cat.includes('coat') || cat.includes('jacket') || cat.includes('outerwear'))) {
    setId = 93; // mens-outerwear-sizes GB
  } else if (cat.includes('menswear') && (cat.includes('bottom') || cat.includes('trouser') || cat.includes('jeans') || cat.includes('shorts'))) {
    setId = 58; // mens-bottoms-sizes GB
  } else if (cat.includes('menswear')) {
    setId = 52; // mens-top-sizes GB
  } else if (cat.includes('womenswear') && (cat.includes('dress'))) {
    setId = 86; // wmns-dress-sizes GB
  } else if (cat.includes('womenswear') && (cat.includes('coat') || cat.includes('jacket') || cat.includes('outerwear'))) {
    setId = 36; // wmns-outerwear-sizes GB
  } else if (cat.includes('womenswear') && (cat.includes('bottom') || cat.includes('trouser') || cat.includes('jeans') || cat.includes('skirt'))) {
    setId = 20; // wmns-bottom-sizes GB
  } else if (cat.includes('womenswear')) {
    setId = 2; // wmns-tops-sizes GB
  } else {
    return undefined; // Non-clothing or can't determine
  }

  // Map common size labels to Depop variant IDs (consistent across menswear letter-based sets)
  // Depop mapper uses size[0] as variantSetId (parseInt'd) and size[1] as variant ID (used as map key in variants object).
  // Depop API requires variant IDs to be numeric, so we pass the numeric variant ID (not the label).
  const LETTER_SIZE_MAP: Record<string, number> = {
    'ONE SIZE': 1, '3XS': 12, 'XXS': 9, 'XS': 2, 'S': 3, 'M': 4, 'L': 5, 'XL': 6, 'XXL': 7, '3XL': 10, '4XL': 11, '5XL': 13,
  };
  const variantId = LETTER_SIZE_MAP[size];
  if (variantId !== undefined) return [String(setId), String(variantId)];

  return undefined;
}

function mapCategoryToDepop(category?: string | null): string[] {
  if (!category) return ["everything-else", "home", "decor-home-accesories"];
  const cat = category.toLowerCase();
  return resolveFromMap(DEPOP_CATEGORY_MAP, cat) ?? ["everything-else", "home", "decor-home-accesories"];
}

function mapProductType(category?: string | null): string {
  if (!category) return "";
  const cat = category.toLowerCase();
  return resolveFromMap(PRODUCT_TYPE_MAP, cat) ?? "";
}

function mapCondition(condition?: string | null): Condition {
  switch (condition?.toLowerCase()) {
    case "new_with_tags":
      return Condition.NewWithTags;
    case "new_without_tags":
      return Condition.NewWithoutTags;
    case "very_good":
      return Condition.VeryGood;
    case "good":
      return Condition.Good;
    case "fair":
      return Condition.Fair;
    case "poor":
      return Condition.Poor;
    // Legacy fallbacks
    case "excellent":
      return Condition.NewWithoutTags;
    default:
      return Condition.Good;
  }
}

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
      "depop",
      "facebook",
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

  // --- Extension heartbeat: report alive status to Wrenlist API ---
  const HEARTBEAT_ALARM = "heartbeat";
  const HEARTBEAT_INTERVAL_MINUTES = 1;

  chrome.alarms.create(HEARTBEAT_ALARM, {
    delayInMinutes: 0.2, // first heartbeat ~12s after startup
    periodInMinutes: HEARTBEAT_INTERVAL_MINUTES,
  });

  async function sendHeartbeat(): Promise<void> {
    try {
      const baseUrl = await getWrenlistBaseUrl();
      await queueFetch(`${baseUrl}/api/extension/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extension_version: EXTENSION_VERSION,
          user_agent: navigator.userAgent,
        }),
      });
    } catch (e) {
      console.debug("[Heartbeat] Failed:", e);
    }
  }

  // --- Vinted sales sync: periodic enrichment of sold items ---
  const VINTED_SALES_SYNC_ALARM = "vinted_sales_sync";
  const VINTED_SALES_SYNC_INTERVAL_MINUTES = 15;
  const LAST_VINTED_SALE_TX_KEY = "lastVintedSaleTxId";

  chrome.alarms.create(VINTED_SALES_SYNC_ALARM, {
    delayInMinutes: 2, // first sync ~2 min after startup
    periodInMinutes: VINTED_SALES_SYNC_INTERVAL_MINUTES,
  });

  async function runVintedSalesSync(): Promise<void> {
    try {
      // Check if user is logged into Vinted
      const isLoggedIn = await checkMarketplaceLogin("vinted");
      if (!isLoggedIn) {
        console.debug("[VintedSalesSync] Not logged into Vinted, skipping");
        return;
      }

      // Read last synced transaction ID
      const stored = await chrome.storage.local.get([LAST_VINTED_SALE_TX_KEY]);
      const stopAtId = (stored[LAST_VINTED_SALE_TX_KEY] as string) || undefined;

      console.log("[VintedSalesSync] Fetching sales, stopAtId:", stopAtId || "(none)");

      const { client } = createVintedServices({ tld: "co.uk" });
      // Silent bootstrap: never open a background Vinted tab from the sync
      // alarm. If the direct fetch can't get a CSRF, we defer to the next
      // cycle rather than flashing a tab in the user's browser.
      await client.bootstrap();
      const result = await client.getSales(1, 50, stopAtId);

      if (!result.sales || result.sales.length === 0) {
        console.debug("[VintedSalesSync] No new sales found");
        return;
      }

      console.log(`[VintedSalesSync] Found ${result.sales.length} sales, enriching with order details...`);

      // Enrich each sale with full order details (buyer, fees, shipment)
      // The list endpoint returns minimal data; per-order calls return everything
      const enrichedSales = [];
      for (const sale of result.sales) {
        try {
          const details = await client.getOrderDetails(sale.transactionId);
          if (details) {
            enrichedSales.push(details);
          } else {
            enrichedSales.push(sale); // Fallback to list data
          }
          // Small delay to avoid Vinted rate limiting (429)
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.warn(`[VintedSalesSync] Failed to get details for ${sale.transactionId}:`, err);
          enrichedSales.push(sale); // Fallback to list data
        }
      }

      console.log(`[VintedSalesSync] Enriched ${enrichedSales.length} sales, posting to API`);

      // POST to sync-sales API
      const baseUrl = await getWrenlistBaseUrl();
      const syncRes = await queueFetch(`${baseUrl}/api/vinted/sync-sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales: enrichedSales }),
      });

      if (syncRes.ok) {
        const syncData = await syncRes.json();
        const data = syncData.data || syncData;
        console.log("[VintedSalesSync] Synced:", data.message || data);

        // Only advance checkpoint if all items synced without errors
        if ((data.errors || 0) === 0) {
          const newestTxId = result.sales[0]?.transactionId;
          if (newestTxId) {
            await chrome.storage.local.set({ [LAST_VINTED_SALE_TX_KEY]: String(newestTxId) });
          }
        } else {
          console.warn(`[VintedSalesSync] ${data.errors} errors — not advancing checkpoint`);
        }

        // Photo backfill for finds with external URLs
        if (data.needsPhotoBackfill?.length > 0) {
          const backfillRes = await queueFetch(`${baseUrl}/api/finds/photo-backfill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ finds: data.needsPhotoBackfill }),
          });
          if (backfillRes.ok) {
            const bf = await backfillRes.json();
            console.log("[VintedSalesSync] Photo backfill:", bf.data || bf);
          }
        }
      } else {
        console.error("[VintedSalesSync] API error:", syncRes.status, await syncRes.text());
      }
    } catch (e) {
      // Three distinct failure modes — each gets its own log level and
      // message so beta testers and future-us can tell at a glance whether
      // this needs human attention or will self-heal.
      //
      // All three use remoteLog() so they land in chrome.storage.local
      // (the reliable debug store — Vercel serverless logs are lossy and
      // non-deterministic across instances, so the `/api/extension/logs`
      // endpoint is best-effort only).
      if (e instanceof VintedCooldownError) {
        // Transient. Next alarm cycle (~5 min) will retry cleanly.
        console.info(
          `[VintedSalesSync] Skipping this cycle — token refresh on cooldown, ${e.secondsRemaining}s remaining`,
        );
        await remoteLog(
          "info",
          "vinted-sync",
          "Skipped: token refresh on cooldown — retry next cycle",
          { secondsRemaining: e.secondsRemaining },
        );
        return;
      }
      if (e instanceof VintedRetryLaterError) {
        // Direct fetch didn't yield a CSRF and we deliberately disabled the
        // tab fallback for this silent alarm path. Not an error — just wait
        // for the next cycle (or for the user to open Vinted / trigger a
        // publish, either of which will warm the token cache).
        console.info(
          `[VintedSalesSync] Deferring this cycle — ${e.reason}`,
        );
        return;
      }
      if (e instanceof VintedLoggedOutError) {
        // Requires user action. Log loudly so it shows up in diagnostics.
        console.warn("[VintedSalesSync] User logged out of Vinted:", e.message);
        await remoteLog(
          "warn",
          "vinted-sync",
          "User logged out of Vinted — sales sync paused until they sign back in at vinted.co.uk",
        );
        return;
      }
      if (e instanceof VintedTokenFetchError) {
        // Likely Cloudflare challenge or page structure change. Not
        // self-recoverable without user or dev intervention.
        console.error("[VintedSalesSync] Token fetch failed:", e.message);
        await remoteLog("error", "vinted-sync", `Token fetch failed: ${e.message}`);
        return;
      }
      // Unknown error — log loudly, include the raw error for triage.
      console.error("[VintedSalesSync] Failed:", e);
      await remoteLog(
        "error",
        "vinted-sync",
        `Unexpected failure: ${e instanceof Error ? e.message : String(e)}`,
        { stack: e instanceof Error ? e.stack : undefined },
      );
    }
  }

  // --- Shop stats auto-refresh: daily refresh for Etsy + Vinted stats ---
  const STATS_REFRESH_ALARM = "wrenlist_stats_refresh";
  const STATS_REFRESH_INTERVAL_MINUTES = 60 * 24; // every 24 hours
  const STATS_LAST_RUN_KEY = "statsRefreshLastRun";

  chrome.alarms.create(STATS_REFRESH_ALARM, {
    delayInMinutes: 5, // first run ~5 min after startup
    periodInMinutes: STATS_REFRESH_INTERVAL_MINUTES,
  });

  async function runStatsRefresh(): Promise<void> {
    // Deduplicate: skip if ran in the last 12 hours (protects against
    // service worker restarts creating a fresh alarm each time)
    const stored = await chrome.storage.local.get([STATS_LAST_RUN_KEY]);
    const lastRun = stored[STATS_LAST_RUN_KEY] as number | undefined;
    if (lastRun && Date.now() - lastRun < 12 * 60 * 60 * 1000) {
      console.debug("[StatsRefresh] Skipping — last ran", new Date(lastRun).toISOString());
      return;
    }
    await chrome.storage.local.set({ [STATS_LAST_RUN_KEY]: Date.now() });

    console.log("[StatsRefresh] Starting daily stats refresh...");
    const baseUrl = await getWrenlistBaseUrl();
    let etsyOk = false;
    let vintedOk = false;

    // --- Etsy ---
    try {
      const isLoggedIn = await checkMarketplaceLogin("etsy");
      if (isLoggedIn) {
        const etsyStats = await createEtsyServices().client.getShopStats();
        if (etsyStats) {
          const res = await queueFetch(`${baseUrl}/api/etsy/shop-stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(etsyStats),
          });
          etsyOk = res.ok;
        }
      } else {
        console.debug("[StatsRefresh] Not logged into Etsy, skipping");
      }
    } catch (e) {
      console.warn("[StatsRefresh] Etsy stats failed:", e);
    }

    // --- Vinted ---
    try {
      const isLoggedIn = await checkMarketplaceLogin("vinted");
      if (isLoggedIn) {
        const { client } = createVintedServices({ tld: "co.uk" });
        await client.bootstrap();
        const csrfToken = client.getCsrfToken();
        const anonId = client.getAnonId();

        const vintedHeaders: Record<string, string> = {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        };
        if (csrfToken) vintedHeaders["X-Csrf-Token"] = csrfToken;
        if (anonId) vintedHeaders["X-Anon-Id"] = anonId;

        const vintedFetch = async (path: string): Promise<Record<string, unknown> | null> => {
          try {
            const resp = await fetch(`https://www.vinted.co.uk${path}`, {
              method: "GET",
              credentials: "include",
              headers: vintedHeaders,
            });
            if (!resp.ok) return null;
            return await resp.json() as Record<string, unknown>;
          } catch {
            return null;
          }
        };

        // 1. User profile
        const userData = await vintedFetch("/api/v2/users/current");
        const user = (userData?.user as Record<string, unknown>) ?? userData;
        const userId = user?.id as number | undefined;

        // 2. Wallet balance
        let walletData: Record<string, unknown> | null = null;
        if (userId) {
          walletData = await vintedFetch(`/api/v2/users/${userId}/balance`);
        }

        // 3. Completed sales count
        const ordersData = await vintedFetch("/api/v2/my_orders?type=sold&status=completed");
        const pagination = (ordersData?.pagination as Record<string, unknown>) ?? {};

        const userBalance = (walletData?.user_balance as Record<string, unknown>) ?? {};
        const availableAmount = (userBalance?.available_amount as Record<string, unknown>) ?? {};
        const escrowAmount = (userBalance?.escrow_amount as Record<string, unknown>) ?? {};

        const payload = {
          feedbackScore: user?.feedback_reputation as number | undefined,
          positiveReviews: user?.positive_feedback_count as number | undefined,
          negativeReviews: user?.negative_feedback_count as number | undefined,
          totalReviews: user?.feedback_count as number | undefined,
          activeListings: user?.item_count as number | undefined,
          totalItems: user?.total_items_count as number | undefined,
          followers: user?.followers_count as number | undefined,
          completedSales: pagination?.total_entries as number | undefined,
          walletAvailable: availableAmount?.amount as number | undefined,
          walletEscrow: escrowAmount?.amount as number | undefined,
          walletCurrency: (availableAmount?.currency_code ?? escrowAmount?.currency_code) as string | undefined,
          rawJson: { userData, walletData, ordersData },
        };

        const res = await queueFetch(`${baseUrl}/api/vinted/shop-stats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        vintedOk = res.ok;
      } else {
        console.debug("[StatsRefresh] Not logged into Vinted, skipping");
      }
    } catch (e) {
      if (e instanceof VintedCooldownError || e instanceof VintedRetryLaterError) {
        console.info("[StatsRefresh] Vinted deferred:", e instanceof Error ? e.message : String(e));
      } else if (e instanceof VintedLoggedOutError) {
        console.warn("[StatsRefresh] Vinted logged out");
      } else {
        console.warn("[StatsRefresh] Vinted stats failed:", e);
      }
    }

    // --- Depop ---
    let depopOk = false;
    try {
      const isLoggedIn = await checkMarketplaceLogin("depop");
      if (isLoggedIn) {
        // Read auth cookies
        const depopCookies = await new Promise<chrome.cookies.Cookie[]>((resolve, reject) => {
          chrome.cookies.getAll({ domain: "depop.com" }, (c) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(c);
          });
        });
        let depopToken = "";
        let depopUserId = "";
        for (const c of depopCookies) {
          if (c.name === "access_token") depopToken = c.value;
          if (c.name === "user_id") depopUserId = c.value;
        }

        if (depopToken && depopUserId) {
          const depopHeaders: Record<string, string> = {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Authorization: `Bearer ${depopToken}`,
            "Depop-UserId": depopUserId,
          };

          const depopFetch = async (url: string): Promise<Record<string, unknown> | null> => {
            try {
              const resp = await fetch(url, {
                method: "GET",
                credentials: "include",
                headers: depopHeaders,
              });
              if (!resp.ok) return null;
              return await resp.json() as Record<string, unknown>;
            } catch {
              return null;
            }
          };

          const now = Math.floor(Date.now() / 1000);
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

          // 1. User profile
          const profileData = await depopFetch("https://webapi.depop.com/api/v1/users/me/");

          // 2. Analytics: net earnings (30d)
          const netGmvData = await depopFetch(
            `https://webapi.depop.com/presentation/api/v1/analytics/sellers/historical/net_gmv/?window=monthly&from=${thirtyDaysAgo}&to=${now}`
          );

          // 3. Analytics: gross sales (30d)
          const gmvData = await depopFetch(
            `https://webapi.depop.com/presentation/api/v1/analytics/sellers/historical/gmv/?window=monthly&from=${thirtyDaysAgo}&to=${now}`
          );

          // 4. Analytics: items sold (30d)
          const itemsSoldData = await depopFetch(
            `https://webapi.depop.com/presentation/api/v1/analytics/sellers/historical/items_sold/?window=monthly&from=${thirtyDaysAgo}&to=${now}`
          );

          // Extract totals
          const netTotals = (netGmvData?.totals as Array<Record<string, unknown>> | undefined)?.[0];
          const gmvTotals = (gmvData?.totals as Array<Record<string, unknown>> | undefined)?.[0];
          const soldTotals = (itemsSoldData?.totals as Array<Record<string, unknown>> | undefined)?.[0];

          const payload = {
            netEarnings30d: netTotals?.value as number | undefined,
            grossSales30d: gmvTotals?.value as number | undefined,
            itemsSold30d: soldTotals?.value as number | undefined,
            username: profileData?.username as string | undefined,
            verified: profileData?.verified as boolean | undefined,
            rawJson: { profileData, netGmvData, gmvData, itemsSoldData },
          };

          const res = await queueFetch(`${baseUrl}/api/depop/shop-stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          depopOk = res.ok;
        }
      } else {
        console.debug("[StatsRefresh] Not logged into Depop, skipping");
      }
    } catch (e) {
      console.warn("[StatsRefresh] Depop stats failed:", e);
    }

    console.log(`[StatsRefresh] Done — etsy=${etsyOk}, vinted=${vintedOk}, depop=${depopOk}`);
  }

  // --- Queue polling: publish-queue + delist-queue (chrome.alarms, MV3-safe) ---
  const QUEUE_POLL_ALARM = "queue_poll";
  const QUEUE_POLL_INTERVAL_MINUTES = 1;
  const MAX_PUBLISH_RETRIES = 3;

  /**
   * Idempotency guard: prevents duplicate listings when the report-back POST
   * fails (network issue, Vercel cold start) and the queue still shows
   * needs_publish on the next poll cycle.
   *
   * Key: `${find_id}_${marketplace}`, Value: cached publish result.
   * Naturally resets when the MV3 service worker restarts.
   */
  const publishedThisSession = new Map<string, {
    listingId?: string;
    listingUrl?: string;
    publishMode?: "draft" | "publish";
  }>();

  const USE_JOB_QUEUE_KEY = "useJobQueue";

  // Cached flag — avoids async chrome.storage.sync.get during poll guard window
  // Default ON: extension uses /api/jobs/poll (new system). Set to false in
  // chrome.storage.sync to revert to legacy publish-queue/delist-queue endpoints.
  let cachedUseJobQueue = true;
  chrome.storage.sync.get([USE_JOB_QUEUE_KEY]).then(({ [USE_JOB_QUEUE_KEY]: v }) => {
    cachedUseJobQueue = !!v;
  });

  chrome.alarms.create(QUEUE_POLL_ALARM, {
    delayInMinutes: 0.1, // first poll ~6s after startup
    periodInMinutes: QUEUE_POLL_INTERVAL_MINUTES,
  });

  /**
   * Fetch wrapper for queue API calls.
   *
   * MV3 service workers have no cookie jar — both `credentials: "include"`
   * and manually setting the `Cookie` header are silently ignored.
   *
   * Workaround: read the Supabase JWT from the chunked auth cookie via
   * `chrome.cookies.getAll()`, reassemble it, decode the base64 wrapper,
   * extract the access_token, and send it as `Authorization: Bearer`.
   * Supabase's `getUser()` accepts Bearer tokens from the Authorization header.
   */
  async function queueFetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);

    try {
      const baseOrigin = new URL(url).origin;
      const allCookies = await chrome.cookies.getAll({ url: baseOrigin });

      // Supabase SSR stores the session as base64-encoded JSON in a cookie
      // named sb-{ref}-auth-token (possibly chunked with .0, .1 suffixes).
      // Multiple Supabase connections (direct + custom domain) may have
      // different cookie prefixes (e.g. sb-tewtfro...-auth-token vs sb-api-auth-token).
      // Group by prefix and pick the first valid group.
      const authCookies = allCookies.filter(
        (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"),
      );

      // Group by prefix: everything before "-auth-token"
      const groups = new Map<string, typeof authCookies>();
      for (const c of authCookies) {
        const prefixEnd = c.name.indexOf("-auth-token");
        const prefix = c.name.substring(0, prefixEnd);
        if (!groups.has(prefix)) groups.set(prefix, []);
        groups.get(prefix)!.push(c);
      }

      // Pick the first group with a non-expired token (try each prefix).
      // Expired tokens still parse but Supabase returns empty data for them.
      const chunks: typeof authCookies = [];
      for (const [, group] of groups) {
        const sorted = group.sort((a, b) => a.name.localeCompare(b.name));
        const raw = sorted.map((c) => c.value).join("");
        const b64 = raw.startsWith("base64-") ? raw.slice(7) : raw;
        try {
          const json = atob(b64);
          const session = JSON.parse(json);
          const token = session.access_token ?? session[0];
          if (!token) continue;
          // Check JWT expiry: decode payload (second segment) and check exp
          const payloadB64 = token.split(".")[1];
          if (payloadB64) {
            const payload = JSON.parse(atob(payloadB64));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
              continue; // Token expired — try next group
            }
          }
          chunks.push(...sorted);
          break;
        } catch {
          // Try next group
        }
      }

      if (chunks.length > 0) {
        // Join chunk values (the cookie value is base64-encoded JSON)
        const raw = chunks.map((c) => c.value).join("");
        // Supabase SSR wraps the value as "base64-{base64data}"
        const b64 = raw.startsWith("base64-") ? raw.slice(7) : raw;
        try {
          const json = atob(b64);
          const session = JSON.parse(json);
          const accessToken = session.access_token ?? session[0]; // array format: [access_token, refresh_token]
          if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
          }
        } catch {
          // Could not decode — fall through without auth
          console.warn("[QueuePoll] Failed to decode Supabase auth cookie");
        }
      }
    } catch {
      // chrome.cookies failed — no auth available
    }

    return fetch(url, { ...init, headers });
  }

  /** Guard against concurrent queue polls (alarm + check_queue overlap). */
  let isQueuePolling = false;

  /** Extracted so it can be invoked by both the alarm and check_queue message. */
  async function runQueuePoll(): Promise<{ publish: number; delist: number; error?: string }> {
    if (isQueuePolling) {
      console.log("[QueuePoll] Already polling — skipping this cycle");
      return { publish: 0, delist: 0, error: "already_polling" };
    }
    isQueuePolling = true;
    try {
      return await _runQueuePollImpl();
    } finally {
      isQueuePolling = false;
    }
  }

  async function _runQueuePollImpl(): Promise<{ publish: number; delist: number; error?: string }> {
    const baseUrl = await getWrenlistBaseUrl();
    let publishCount = 0;
    let delistCount = 0;

    // --- Poll publish-queue ---
    try {
      const pubRes = await queueFetch(`${baseUrl}/api/marketplace/publish-queue`);
      if (!pubRes.ok) {
        console.warn(`[QueuePoll] Publish queue returned ${pubRes.status} — user may not be logged in to ${baseUrl}`);
      }
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        const items = pubData.data ?? [];
        await remoteLog("info", "queue", `Poll returned ${items.length} item(s)`);

        for (const item of items) {
          const mp = item.marketplace as SupportedMarketplace;
          const find = item.find;
          if (!find) {
            await remoteLog("warn", "queue", `Skipping item — no find data`, { itemId: item.id });
            continue;
          }

          // Check retry count — skip items that have exhausted retries
          const existingFields = (item.fields as Record<string, unknown>) ?? {};
          const retryCount = typeof existingFields.retry_count === "number"
            ? existingFields.retry_count
            : 0;

          await remoteLog("info", "queue", `Publishing "${find.name}" to ${mp} (attempt ${retryCount + 1})`, {
            findId: find.id,
            marketplace: mp,
          });
          console.log(`[QueuePoll] Publishing ${find.name} to ${mp} (attempt ${retryCount + 1}/${MAX_PUBLISH_RETRIES})...`);

          // Build Product from find data, enriched with per-platform overrides
          const listingPrice = item.listing_price ?? find.asking_price_gbp ?? 0;
          const shopifyCategory = item.platform_category_id
            ? [item.platform_category_id]
            : mapCategoryToShopify(find.category);
          const weightGrams = find.shipping_weight_grams;

          // Extract platform-specific fields (set in add-find form, stored in finds.platform_fields)
          const pf = (find.platform_fields ?? {}) as Record<string, unknown>;
          const sharedFields = (pf.shared ?? {}) as Record<string, unknown>;
          const vintedFields = (pf.vinted ?? {}) as Record<string, unknown>;
          const vintedMeta = (vintedFields.vintedMetadata ?? {}) as Record<string, unknown>;
          const vintedPrimaryColor = typeof vintedFields.primaryColor === "number" ? vintedFields.primaryColor : null;
          const vintedSecondaryColor = typeof vintedFields.secondaryColor === "number" ? vintedFields.secondaryColor : null;
          let vintedColorIds = [vintedPrimaryColor, vintedSecondaryColor].filter((id): id is number => id !== null && id > 0);
          // Fallback: use color_ids from vintedMetadata (set during import)
          if (vintedColorIds.length === 0 && Array.isArray(vintedMeta.color_ids)) {
            vintedColorIds = (vintedMeta.color_ids as number[]).filter((id): id is number => typeof id === "number" && id > 0);
          }

          // Extract shared form fields for cross-platform use
          const userTags = typeof sharedFields.tags === "string" && sharedFields.tags.trim() ? sharedFields.tags.trim() : null;
          const userWhenMade = typeof sharedFields.whenMade === "string" ? sharedFields.whenMade : undefined;
          const userWhoMade = typeof sharedFields.whoMade === "string" ? sharedFields.whoMade : undefined;
          const secondaryColour = typeof sharedFields.secondaryColour === "string" ? sharedFields.secondaryColour : undefined;
          const depopStyleTags = typeof sharedFields.depopStyleTags === "string" ? (sharedFields.depopStyleTags as string).split(",").filter(Boolean) : [];
          const depopSource = typeof sharedFields.depopSource === "string" ? (sharedFields.depopSource as string).split(",").filter(Boolean) : [];
          const depopAge = typeof sharedFields.depopAge === "string" ? sharedFields.depopAge as string : undefined;
          const vintedMaterialIds = Array.isArray(vintedFields.material) ? vintedFields.material.filter((id): id is number => typeof id === "number") : [];
          const parsedSizeId = typeof sharedFields.vintedSizeId === "string" ? parseInt(sharedFields.vintedSizeId as string, 10) : null;
          const vintedSizeId = (parsedSizeId !== null && !isNaN(parsedSizeId) && parsedSizeId > 0) ? parsedSizeId : null;

          // Map category per marketplace.
          // Priority: platform_category_id from publish-queue (resolved from 570-leaf tree)
          //         → hardcoded extension maps (fallback)
          //         → raw category string (last resort)
          const treeCategoryId = item.platform_category_id as string | null;
          const productCategory = mp === "shopify"
            ? shopifyCategory
            : mp === "facebook"
            ? mapCategoryToFacebook(find.category, treeCategoryId)
            : mp === "depop" && treeCategoryId
            ? treeCategoryId.split("|") // Tree stores Depop IDs as "dept|group|type" pipe-separated
            : mp === "depop"
            ? mapCategoryToDepop(find.category) // Fallback to hardcoded map
            : find.category ? [find.category] : [];

          const product: Product = {
            id: find.id,
            marketPlaceId: find.id,
            title: find.name ?? "Untitled",
            description: find.description ?? "",
            price: listingPrice,
            images: find.photos ?? [],
            brand: find.brand ?? undefined,
            condition: mapCondition(find.condition),
            category: productCategory,
            tags: userTags ?? [find.brand, find.category, "vintage"].filter(Boolean).join(", "),
            color: find.colour ?? undefined,
            color2: secondaryColour ?? undefined,
            styleTags: depopStyleTags.length > 0 ? depopStyleTags : undefined,
            // Size: Vinted uses numeric vintedSizeId, Depop needs [variantSetId, variantId],
            // other platforms use the raw text size
            size: mp === "vinted" && vintedSizeId ? [String(vintedSizeId)]
              : mp === "depop" ? resolveDepopSize(find.category, find.size)
              : find.size ? [find.size] : undefined,
            sku: find.sku ?? undefined,
            quantity: 1,
            whenMade: userWhenMade,
            acceptOffers: true,
            shipping: {
              // Facebook UK only supports local pickup; others use OwnLabel shipping
              shippingType: mp === "facebook" ? "Pickup" : "OwnLabel",
              shippingWeight: weightGrams
                ? {
                    value: weightGrams,
                    unit: "Grams",
                    inGrams: weightGrams,
                    inOunces: Math.round(weightGrams * 0.03527 * 100) / 100,
                  }
                : undefined,
              shippingAddress: {
                city: "London",
                country: "UK",
                lat: 51.5074,
                lng: -0.1278,
              },
              domesticShipping: mp === "facebook" ? 0 : 4,
              sellerPays: false,
              allowLocalPickup: true,
            },
            // Pass platform_category_id as vintedCatalogId for Vinted mapper
            ...(mp === "vinted" && item.platform_category_id
              ? { vintedCatalogId: Number(item.platform_category_id) }
              : {}),
            dynamicProperties: {
              productType: mapProductType(find.category),
              ...(vintedColorIds.length > 0 ? { colorIds: vintedColorIds } : {}),
              ...(vintedMaterialIds.length > 0 ? { MaterialVinted: vintedMaterialIds.join("|") } : {}),
              ...(userWhoMade ? { whoMade: userWhoMade } : {}),
              ...(depopSource.length > 0 ? { Source: depopSource[0] } : {}),
              ...(depopAge ? { age: depopAge } : {}),
              // Vinted-specific: pass catalogId, packageSizeId, ISBN from vintedMetadata
              ...(mp === "vinted" && item.platform_category_id
                ? { vintedCatalogId: Number(item.platform_category_id) }
                : {}),
              ...(mp === "vinted" && vintedMeta?.package_size_id
                ? { packageSizeId: Number(vintedMeta.package_size_id) }
                : {}),
              // ISBN + Language for book categories — triggers Vinted language_book attribute
              ...(sharedFields.isbn ? { ISBN: String(sharedFields.isbn) } : {}),
              ...(sharedFields.language ? { Language: String(sharedFields.language) } : { Language: 'English' }),
              // Video games: content rating + platform
              ...(sharedFields.contentRating ? { "Content rating": String(sharedFields.contentRating) } : {}),
              ...(sharedFields.gamePlatform ? { Platform: String(sharedFields.gamePlatform) } : {}),
              // Single material fallback (when MaterialVinted array isn't set)
              ...(vintedMaterialIds.length === 0 && sharedFields.material
                ? { materialId: String(sharedFields.material) }
                : {}),
            },
          };

          // --- Idempotency check: skip publish if already done this session ---
          // If the item is back in needs_publish (user retried), clear the cache
          const idempotencyKey = `${find.id}_${mp}`;
          if (publishedThisSession.has(idempotencyKey) && retryCount === 0) {
            // Item was re-queued (retry_count reset to 0) — clear stale cache
            publishedThisSession.delete(idempotencyKey);
          }
          const cachedResult = publishedThisSession.get(idempotencyKey);
          if (cachedResult) {
            console.log(`[QueuePoll] Already published ${find.name} to ${mp} this session — retrying report-back only`);
            await remoteLog("info", "queue", `Idempotency hit for ${find.name} on ${mp} — skipping publish, retrying report`);
            // Retry the report-back with the cached result
            try {
              const reportStatus = mp === "etsy"
                ? (cachedResult.publishMode === "publish" ? "listed" : "draft")
                : "listed";
              await queueFetch(`${baseUrl}/api/marketplace/publish-queue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  find_id: item.find_id,
                  marketplace: mp,
                  status: reportStatus,
                  platform_listing_id: cachedResult.listingId ?? null,
                  platform_listing_url: cachedResult.listingUrl ?? null,
                }),
              });
              console.log(`[QueuePoll] Report-back retry succeeded for ${find.name} on ${mp}`);
              publishCount++;
            } catch (e) {
              console.warn(`[QueuePoll] Report-back retry failed for ${find.name} on ${mp}:`, e);
            }
            continue;
          }

          // Pass settings with TLD overrides for UK marketplaces
          // Read publishMode from PMD fields if present (default: "publish" for Etsy)
          const itemFields = (item as Record<string, unknown>).fields as Record<string, unknown> | undefined;
          const publishOptions = {
            settings: {
              ...(item.settings ?? {}),
              depopTld: "co.uk",
              facebookTld: "co.uk",
            },
            publishMode: (itemFields?.publishMode as "draft" | "publish" | undefined) ?? "publish",
          };
          let result: Awaited<ReturnType<typeof publishToMarketplace>>;
          try {
            await remoteLog("info", "queue", `Calling publishToMarketplace for ${mp}`);
            result = await publishToMarketplace(mp, product, publishOptions);
            await remoteLog("info", "queue", `publishToMarketplace returned`, {
              success: result.success,
              message: result.message?.substring(0, 200),
              ...(result.success ? {} : { internalErrors: (result as unknown as Record<string, unknown>).internalErrors?.toString().substring(0, 500) }),
            });
            // Cache successful publish for idempotency
            if (result.success) {
              publishedThisSession.set(idempotencyKey, {
                listingId: result.product?.id ? String(result.product.id) : undefined,
                listingUrl: result.product?.url ?? undefined,
                publishMode: (result as unknown as Record<string, unknown>).publishMode as "draft" | "publish" | undefined,
              });
            }
          } catch (publishError) {
            // publishToMarketplace threw (e.g. not logged in, CSRF missing) — treat as a failed attempt
            // Mapper throws {success, message, errors} objects — extract message properly
            const errorMsg = publishError instanceof Error
              ? publishError.message
              : typeof publishError === 'object' && publishError !== null && 'message' in publishError
                ? String((publishError as { message: string }).message)
                : JSON.stringify(publishError).substring(0, 500);
            await remoteLog("error", "queue", `publishToMarketplace threw: ${errorMsg}`);
            const nextRetryCount = retryCount + 1;
            console.error(`[QueuePoll] ${mp} threw for ${find.name}: ${errorMsg} (attempt ${nextRetryCount}/${MAX_PUBLISH_RETRIES})`);
            try {
              await queueFetch(`${baseUrl}/api/marketplace/publish-queue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  find_id: item.find_id,
                  marketplace: mp,
                  status: nextRetryCount >= MAX_PUBLISH_RETRIES ? "error" : "needs_publish",
                  error_message: errorMsg,
                  fields: { ...existingFields, retry_count: nextRetryCount },
                }),
              });
            } catch { /* ignore reporting failure */ }
            continue;
          }

          // Report back to Wrenlist API
          try {
            if (result.success) {
              // Etsy returns publishMode ("draft" or "publish") from the result.
              // Other marketplaces publish directly via API → always "listed".
              const reportStatus = mp === "etsy"
                ? ((result as unknown as Record<string, unknown>).publishMode === "publish" ? "listed" : "draft")
                : "listed";
              const reportBody: Record<string, unknown> = {
                find_id: item.find_id,
                marketplace: mp,
                status: reportStatus,
                platform_listing_id: result.product?.id ? String(result.product.id) : null,
                platform_listing_url: result.product?.url ?? null,
              };

              // Include collection name and product type for Shopify
              if (mp === "shopify") {
                const productType = product.dynamicProperties?.productType;
                if (productType) {
                  reportBody.fields = { collection_name: productType };
                }
              }

              await queueFetch(`${baseUrl}/api/marketplace/publish-queue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reportBody),
              });
              console.log(`[QueuePoll] Published ${find.name} to ${mp}`);
              publishCount++;
            } else if (result.needsLogin) {
              // Auth failure — don't retry, report immediately
              console.error(`[QueuePoll] ${mp} auth failure for ${find.name}: not logged in`);
              await queueFetch(`${baseUrl}/api/marketplace/publish-queue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  find_id: item.find_id,
                  marketplace: mp,
                  status: "error",
                  error_message: result.message || `Not logged in to ${mp}. Please log in and try again.`,
                }),
              });
            } else {
              // Publish failed — check if we should retry or mark as error
              const nextRetryCount = retryCount + 1;
              // Include full error details (e.g. Vinted validation errors) in the message
              const errorDetail = (result as any).errors ? JSON.stringify((result as any).errors) : '';
              const errorMsg = errorDetail
                ? `${result.message ?? "Unknown publish error"} | ${errorDetail.substring(0, 500)}`
                : (result.message ?? "Unknown publish error");

              if (nextRetryCount >= MAX_PUBLISH_RETRIES) {
                // Exhausted retries — report error to API
                console.error(`[QueuePoll] Failed to publish ${find.name} to ${mp} after ${MAX_PUBLISH_RETRIES} attempts: ${errorMsg}`);
                await queueFetch(`${baseUrl}/api/marketplace/publish-queue`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    find_id: item.find_id,
                    marketplace: mp,
                    status: "error",
                    error_message: errorMsg,
                    fields: { ...existingFields, retry_count: nextRetryCount },
                  }),
                });
              } else {
                // Still have retries left — update retry_count in fields but keep needs_publish
                console.warn(`[QueuePoll] Publish attempt ${nextRetryCount}/${MAX_PUBLISH_RETRIES} failed for ${find.name} on ${mp}: ${errorMsg}. Will retry.`);
                await queueFetch(`${baseUrl}/api/marketplace/publish-queue`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    find_id: item.find_id,
                    marketplace: mp,
                    status: "needs_publish",
                    error_message: errorMsg,
                    fields: { ...existingFields, retry_count: nextRetryCount },
                  }),
                });
              }
            }
          } catch (e) {
            console.warn("[QueuePoll] Failed to report publish result:", e);
          }
        }
      }
    } catch (e) {
      // Silently fail — user may not be logged in
      console.debug("[QueuePoll] Publish queue poll failed:", e);
    }

    // --- Poll delist-queue ---
    try {
      const delRes = await queueFetch(`${baseUrl}/api/marketplace/delist-queue`);
      if (delRes.ok) {
        const delData = await delRes.json();
        const items = delData.data ?? [];

        for (const item of items) {
          const mp = item.marketplace as SupportedMarketplace;
          const listingId = item.platform_listing_id;
          if (!listingId) continue;

          const existingFields = (item.fields as Record<string, unknown>) ?? {};
          const retryCount = typeof existingFields.retry_count === "number"
            ? existingFields.retry_count
            : 0;

          console.log(`[QueuePoll] Delisting ${listingId} from ${mp} (attempt ${retryCount + 1}/${MAX_PUBLISH_RETRIES})...`);

          // Pass settings (e.g. shopifyShopUrl) from the queue item
          const delistOptions = item.settings ? { settings: item.settings } : {};
          let result: Awaited<ReturnType<typeof delistFromMarketplace>>;
          try {
            result = await delistFromMarketplace(mp, listingId, delistOptions);
          } catch (delistError) {
            const errorMsg = delistError instanceof Error ? delistError.message : String(delistError);
            const nextRetryCount = retryCount + 1;
            console.error(`[QueuePoll] ${mp} delist threw for ${listingId}: ${errorMsg} (attempt ${nextRetryCount}/${MAX_PUBLISH_RETRIES})`);
            try {
              await queueFetch(`${baseUrl}/api/marketplace/delist-queue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  find_id: item.find_id,
                  marketplace: mp,
                  status: nextRetryCount >= MAX_PUBLISH_RETRIES ? "error" : "needs_delist",
                  error_message: errorMsg,
                  fields: { ...existingFields, retry_count: nextRetryCount },
                }),
              });
            } catch { /* ignore reporting failure */ }
            continue;
          }

          // Report back to Wrenlist API
          try {
            if (result.success) {
              await queueFetch(`${baseUrl}/api/marketplace/delist-queue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  find_id: item.find_id,
                  marketplace: mp,
                }),
              });
              console.log(`[QueuePoll] Delisted ${listingId} from ${mp}`);
              delistCount++;
            } else if (result.needsLogin) {
              // Auth failure — don't retry, report immediately
              console.error(`[QueuePoll] ${mp} delist auth failure for ${listingId}: not logged in`);
              await queueFetch(`${baseUrl}/api/marketplace/delist-queue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  find_id: item.find_id,
                  marketplace: mp,
                  status: "error",
                  error_message: result.message || `Not logged in to ${mp}. Please log in and try again.`,
                }),
              });
            } else {
              const nextRetryCount = retryCount + 1;
              const errorMsg = result.message ?? "Unknown delist error";

              if (nextRetryCount >= MAX_PUBLISH_RETRIES) {
                console.error(`[QueuePoll] Failed to delist ${listingId} from ${mp} after ${MAX_PUBLISH_RETRIES} attempts: ${errorMsg}`);
                await queueFetch(`${baseUrl}/api/marketplace/delist-queue`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    find_id: item.find_id,
                    marketplace: mp,
                    status: "error",
                    error_message: errorMsg,
                    fields: { ...existingFields, retry_count: nextRetryCount },
                  }),
                });
              } else {
                console.warn(`[QueuePoll] Delist attempt ${nextRetryCount}/${MAX_PUBLISH_RETRIES} failed for ${listingId} on ${mp}: ${errorMsg}. Will retry.`);
                await queueFetch(`${baseUrl}/api/marketplace/delist-queue`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    find_id: item.find_id,
                    marketplace: mp,
                    status: "needs_delist",
                    error_message: errorMsg,
                    fields: { ...existingFields, retry_count: nextRetryCount },
                  }),
                });
              }
            }
          } catch (e) {
            console.warn("[QueuePoll] Failed to report delist result:", e);
          }
        }
      }
    } catch (e) {
      console.debug("[QueuePoll] Delist queue poll failed:", e);
    }

    return { publish: publishCount, delist: delistCount };
  }

  // --- Job queue polling (new system, feature-flagged) ---
  async function runJobQueuePoll(): Promise<{ processed: number; error?: string }> {
    if (isQueuePolling) {
      return { processed: 0, error: "already_polling" };
    }
    isQueuePolling = true;
    try {
      return await _runJobQueuePollImpl();
    } finally {
      isQueuePolling = false;
    }
  }

  async function _runJobQueuePollImpl(): Promise<{ processed: number; error?: string }> {
    const baseUrl = await getWrenlistBaseUrl();
    let processed = 0;

    try {
      const pollRes = await queueFetch(`${baseUrl}/api/jobs/poll`);
      if (!pollRes.ok) {
        console.warn(`[JobQueue] Poll returned ${pollRes.status}`);
        return { processed: 0 };
      }

      const pollData = await pollRes.json();
      const jobs = (pollData?.data ?? pollData) as Array<Record<string, any>>;
      if (!Array.isArray(jobs) || jobs.length === 0) return { processed: 0 };

      for (const job of jobs) {
        try {
          // 1. Claim
          const claimRes = await queueFetch(`${baseUrl}/api/jobs/poll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: job.id, action: "claim" }),
          });
          if (!claimRes.ok) {
            console.warn(`[JobQueue] Failed to claim job ${job.id}: ${claimRes.status}`);
            continue;
          }

          // 2. Start — abort if another worker already took it
          const startRes = await queueFetch(`${baseUrl}/api/jobs/poll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: job.id, action: "start" }),
          });
          if (!startRes.ok) {
            console.warn(`[JobQueue] Failed to start job ${job.id}: ${startRes.status}`);
            continue;
          }

          // 3. Execute
          const mp = job.platform as SupportedMarketplace;
          const payload = (job.payload || {}) as Record<string, any>;

          if (job.action === "publish") {
            const findData = payload.find || {};
            const pf = (findData.platform_fields || {}) as Record<string, unknown>;
            const sharedFields = (pf.shared ?? {}) as Record<string, unknown>;
            const vintedFields = (pf.vinted ?? {}) as Record<string, unknown>;
            const listingPrice = payload.listing_price ?? findData.asking_price_gbp ?? 0;

            // Build product matching the old PMD publish path
            const product: Product = {
              id: findData.id || job.find_id || "",
              marketPlaceId: findData.id || job.find_id || "",
              title: findData.name || findData.title || "",
              description: findData.description || "",
              category: findData.category ? [findData.category] : [],
              price: listingPrice,
              images: (findData.photos || []) as string[],
              sku: findData.sku || "",
              brand: findData.brand || undefined,
              condition: mapCondition(findData.condition),
              color: findData.colour || findData.color || undefined,
              size: findData.size ? [findData.size] : undefined,
              tags: typeof sharedFields.tags === "string" && sharedFields.tags.trim()
                ? sharedFields.tags.trim()
                : [findData.brand, findData.category, "vintage"].filter(Boolean).join(", "),
              quantity: 1,
              acceptOffers: true,
              whenMade: typeof sharedFields.whenMade === "string" ? sharedFields.whenMade : undefined,
              shipping: {
                shippingType: mp === "facebook" ? "Pickup" : "OwnLabel",
                shippingWeight: (() => {
                  const w = typeof vintedFields.shippingWeight === "number"
                    ? vintedFields.shippingWeight
                    : (findData.shipping_weight_grams ?? 500);
                  return {
                    value: w,
                    unit: "Grams",
                    inGrams: w,
                    inOunces: Math.round(w * 0.03527 * 100) / 100,
                  };
                })(),
                shippingAddress: { city: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
                domesticShipping: mp === "facebook" ? 0 : 4,
                sellerPays: false,
                allowLocalPickup: true,
              },
              dynamicProperties: {},
            };

            const publishOptions: Record<string, any> = {};
            if (mp === "shopify" && payload.settings?.shopifyShopUrl) {
              publishOptions.shopifyShopUrl = payload.settings.shopifyShopUrl;
            }
            if (mp === "etsy" && payload.fields?.publishMode) {
              publishOptions.publishMode = payload.fields.publishMode;
            }

            const result = await publishToMarketplace(mp, product, publishOptions);

            if (result.success) {
              const reportStatus =
                mp === "etsy" && (result as any).publishMode !== "publish"
                  ? "draft"
                  : "listed";
              await queueFetch(`${baseUrl}/api/jobs/poll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job_id: job.id,
                  action: "complete",
                  result: {
                    status: reportStatus,
                    platform_listing_id: result.product?.id
                      ? String(result.product.id)
                      : null,
                    platform_listing_url: result.product?.url ?? null,
                  },
                }),
              });
              processed++;
            } else if (result.needsLogin) {
              await queueFetch(`${baseUrl}/api/jobs/poll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job_id: job.id,
                  action: "fail",
                  error_message: `Not logged in to ${mp}`,
                }),
              });
            } else {
              await queueFetch(`${baseUrl}/api/jobs/poll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job_id: job.id,
                  action: "fail",
                  error_message: result.message || `Publish to ${mp} failed`,
                }),
              });
            }
          } else if (job.action === "delist") {
            const listingId = payload.platform_listing_id;
            if (!listingId) {
              await queueFetch(`${baseUrl}/api/jobs/poll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job_id: job.id,
                  action: "fail",
                  error_message: "No platform_listing_id in payload",
                }),
              });
              continue;
            }

            const delistOptions: Record<string, any> = {};
            if (mp === "shopify" && payload.settings?.shopifyShopUrl) {
              delistOptions.shopifyShopUrl = payload.settings.shopifyShopUrl;
            }

            const result = await delistFromMarketplace(mp, String(listingId), delistOptions);

            if (result.success) {
              await queueFetch(`${baseUrl}/api/jobs/poll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ job_id: job.id, action: "complete" }),
              });
              processed++;
            } else {
              await queueFetch(`${baseUrl}/api/jobs/poll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job_id: job.id,
                  action: "fail",
                  error_message: result.message || `Delist from ${mp} failed`,
                }),
              });
            }
          }
        } catch (err) {
          const errMsg = normalizeError(err);
          console.error(`[JobQueue] Error processing job ${job.id}:`, errMsg);
          await queueFetch(`${baseUrl}/api/jobs/poll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_id: job.id,
              action: "fail",
              error_message: errMsg,
            }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.debug("[JobQueue] Poll failed:", e);
    }

    return { processed };
  }

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === HEARTBEAT_ALARM) {
      await sendHeartbeat();
    } else if (alarm.name === QUEUE_POLL_ALARM) {
      // Use cached flag (synchronous) to avoid async race with isQueuePolling guard
      if (cachedUseJobQueue) {
        await runJobQueuePoll();
      } else {
        await runQueuePoll();
      }
    } else if (alarm.name === VINTED_SALES_SYNC_ALARM) {
      await runVintedSalesSync();
    } else if (alarm.name === STATS_REFRESH_ALARM) {
      await runStatsRefresh();
    }
  });

  chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (!message || (!("action" in message) && !("type" in message))) {
      sendResponse(withError("Unknown action"));
      return false;
    }

    // Handle check_queue/poll_queue inside the IIFE so it can access runQueuePoll
    const cmd = normalizeCommand(message as ExternalMessage);
    if (cmd === "check_queue" || cmd === "poll_queue") {
      void (cachedUseJobQueue ? runJobQueuePoll() : runQueuePoll())
        .then((result) => sendResponse(withExtensionVersion({ success: true, ...result })))
        .catch((error) => sendResponse(withError(error)));
      return true;
    }
    if (cmd === "set_job_queue") {
      const enabled = !!(message as any).enabled;
      cachedUseJobQueue = enabled; // Update cached flag immediately
      void chrome.storage.sync.set({ [USE_JOB_QUEUE_KEY]: enabled })
        .then(() => sendResponse(withExtensionVersion({ success: true, useJobQueue: enabled })))
        .catch((error) => sendResponse(withError(error)));
      return true;
    }
    if (cmd === "get_logs") {
      void (async () => {
        const stored = await chrome.storage.local.get(["_debugLogs"]);
        const logs = (stored._debugLogs as Array<Record<string, unknown>>) ?? [];
        sendResponse(withExtensionVersion({ success: true, logs }));
      })().catch((error) => sendResponse(withError(error)));
      return true;
    }
    if (cmd === "clear_logs") {
      void chrome.storage.local.remove("_debugLogs")
        .then(() => sendResponse(withExtensionVersion({ success: true })))
        .catch((error) => sendResponse(withError(error)));
      return true;
    }
    if (cmd === "debug_cookies") {
      void (async () => {
        const baseUrl = await getWrenlistBaseUrl();
        const cookies = await chrome.cookies.getAll({ url: baseUrl });
        const names = cookies.map((c) => c.name);
        // Try the fetch and report the status
        const res = await queueFetch(`${baseUrl}/api/marketplace/publish-queue`);
        const body = await res.text();
        sendResponse(withExtensionVersion({
          success: true,
          baseUrl,
          cookieCount: cookies.length,
          cookieNames: names,
          fetchStatus: res.status,
          fetchBody: body.substring(0, 200),
        }));
      })().catch((error) => sendResponse(withError(error)));
      return true;
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
      case "get_auth_info":
        // Popup requests auth + plan info via background (which can read cookies)
        void (async () => {
          try {
            const res = await queueFetch(`${DEFAULT_WRENLIST_BASE_URL}/api/auth/me`, {
              headers: { Accept: "application/json" },
            });
            if (!res.ok) {
              sendResponse({ success: false, status: res.status });
              return;
            }
            const data = await res.json();
            // /api/auth/me now returns 200 with { user: null } when
            // unauthenticated; treat that as a failure for the popup.
            if (!data?.user) {
              sendResponse({ success: false, status: 401 });
              return;
            }
            sendResponse({ success: true, data });
          } catch (error) {
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true;
      case "get_marketplace_logins":
        // Popup requests live login status across all cookie-based marketplaces.
        // Server-side /api/auth/me only knows about OAuth connections (eBay, Shopify);
        // everything else the extension has to check from cookies.
        void (async () => {
          try {
            const marketplaces: SupportedMarketplace[] = [
              "vinted",
              "depop",
              "etsy",
              "facebook",
            ];
            const entries = await Promise.all(
              marketplaces.map(async (mp) => {
                try {
                  const ok = await checkMarketplaceLogin(mp);
                  return [mp, ok] as const;
                } catch {
                  return [mp, false] as const;
                }
              })
            );
            const results: Record<string, boolean> = {};
            for (const [mp, ok] of entries) results[mp] = ok;
            sendResponse({ success: true, results });
          } catch (error) {
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true;
      case "bg_fetch":
        // Generic authenticated fetch for popup (uses queueFetch with cookie auth)
        void (async () => {
          try {
            const fetchUrl = message.url;
            if (!fetchUrl || (!fetchUrl.startsWith("https://wrenlist.com/") && !fetchUrl.startsWith("https://app.wrenlist.com/"))) {
              sendResponse({ success: false, error: "Invalid URL" });
              return;
            }
            const res = await queueFetch(fetchUrl, {
              headers: { Accept: "application/json" },
            });
            if (!res.ok) {
              sendResponse({ success: false, status: res.status });
              return;
            }
            const data = await res.json();
            sendResponse({ success: true, data });
          } catch (error) {
            sendResponse({ success: false, error: String(error) });
          }
        })();
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
          } catch (e) {
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

async function dispatchExternalMessage(message: ExternalMessage) {
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
    case "get_depop_categories":
      return handleGetDepopCategories();
    case "get_depop_token":
      return handleGetDepopToken();
    case "probe_depop_api":
      return handleProbeDepopApi(message);
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
    case "fetch_depop_api":
    case "fetchdepopapi":
      return handleFetchDepopApi(message);
    case "get_vinted_listings":
    case "getvintedlistings":
      return handleGetVintedListings(message);
    case "fetch_wrenlist_api":
    case "fetchwrenlistapi":
      return handleFetchWrenlistApi(message);
    case "vinted_debug_info":
      return handleVintedDebugInfo();
    case "get_etsy_receipts":
    case "probe_etsy_receipts": {
      const rp = (message.params as Record<string, unknown>) ?? {};
      const rpPage = (rp.page as number | undefined) ?? (message.page as number | undefined) ?? 1;
      const rpStatus = (rp.status as "completed" | "open" | undefined) ?? "completed";
      return createEtsyServices().client.getReceipts(rpPage, rpStatus);
    }
    case "get_etsy_shop_stats":
      return createEtsyServices().client.getShopStats();
    case "get_etsy_listing_quality":
      return createEtsyServices().client.getListingQuality();
    case "probe_etsy_page": {
      const pp = (message.params as Record<string, unknown>) ?? {};
      const path = (pp.path as string) || (message.path as string) || "/your/account/payment";
      return createEtsyServices().client.probePageData(path);
    }
    case "get_etsy_listing_stats": {
      const sp = (message.params as Record<string, unknown>) ?? {};
      const listingIds = (sp.listingIds as string[] | undefined)
        ?? (message.listingIds as string[] | undefined)
        ?? [];
      if (listingIds.length === 0) throw new Error("listingIds required");
      return createEtsyServices().client.getListingStatsBatch(listingIds);
    }
    case "get_etsy_inventory": {
      const ip = (message.params as Record<string, unknown>) ?? {};
      const listingIds = (ip.listingIds as string[] | undefined)
        ?? (message.listingIds as string[] | undefined)
        ?? [];
      if (listingIds.length === 0) throw new Error("listingIds required");
      return createEtsyServices().client.syncInventory(listingIds);
    }
    case "set_etsy_auto_renew": {
      const arp = (message.params as Record<string, unknown>) ?? {};
      const listingId = (arp.listingId as string | undefined)
        ?? (message.listingId as string | undefined);
      const autoRenew = (arp.autoRenew as boolean | undefined)
        ?? (message.autoRenew as boolean | undefined);
      if (!listingId) throw new Error("listingId required");
      if (typeof autoRenew !== "boolean") throw new Error("autoRenew (boolean) required");
      return createEtsyServices().client.setAutoRenew(listingId, autoRenew);
    }

    // ── Etsy bulk operations ──────────────────────────────────────────
    case "etsy_bulk_update_price": {
      const bp = (message.params as Record<string, unknown>) ?? message;
      const items = (bp.items as Array<{ listingId: string; price: number }>) ?? [];
      if (items.length === 0) throw new Error("items required");
      return createEtsyServices().client.bulkUpdatePrice(items);
    }
    case "etsy_bulk_renew": {
      const bp = (message.params as Record<string, unknown>) ?? message;
      const ids = (bp.listingIds as string[]) ?? [];
      if (ids.length === 0) throw new Error("listingIds required");
      return createEtsyServices().client.bulkRenew(ids);
    }
    case "etsy_bulk_deactivate": {
      const bp = (message.params as Record<string, unknown>) ?? message;
      const ids = (bp.listingIds as string[]) ?? [];
      if (ids.length === 0) throw new Error("listingIds required");
      return createEtsyServices().client.bulkDeactivate(ids);
    }
    case "etsy_bulk_update_tags": {
      const bp = (message.params as Record<string, unknown>) ?? message;
      const items = (bp.items as Array<{ listingId: string; tags: string[] }>) ?? [];
      if (items.length === 0) throw new Error("items required");
      return createEtsyServices().client.bulkUpdateTags(items);
    }
    case "etsy_bulk_patch": {
      const bp = (message.params as Record<string, unknown>) ?? message;
      const items = (bp.items as Array<{ listingId: string; fields: Record<string, unknown> }>) ?? [];
      if (items.length === 0) throw new Error("items required");
      return createEtsyServices().client.bulkPatchListings(items);
    }
    case "etsy_bulk_delete": {
      const bp = (message.params as Record<string, unknown>) ?? message;
      const ids = (bp.listingIds as string[]) ?? [];
      if (ids.length === 0) throw new Error("listingIds required");
      return createEtsyServices().client.bulkDelete(ids);
    }

    case "get_etsy_shop_config": {
      const sp = (message.params as Record<string, unknown>) ?? {};
      const forceRefresh = (sp.forceRefresh as boolean | undefined)
        ?? (message.forceRefresh as boolean | undefined)
        ?? false;
      return createEtsyServices().client.getShopConfig(forceRefresh);
    }

    default:
      throw new Error(`Unsupported action: ${String(message.action ?? message.type ?? "unknown")}`);
  }
}

async function handlePublishCommand(message: ExternalMessage) {
  const marketplace = resolveMarketplace(message);
  const product = resolveProduct(message);
  const publishMode = (message.publishMode as "draft" | "publish" | undefined) ?? "draft";
  return withExtensionVersion(
    await publishToMarketplace(marketplace, product, {
      settings: resolveSettings(message),
      tld: resolveTldFromMessage(message, marketplace),
      publishMode,
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

async function handlePublishToShopify(message: ExternalMessage) {
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
      getCollectionIds: async () => [],
    });

    // Build Product from payload
    const product: Product = {
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
    
    // Now create a Vinted client with the detected TLD and bootstrap it.
    // IMPORTANT: this handler is invoked by the Wrenlist web app on a 60s
    // poll from multiple pages (dashboard, finds, listings, add-find) so it
    // MUST NOT open a background Vinted tab — that was the real source of
    // the "tab keeps popping up every minute" bug. We have the v_uid cookie
    // already, which is enough to confidently answer "logged in?". The
    // bootstrap call is pure enrichment (gets the display-name username via
    // CSRF'd API call). If it fails silently, we fall through to the cookie
    // value and report logged-in=true.
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
    } catch (bootstrapError) {
      // Silent bootstrap failed — most likely Cloudflare blocked the direct
      // fetch and we deliberately skipped the tab fallback. Not a real
      // problem: the cookie exists, so the user IS logged in. Return that
      // and let enrichment happen later (during an actual publish/delist).
      console.info("[Vinted] Session check: silent bootstrap deferred —", bootstrapError instanceof Error ? bootstrapError.message : bootstrapError);
      return {
        success: true,
        loggedIn: true, // Cookie exists, assume logged in
        username,
        tld,
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
      status:
        (params.status as 'all' | 'active' | 'sold' | undefined) ??
        (message.status as 'all' | 'active' | 'sold' | undefined),
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
    const startPage = (params.page as number | undefined) ?? (message.page as number | undefined) ?? 1;
    const perPage = (params.perPage as number | undefined) ?? (message.perPage as number | undefined) ?? 20;
    const tld = (params.tld as string | undefined) ?? (message.tld as string | undefined) ?? 'co.uk';
    const stopAtId = (params.stopAtId as string | undefined) ?? (message.stopAtId as string | undefined);
    // enrich: call getOrderDetails per sale for buyer/fees/shipment data
    const enrich = (params.enrich as boolean | undefined) ?? (message.enrich as boolean | undefined) ?? false;
    // pages: how many pages to fetch (default 1, for backfill pass e.g. 10)
    const totalPages = (params.pages as number | undefined) ?? (message.pages as number | undefined) ?? 1;

    const { client } = createVintedServices({ tld });
    await client.bootstrap(false, true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allSales: any[] = [];
    let stoppedEarly = false;
    let lastPagination: unknown = null;

    for (let p = startPage; p < startPage + totalPages; p++) {
      // Keep service worker alive during long backfills
      try { chrome.storage.local.set({ _keepAlive: Date.now() }); } catch { /* noop */ }

      const result = await client.getSales(p, perPage, stopAtId);
      lastPagination = result.pagination;

      if (!result.sales.length) break;

      let pageSales = result.sales;

      // Enrich each sale with full order details if requested
      if (enrich && pageSales.length > 0) {
        const enriched = [];
        for (const sale of pageSales) {
          try {
            const details = await client.getOrderDetails(sale.transactionId);
            enriched.push(details || sale);
            // Small delay to avoid Vinted rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch {
            enriched.push(sale);
          }
        }
        pageSales = enriched;
      }

      allSales = allSales.concat(pageSales);

      if (result.stoppedEarly) {
        stoppedEarly = true;
        break;
      }
    }

    return {
      success: true,
      sales: allSales,
      pagination: lastPagination,
      stoppedEarly,
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
    await client.bootstrap(false, true);

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
    await client.bootstrap(false, true);

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
    await client.bootstrap(false, true);

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
    await client.bootstrap(false, true);

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
    await client.bootstrap(false, true);

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
    await client.bootstrap(false, true);

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
    await client.bootstrap(false, true);

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
    await client.bootstrap(false, true);

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

function resolveProduct(message: ExternalMessage): Product {
  const product =
    (message.product as Product | undefined) ??
    (message.productData as Product | undefined) ??
    (message.payload as Product | undefined) ??
    (message.data as Product | undefined);

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

/**
 * Detect the user's Vinted TLD from the v_uid cookie domain.
 * Returns e.g. "co.uk", "com", "de". Falls back to "co.uk".
 */
async function detectVintedTld(): Promise<string> {
  try {
    const allCookies = await chrome.cookies.getAll({});
    const vUid = allCookies.find(c => c.domain.includes("vinted") && c.name === "v_uid");
    if (vUid) {
      const m = vUid.domain.match(/vinted\.([^.]+(?:\.[^.]+)?)$/);
      if (m?.[1]) return m[1];
    }
  } catch { /* cookie access failed */ }
  return "co.uk";
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

    const baseUrl = await getWrenlistBaseUrl(
      (message as { wrenlistBaseUrl?: string }).wrenlistBaseUrl,
    );
    const tld = resolveTldFromMessage(message, "vinted") ?? await detectVintedTld();
    const { client } = createVintedServices({ tld });
    await client.bootstrap(false, true);

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

    // Photo mirroring is handled server-side by the API route (mirrorPhotosToStorage)
    // No need for extension-side photo fetching (also blocked by CORS on Vinted CDN)

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
      await client.bootstrap(false, true);
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

async function handleGetDepopToken() {
  const cookies = await chrome.cookies.getAll({ domain: "depop.com" });
  const token = cookies.find(c => c.name === "access_token")?.value;
  const userId = cookies.find(c => c.name === "user_id")?.value;
  if (!token) return withExtensionVersion({ success: false, message: "No Depop access token" });
  return withExtensionVersion({ success: true, token, userId });
}

async function handleProbeDepopApi(message: ExternalMessage) {
  const cookies = await chrome.cookies.getAll({ domain: "depop.com" });
  const token = cookies.find(c => c.name === "access_token")?.value;
  const userId = cookies.find(c => c.name === "user_id")?.value;
  if (!token) return withExtensionVersion({ success: false, message: "No Depop token" });

  const endpoints = [
    "/api/v1/receipts/?role=seller",
    "/api/v1/receipts/?role=buyer",
    "/api/v1/receipts/?role=seller&status=all",
    "/api/v1/receipts/?role=seller&status=completed",
    "/api/v1/receipts/?role=seller&limit=5",
    "/api/v1/receipts/?role=seller&status=all&limit=5",
  ];

  const results: Record<string, { status: number; preview?: string }> = {};
  for (const ep of endpoints) {
    try {
      const r = await fetch(`https://webapi.depop.com${ep}`, {
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          accept: "application/json, text/plain, */*",
          ...(userId ? { "Depop-UserId": userId } : {}),
        },
        credentials: "include",
      });
      const text = await r.text();
      results[ep] = { status: r.status, preview: text.substring(0, 200) };
    } catch (e) {
      results[ep] = { status: 0, preview: String(e) };
    }
  }
  return withExtensionVersion({ success: true, results });
}

async function handleGetDepopCategories() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: "depop.com" });
    const token = cookies.find(c => c.name === "access_token")?.value;
    const userId = cookies.find(c => c.name === "user_id")?.value;
    if (!token) return withError("No Depop access token found");

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "accept": "application/json, text/plain, */*",
    };
    if (userId) headers["Depop-UserId"] = userId;

    const urls = [
      "https://webapi.depop.com/api/v2/categories/tree/?lang=en",
      "https://webapi.depop.com/api/v2/categories/?lang=en",
      "https://webapi.depop.com/api/v1/categories/tree/?lang=en",
      "https://webapi.depop.com/api/v1/categories/",
    ];

    for (const url of urls) {
      const res = await fetch(url, { headers, credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        return withExtensionVersion({ success: true, categories: data, url });
      }
    }

    return withError("All Depop category endpoints returned errors");
  } catch (e) {
    return withError(e);
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

function withExtensionVersion(result: ListingActionResult | Record<string, unknown>) {
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

  // Vinted creation timestamp (unix seconds) for platform_listed_at
  created_at_ts?: number;

  // Full Vinted metadata for relisting
  vintedMetadata?: VintedImportMetadata;

  // Photo thumbnails for faster UI loading
  photoThumbnails?: string[];
}

/**
 * Fetches Vinted wardrobe listings for preview (no import).
 * Returns paginated listing summaries so the import page can display them
 * and let the user select which ones to import.
 */
async function handleGetVintedListings(message: ExternalMessage) {
  try {
    const tld = resolveTldFromMessage(message, "vinted") ?? await detectVintedTld();
    const { client } = createVintedServices({ tld });
    await client.bootstrap(false, true);
    const loggedIn = await client.checkLogin();
    if (!loggedIn) {
      return withExtensionVersion({
        success: false,
        message: "Please log in to your Vinted account and try again.",
        needsLogin: true,
        listings: [],
        total: 0,
      });
    }

    const page = String((message as { page?: number | string }).page ?? "1");
    const perPage = resolvePositiveInteger(
      (message as { perPage?: number | string }).perPage,
      96,
      96,
    );
    const status =
      ((message as { status?: string }).status?.toLowerCase() as
        | "active"
        | "sold"
        | "hidden"
        | "all") ?? "active";

    const result = await client.getListings(page, perPage, undefined, false, status);
    const products = result.products ?? [];

    const listings = products.map((p: any) => ({
      id: p.marketplaceId,
      title: p.title,
      price: p.price,
      photo: p.coverImage || null,
      url: p.marketplaceUrl || null,
      isSold: p.isSold ?? false,
      isHidden: p.isHidden ?? false,
    }));

    return withExtensionVersion({
      success: true,
      listings,
      total: result.pagination?.total_entries ?? listings.length,
      page: result.pagination?.current_page ?? 1,
      totalPages: result.pagination?.total_pages ?? 1,
      username: result.username ?? null,
    });
  } catch (error) {
    return withExtensionVersion({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch Vinted listings",
      listings: [],
      total: 0,
    });
  }
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
        const listing = mapProductToBatch(
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

  for (let i = 0; i < listingIds.length; i++) {
    const id = listingIds[i];
    try {
      const idString = String(id);
      const detail = await client.getListing(idString);
      if (!detail) {
        console.warn(`[Batch Import] Listing ${idString} not found or inaccessible`);
        continue;
      }
      const listing = mapProductToBatch(
        detail,
        client.getProductUrl(idString),
        status,
        tld,
      );
      listings.push(listing);

      // Polite delay every 5 items to avoid Vinted rate limiting
      if (i > 0 && i % 5 === 0) {
        await new Promise(r => setTimeout(r, 500));
      }
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

function mapProductToBatch(
  product: Product,
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
    // Derive status from item metadata flags if available, fall back to caller's status
    status: product.vintedMetadata?.is_sold || product.vintedMetadata?.is_closed ? "sold"
      : product.vintedMetadata?.is_hidden ? "hidden"
      : status,

    // Cross-marketplace fields
    originalPrice: product.originalPrice,
    acceptOffers: product.acceptOffers,
    tags: product.tags,
    sku: product.sku,
    quantity: product.quantity ?? 1,

    // Vinted creation timestamp (for platform_listed_at)
    created_at_ts: product.vintedMetadata?.created_at_ts,

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

  // Bootstrap the Vinted client so we can attach the authenticated
  // X-Csrf-Token + X-Anon-Id headers. Without these Vinted now 401s even
  // endpoints like /api/v2/users/{id} that used to be publicly readable.
  let csrfToken = "";
  let anonId = "";
  try {
    const tldMatch = url.match(/^https:\/\/www\.vinted\.([^/]+)/);
    const detectedTld = tldMatch?.[1] ?? "co.uk";
    const { client } = createVintedServices({ tld: detectedTld });
    await client.bootstrap();
    csrfToken = client.getCsrfToken();
    anonId = client.getAnonId();
  } catch (bootstrapError) {
    // Non-fatal — fall back to unauthenticated request. It will likely 401
    // but we return the error to the caller intact so they can diagnose.
    console.warn("[Vinted] fetch_vinted_api bootstrap failed:", bootstrapError);
  }

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  };
  if (csrfToken) headers["X-Csrf-Token"] = csrfToken;
  if (anonId) headers["X-Anon-Id"] = anonId;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers,
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

async function handleFetchDepopApi(message: ExternalMessage) {
  const url = message.url as string | undefined;

  // Validate URL
  if (!url) {
    throw new Error("URL is required");
  }

  if (!url.startsWith("https://webapi.depop.com/") && !url.startsWith("https://www.depop.com/")) {
    throw new Error("Only Depop URLs (https://webapi.depop.com/ or https://www.depop.com/) are allowed");
  }

  // Read auth from depop.com cookies (same pattern as DepopClient.ensureSession)
  const cookies = await new Promise<chrome.cookies.Cookie[]>((resolve, reject) => {
    chrome.cookies.getAll({ domain: "depop.com" }, (c) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(c);
    });
  });

  let bearerToken = "";
  let userId = "";
  for (const cookie of cookies) {
    if (cookie.name === "access_token") bearerToken = cookie.value;
    if (cookie.name === "user_id") userId = cookie.value;
  }

  if (!bearerToken || !userId) {
    return withExtensionVersion({
      success: false,
      error: "Not logged in to Depop — missing access_token or user_id cookie",
    });
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
        "Depop-UserId": userId,
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

async function handleFetchWrenlistApi(message: ExternalMessage) {
  const url = message.url as string | undefined;
  const method = (message.method as string | undefined) ?? "GET";

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
      return "new_with_tags";
    case Condition.NewWithoutTags:
      return "new_without_tags";
    case Condition.VeryGood:
      return "very_good";
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
  } catch (e) {
    return { success: false, lastError: e instanceof Error ? e.message : String(e) };
  }
}

export {};

