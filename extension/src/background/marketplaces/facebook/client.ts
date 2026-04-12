import {
  checkAlreadyExecuted,
  getLoggingInfo,
  log,
} from "../../shared/api.js";
import type {
  Product,
  MarketplaceListingResult,
  ShippingInfo,
} from "../../types.js";
import {
  FACEBOOK_BASE_URL,
  FACEBOOK_CATEGORY_CACHE_KEY,
  FACEBOOK_CATEGORY_PAGE_URL,
  FACEBOOK_CREATE_MUTATION_NAME,
  FACEBOOK_CREATE_URL,
  FACEBOOK_DELETE_MUTATION_NAME,
  FACEBOOK_DOC_IDS,
  FACEBOOK_GRAPHQL_URL,
  FACEBOOK_IMAGE_UPLOAD_URL,
  FACEBOOK_SELLING_QUERY_NAME,
  FACEBOOK_SELLING_URL,
} from "./constants.js";
import { FacebookMapper, type FacebookCarrierOption } from "./mapper.js";

interface ListingActionResult {
  success: boolean;
  message?: string;
  needsLogin?: boolean;
  product?: { id: string; url: string };
  internalErrors?: string;
}

interface ShippingOptionsResponse {
  shippingOptionsData?: Array<{
    commerce_shipping_carrier: string;
    cost_amount: number;
    cost_currency: string;
    shipping_service_type: string;
  }>;
}

export class FacebookClient {
  private user = "";
  private aParam = "";
  private cometReq = "";
  private fbDtsg = "";
  private targetId = "";

  private readonly mapper = new FacebookMapper({
    uploadImage: this.uploadImage.bind(this),
    fetchCarriers: this.fetchCarriers.bind(this),
  });
  public mapProduct(product: Product) {
    return this.mapper.map(product);
  }

  constructor(private readonly tld: string) {}

  public async bootstrap(force = false): Promise<void> {
    await this.ensureSession(force);
  }

  private async ensureSession(force = false): Promise<void> {
    if (!force && (await this.areParametersCached())) {
      this.user = (await this.getCachedParam("wrenlist_fb_actorid")) ?? "";
      this.aParam = (await this.getCachedParam("wrenlist_fb_a")) ?? "";
      this.cometReq =
        (await this.getCachedParam("wrenlist_fb_cometreq")) ?? "";
      this.fbDtsg =
        (await this.getCachedParam("wrenlist_fb_dtsg")) ?? "";
      this.targetId =
        (await this.getCachedParam("wrenlist_fb_targetid")) ?? "";
      return;
    }

    const html = await this.getHtml();
    this.user = await this.extractAndCache(
      "wrenlist_fb_actorid",
      /"actorId"\s*:\s*"([0-9]*)"/,
      html,
    );
    this.aParam = await this.extractAndCache(
      "wrenlist_fb_a",
      /__a=([0-9]*)/,
      html,
    );
    this.cometReq = await this.extractAndCache(
      "wrenlist_fb_cometreq",
      /comet_req=([0-9]*)/,
      html,
    );
    this.fbDtsg = await this.extractAndCache(
      "wrenlist_fb_dtsg",
      /"DTSGInitialData",\s*\[\s*\]\s*,\s*{\s*"token":\s*"(.*?)"/,
      html,
    );
    this.targetId = await this.extractAndCache(
      "wrenlist_fb_targetid",
      /__typename":.*?"Marketplace",.*?"id":.*?"([0-9]+)"/,
      html,
    );
  }

  public async postListing(product: Product): Promise<ListingActionResult> {
    try {
      await this.ensureSession();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found") || msg.includes("actorid") || msg.includes("dtsg")) {
        return { success: false, needsLogin: true, message: "Please make sure you are signed in to your Facebook account" };
      }
      throw err;
    }
    await this.storeCategories();

    let payload;
    try {
      payload = await this.mapper.map(product);
    } catch (mapError) {
      const msg = mapError instanceof Error ? mapError.message : String(mapError);
      return {
        success: false,
        message: msg || "Failed to prepare listing for Facebook.",
      };
    }
    try {
      return await this.postOrUpdate(payload);
    } catch (error) {
      return {
        success: false,
        message: "An unexpected error occurred while posting to Facebook.",
        internalErrors: JSON.stringify(error),
      };
    }
  }

  public async updateListing(
    product: Product,
  ): Promise<ListingActionResult> {
    await this.ensureSession();
    const payload = await this.mapper.map(product);
    const listingId = product.marketplaceId ?? product.marketPlaceId;
    if (!listingId) {
      throw new Error("Missing Facebook listing id");
    }
    return this.postOrUpdate(payload, listingId);
  }

  private async postOrUpdate(payload: Record<string, any>, listingId?: string) {
    const input: any = {
      input: {
        client_mutation_id: "1",
        actor_id: this.user,
        audience: {
          marketplace: { marketplace_id: this.targetId },
        },
        data: {
          common: payload,
        },
      },
    };

    if (listingId) {
      input.input.listing_id = listingId;
    }

    const mutationName = listingId
      ? "useCometMarketplaceListingEditMutation"
      : FACEBOOK_CREATE_MUTATION_NAME;

    const params = new URLSearchParams();
    params.append("fb_dtsg", this.fbDtsg);
    params.append("fb_api_req_friendly_name", mutationName);
    params.append("variables", JSON.stringify(input));
    params.append("__a", this.aParam);
    params.append(
      "doc_id",
      listingId ? FACEBOOK_DOC_IDS.editListing : FACEBOOK_DOC_IDS.createListing,
    );
    params.append("__comet_req", this.cometReq);

    const response = await fetch(FACEBOOK_GRAPHQL_URL, {
      method: "POST",
      body: params,
      credentials: "include",
      headers: {
        accept: "application/json, text/plain, */*",
        "x-fb-friendly-name": mutationName,
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    const json = await response.json();
    const created =
      json?.data?.marketplace_listing_create?.listing ??
      json?.data?.marketplace_listing_edit?.listing;

    if (created?.id) {
      const storyUrl = created.story?.url;
      return {
        success: true,
        product: {
          id: created.id,
          url:
            storyUrl ??
            `${FACEBOOK_BASE_URL}/marketplace/item/${created.id}/`,
        },
      };
    }

    const errors = json?.errors;
    if (Array.isArray(errors) && errors.length) {
      const first = errors[0];
      if (first.api_error_code === 200) {
        return {
          success: false,
          message: "Only local shipping is supported.",
          internalErrors: JSON.stringify(json),
        };
      }
      return {
        success: false,
        message: first.description ?? first.message,
        internalErrors: JSON.stringify(json),
      };
    }

    return {
      success: false,
      message: "Facebook did not return a valid response.",
      internalErrors: JSON.stringify(json),
    };
  }

  private async uploadImage(file: File, index: number) {
    await this.ensureSession();

    const form = new FormData();
    form.append("fb_dtsg", this.fbDtsg);
    form.append("qn", "comet_marketplace_composer");
    form.append("target_id", this.targetId);
    form.append("source", "8");
    form.append("profile_id", this.user);
    form.append("waterfallxapp", "comet");
    form.append("upload_id", `1024${index}`);

    await fetch(
      `${FACEBOOK_IMAGE_UPLOAD_URL}?fb_dtsg=${this.fbDtsg}&__a=${this.aParam}`,
      {
        method: "OPTIONS",
        body: form,
        credentials: "include",
      },
    );

    form.append("farr", file, "blob");
    const response = await fetch(
      `${FACEBOOK_IMAGE_UPLOAD_URL}?fb_dtsg=${this.fbDtsg}&__a=${this.aParam}`,
      {
        method: "POST",
        body: form,
        credentials: "include",
        headers: {
          accept: "application/json, text/plain, */*",
        },
      },
    );

    const text = await response.text();
    const trimmed = text.replace("for (;;);", "");
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed?.payload?.photoID) {
        console.error('[Facebook] Photo upload returned no photoID:', JSON.stringify(parsed).substring(0, 300));
      }
      return parsed;
    } catch {
      console.error('[Facebook] Photo upload response not JSON:', text.substring(0, 200));
      return {};
    }
  }

  private async fetchCarriers(
    categoryId: string,
    weight: ShippingInfo["shippingWeight"],
    price: number,
    currency = "USD",
  ): Promise<FacebookCarrierOption[]> {
    await this.ensureSession();
    const variables = {
      params: {
        eligibility_params: {
          category_id: categoryId,
          item_price: {
            currency,
            price: `${Math.round(price * 1000)}`,
          },
        },
        label_rate_type: "CALCULATED_ON_PACKAGE_DETAILS",
        shipping_package_weight: {
          big_weight: {
            unit: "POUND",
            value: 0,
          },
          small_weight: {
            unit: "OUNCE",
            value: weight?.inOunces ?? 0,
          },
        },
      },
    };

    const form = new FormData();
    form.append("fb_dtsg", this.fbDtsg);
    form.append(
      "fb_api_req_friendly_name",
      "useMarketplaceComposerCalculatedShippingOptionsQuery",
    );
    form.append("variables", JSON.stringify(variables));
    form.append("__a", this.aParam);
    form.append("doc_id", FACEBOOK_DOC_IDS.shippingOptions);
    form.append("__comet_req", this.cometReq);

    const response = await fetch(FACEBOOK_GRAPHQL_URL, {
      method: "POST",
      body: form,
      credentials: "include",
      headers: {
        accept: "application/json, text/plain, */*",
      },
    });

    const json = (await response.json()) as {
      data?: ShippingOptionsResponse;
    };
    return json.data?.shippingOptionsData ?? [];
  }

  public async delistListing(id: string): Promise<ListingActionResult> {
    try {
      await this.ensureSession();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found") || msg.includes("actorid") || msg.includes("dtsg")) {
        return { success: false, needsLogin: true, message: "Please make sure you are signed in to your Facebook account" };
      }
      throw err;
    }

    const input = {
      input: {
        client_mutation_id: "1",
        actor_id: this.user,
        batch_delete_variants: true,
        referral_surface: "PRODUCT_DETAILS",
        surface: "MARKETPLACE_PAGE_SELLING",
        for_sale_item_id: id,
      },
    };

    const form = new FormData();
    form.append("fb_dtsg", this.fbDtsg);
    form.append("server_timestamps", "true");
    form.append("fb_api_caller_class", "RelayModern");
    form.append("fb_api_req_friendly_name", "useCometMarketplaceForSaleItemDeleteMutation");
    form.append("variables", JSON.stringify(input));
    form.append("__a", this.aParam);
    form.append("doc_id", FACEBOOK_DOC_IDS.deleteListing);
    form.append("__comet_req", this.cometReq);

    const response = await fetch(FACEBOOK_GRAPHQL_URL, {
      method: "POST",
      body: form,
      credentials: "include",
      headers: {
        accept: "application/json, text/plain, */*",
      },
    });

    const json = await response.json();
    if (json?.errors?.length) {
      return {
        success: false,
        message: json.errors[0].description ?? json.errors[0].message,
        internalErrors: JSON.stringify(json),
      };
    }

    return { success: true };
  }

  public async getListings(
    cursor?: string,
    limit = 50,
    token?: string,
  ): Promise<MarketplaceListingResult> {
    if (!token) {
      const html = await fetch(FACEBOOK_SELLING_URL, {
        credentials: "include",
      }).then((res) => res.text());
      const match = html.match(/"DTSGInitialData",\[\],{"token":"(.*?)"/);
      if (!match?.[1]) {
        throw new Error("Unable to find Facebook DTSG token.");
      }
      token = match[1];
    }

    const headers = new Headers();
    headers.append("content-type", "application/x-www-form-urlencoded");
    headers.append("x-fb-friendly-name", FACEBOOK_SELLING_QUERY_NAME);

    let nextCursor = cursor ?? null;
    const products: MarketplaceListingResult["products"] = [];

    const loops = Math.ceil(limit / 10);
    for (let i = 0; i < loops; i += 1) {
      const params = new URLSearchParams();
      params.append(
        "variables",
        JSON.stringify({
          count: 10,
          state: "LIVE",
          status: ["IN_STOCK"],
          cursor: nextCursor,
          order: "CREATION_TIMESTAMP_DESC",
          isBusinessOnMarketplaceEnabled: false,
          scale: 1,
          title_search: null,
        }),
      );
      params.append("doc_id", FACEBOOK_DOC_IDS.sellingFeed);
      params.append("fb_api_req_friendly_name", FACEBOOK_SELLING_QUERY_NAME);
      params.append("fb_dtsg", token);

      const response = await fetch(FACEBOOK_GRAPHQL_URL, {
        method: "POST",
        headers,
        body: params,
        credentials: "include",
      });

      const text = await response.text();
      const roots = this.extractJsonRoots(text);
      if (!roots.length) {
        break;
      }
      const parsed = JSON.parse(roots[0]);
      const edges =
        parsed?.data?.viewer?.marketplace_listing_sets?.edges ?? [];

      products.push(
        ...edges.map((edge: any) => ({
          marketplaceId: edge.node.first_listing.id,
          title: edge.node.first_listing.base_marketplace_listing_title ?? null,
          price: edge.node.first_listing.listing_price
            ? parseFloat(
                edge.node.first_listing.listing_price.formatted_amount?.replace(
                  /[^\d.]/g,
                  "",
                ) ?? "0",
              )
            : null,
          coverImage:
            edge.node.first_listing.primary_listing_photo?.image?.uri ?? null,
          created: edge.node.first_listing.creation_time
            ? new Date(edge.node.first_listing.creation_time * 1000).toJSON()
            : null,
          marketplaceUrl: this.getProductUrl(edge.node.first_listing.id),
        })),
      );

      const pageInfo =
        parsed?.data?.viewer?.marketplace_listing_sets?.page_info;
      if (!pageInfo?.has_next_page) {
        nextCursor = null;
        break;
      }
      nextCursor = pageInfo.end_cursor;
    }

    return {
      products,
      nextPage: nextCursor,
      username: token,
    };
  }

  public async getListing(id: string): Promise<Product | null> {
    await this.ensureSession();

    const params = new URLSearchParams();
    params.append(
      "variables",
      JSON.stringify({
        category_id: "0",
        composer_mode: "EDIT_LISTING",
        delivery_types: ["in_person"],
        has_prefetched_category: false,
        is_edit: true,
        listingId: id,
        scale: 1,
      }),
    );
    params.append("doc_id", FACEBOOK_DOC_IDS.composerQuery);
    params.append("fb_api_req_friendly_name", "CometMarketplaceComposerRootComponentQuery");
    params.append("fb_dtsg", this.fbDtsg);
    params.append("server_timestamps", "true");
    params.append("fb_api_caller_class", "RelayModern");
    params.append("__a", this.aParam);
    params.append("__comet_req", this.cometReq);

    const response = await fetch(FACEBOOK_GRAPHQL_URL, {
      method: "POST",
      body: params,
      credentials: "include",
    });

    const text = await response.text();
    const roots = this.extractJsonRoots(text);
    if (!roots.length) {
      return null;
    }

    // The composer query may return multiple JSON roots — search all for listing data
    let listing: any = null;
    for (const root of roots) {
      try {
        const parsed = JSON.parse(root);
        if (parsed?.data?.listing) {
          listing = parsed.data.listing;
          break;
        }
        // Some responses nest under data.viewer.marketplace_listing_composer
        if (parsed?.data?.viewer?.marketplace_listing_composer?.listing) {
          listing = parsed.data.viewer.marketplace_listing_composer.listing;
          break;
        }
      } catch { /* skip malformed roots */ }
    }
    if (!listing) {
      return null;
    }

    // Extract photos from GraphQL response first (multiple possible paths)
    const photoUris: string[] = [];

    // Path 1: listing.listing_photos (array of { image: { uri } })
    const listingPhotos = listing.listing_photos ?? listing.photos ?? [];
    if (Array.isArray(listingPhotos)) {
      for (const p of listingPhotos) {
        const uri = p?.image?.uri ?? p?.image_uri ?? p?.uri;
        if (uri) photoUris.push(uri);
      }
    }

    // Path 2: listing.primary_listing_photo
    if (photoUris.length === 0 && listing.primary_listing_photo?.image?.uri) {
      photoUris.push(listing.primary_listing_photo.image.uri);
    }

    // Path 3: search all roots for photo data (Facebook sometimes splits across payloads)
    // Only use this as a fallback — filter aggressively to avoid thumbnails/avatars/UI images
    if (photoUris.length === 0) {
      const candidateUris: string[] = [];
      for (const root of roots) {
        try {
          const uriMatches = root.matchAll(/"uri"\s*:\s*"(https:\/\/scontent[^"]+)"/g);
          for (const m of uriMatches) {
            if (m[1] && !candidateUris.includes(m[1])) candidateUris.push(m[1]);
          }
        } catch { /* skip */ }
      }

      // Deduplicate: Facebook serves the same image at multiple sizes.
      // Extract the base hash from the URL path (e.g. /v/t39.30808-6/abc123_n.jpg)
      // and keep only the largest version of each unique image.
      const seenHashes = new Set<string>();
      for (const uri of candidateUris) {
        // Extract filename hash — the unique part before _n.jpg / _o.jpg / _s.jpg
        const pathMatch = uri.match(/\/([a-zA-Z0-9_]+)_[nospq]\.(jpg|png|webp)/);
        const hash = pathMatch?.[1] ?? uri;
        if (seenHashes.has(hash)) continue;
        seenHashes.add(hash);

        // Skip small images (avatars, icons) — look for dimension hints in URL
        // Facebook CDN URLs with /cp0/ or /c0/ are often profile pics or thumbnails
        if (/\/p\d+x\d+\//.test(uri)) {
          const dimMatch = uri.match(/\/p(\d+)x(\d+)\//);
          if (dimMatch && parseInt(dimMatch[1]) < 200) continue;
        }

        photoUris.push(uri);
        if (photoUris.length >= 10) break;
      }
    }

    // Path 4: HTML scrape fallback
    if (photoUris.length === 0) {
      try {
        const html = await fetch(
          `${FACEBOOK_BASE_URL}/marketplace/item/${id}`,
          { credentials: "include" },
        ).then((res) => res.text());

        // Try listing_photos JSON
        const photosMatch = html.match(/"listing_photos":(\[.+?\])/);
        if (photosMatch?.[1]) {
          try {
            const parsed = JSON.parse(photosMatch[1]) as Array<{ image_uri?: string }>;
            for (const p of parsed) {
              if (p.image_uri) photoUris.push(p.image_uri);
            }
          } catch { /* skip */ }
        }

        // Try image URIs from HTML (with same dedup logic)
        if (photoUris.length === 0) {
          const htmlUriMatches = html.matchAll(/"uri"\s*:\s*"(https:\/\/scontent[^"]+)"/g);
          const seenHtml = new Set<string>();
          for (const m of htmlUriMatches) {
            if (!m[1]) continue;
            const pathMatch = m[1].match(/\/([a-zA-Z0-9_]+)_[nospq]\.(jpg|png|webp)/);
            const hash = pathMatch?.[1] ?? m[1];
            if (seenHtml.has(hash)) continue;
            seenHtml.add(hash);
            if (/\/p\d+x\d+\//.test(m[1])) {
              const dimMatch = m[1].match(/\/p(\d+)x(\d+)\//);
              if (dimMatch && parseInt(dimMatch[1]) < 200) continue;
            }
            photoUris.push(m[1]);
            if (photoUris.length >= 10) break;
          }
        }
      } catch {
        console.warn("[Facebook] HTML photo scrape failed for listing", id);
      }
    }

    const attributes = listing.attribute_data ?? [];
    const findAttribute = (label: string | string[]) => {
      const keys = Array.isArray(label) ? label : [label];
      return attributes.find((attr: any) => keys.includes(attr.attribute_name));
    };

    const conditionAttr = findAttribute("Condition");
    const colorAttr = findAttribute(["Color", "Colour"]);
    const sizeAttr = findAttribute([
      "Men's Shoe Size",
      "Women's Shoe Size",
      "Standard Size",
      "Size",
    ]);

    const condition = (() => {
      switch (conditionAttr?.value) {
        case "new":
          return "NewWithoutTags";
        case "used_like_new":
          return "VeryGood";
        case "used_good":
          return "Good";
        case "used_fair":
          return "Fair";
        default:
          return "Good";
      }
    })() as Product["condition"];

    const color = colorAttr?.value?.trim();
    const size = sizeAttr?.value?.trim();

    // Title: try multiple field names (Facebook changes these)
    const title = listing.name
      || listing.base_marketplace_listing_title
      || listing.marketplace_listing_title
      || "";

    // Description: try multiple field names
    const description = listing.description
      || listing.redacted_description?.text
      || listing.marketplace_listing_description
      || "";

    const price = listing.listing_price?.formatted_amount
      ? parseFloat(
          listing.listing_price.formatted_amount.replace(/[^\d.]/g, ""),
        )
      : 0;

    return {
      id,
      marketPlaceId: id,
      title,
      description,
      category: [listing.category_id ?? ""],
      brand: findAttribute("Brand")?.value ?? undefined,
      condition,
      size: size ? [size] : undefined,
      color: color ?? undefined,
      price,
      quantity: listing.quantity ?? 1,
      images: photoUris.slice(1),
      cover: photoUris[0] ?? undefined,
      coverSmall: photoUris[0] ?? undefined,
      marketplaceUrl: this.getProductUrl(id),
      dynamicProperties: {},
      shipping: {},
      tags: "",
      acceptOffers: true,
      smartPricing: false,
      smartPricingPrice: undefined,
    };
  }

  public async checkLogin(): Promise<boolean> {
    try {
      const response = await fetch(FACEBOOK_CREATE_URL, {
        method: "GET",
        credentials: "include",
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async storeCategories(): Promise<void> {
    try {
      await checkAlreadyExecuted(
        FACEBOOK_CATEGORY_CACHE_KEY,
        async () => {
          const info = (await getLoggingInfo(
            "Category",
            "facebook",
            this.tld,
          )) as { isLogged?: boolean } | null;
          if (info?.isLogged) {
            return;
          }
          const html = await this.getHtml(`${FACEBOOK_CATEGORY_PAGE_URL}`);
          const json = this.extractJsonFromHtml(
            '{"categories_virtual_taxonomy":',
            html,
          );
          if (json?.categories_virtual_taxonomy) {
            await log(
              "Category",
              JSON.stringify(json.categories_virtual_taxonomy),
              null,
              "facebook",
              this.tld,
            );
          }
        },
        10,
      );
    } catch (error) {
      console.warn("[Facebook] storeCategories failed", error);
    }
  }

  private extractJsonFromHtml(startToken: string, html: string) {
    const sanitized = html.replace(/\r?\n/g, "\\n");
    const startIndex = sanitized.indexOf(startToken);
    if (startIndex === -1) {
      return null;
    }
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    for (let i = startIndex; i < sanitized.length; i += 1) {
      const char = sanitized[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
      }
      if (!inString) {
        if (char === "{") braceCount += 1;
        if (char === "}") {
          braceCount -= 1;
          if (braceCount === 0) {
            const slice = sanitized.slice(startIndex, i + 1);
            return JSON.parse(slice);
          }
        }
      }
    }
    return null;
  }

  private extractJsonRoots(payload: string) {
    const results: string[] = [];
    let depth = 0;
    let start = 0;
    let collecting = false;

    for (let i = 0; i < payload.length; i += 1) {
      if (payload[i] === "{") {
        depth += 1;
        collecting = true;
      } else if (payload[i] === "}") {
        depth -= 1;
      }

      if (!collecting) {
        start = i + 1;
      }

      if (depth === 0 && collecting) {
        results.push(payload.substring(start, i + 1));
        collecting = false;
        start = i + 1;
      }
    }

    return results;
  }

  private async getHtml(url: string = FACEBOOK_CREATE_URL) {
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      },
    });
    return response.text();
  }

  private async getCachedParam(key: string) {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  }

  private async areParametersCached() {
    const keys = [
      "wrenlist_fb_actorid",
      "wrenlist_fb_a",
      "wrenlist_fb_cometreq",
      "wrenlist_fb_dtsg",
      "wrenlist_fb_targetid",
    ];
    const values = await chrome.storage.local.get(keys);
    return keys.every((key) => Boolean(values[key]));
  }

  private async extractAndCache(
    key: string,
    regex: RegExp,
    html: string,
  ): Promise<string> {
    const match = html.match(regex);
    if (!match?.[1]) {
      await log("FacebookParameterNotFound", html, null, "facebook", this.tld);
      throw new Error(`${key} not found`);
    }
    await chrome.storage.local.set({ [key]: match[1] });
    return match[1];
  }

  public getProductUrl(id: string | number) {
    return `${FACEBOOK_BASE_URL}/marketplace/item/${id}`;
  }
}

