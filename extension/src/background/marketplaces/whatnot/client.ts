import {
  chunkConcurrentRequestsWithRetry,
  checkAlreadyExecuted,
  getLoggingInfo,
  log,
} from "../../shared/api.js";
import { Condition } from "../../shared/enums.js";
import type { Product, MarketplaceListingResult } from "../../types.js";
import {
  ADD_LISTING_PHOTO_MUTATION,
  CREATE_LISTING_MUTATION,
  CURRENT_USER_QUERY,
  GENERATE_MEDIA_UPLOAD_URLS_MUTATION,
  GET_MY_LIVESTREAMS_QUERY,
  GET_PRODUCT_ATTRIBUTES_QUERY,
  GET_SHIPPING_PROFILES_QUERY,
  SELLER_BULK_LISTING_ACTION_MUTATION,
  SELLER_HUB_INVENTORY_EDIT_QUERY,
  SELLER_HUB_INVENTORY_QUERY,
  UPDATE_LISTING_MUTATION,
  WHATNOT_DOMAIN,
  WHATNOT_GRAPHQL_API,
} from "./constants.js";
import type { WhatnotListingInput } from "./mapper.js";

interface ListingActionResult {
  success: boolean;
  message?: string;
  product?: { id: string; url: string };
  internalErrors?: string;
}

interface StagedUploadTarget {
  url: string;
  targetKey: string;
}

export class WhatnotClient {
  private sessionId = "";
  private userId = "";

  constructor(private readonly tld: string) {}

  private getHeaders(options?: { requiresAuth?: boolean; isJson?: boolean }) {
    const headers: Record<string, string> = {
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

  private async startSession(): Promise<void> {
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

  private async graphql<T>(
    operationName: string,
    query: string,
    variables: any,
    options?: { requiresAuth?: boolean },
  ): Promise<T> {
    await this.startSession();
    const response = await fetch(
      `${WHATNOT_GRAPHQL_API}?operationName=${operationName}&ssr=0`,
      {
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
      },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json();
  }

  private async uploadImageFile(file: File, target: StagedUploadTarget) {
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

  public async uploadImages(files: File[]): Promise<string[]> {
    if (!files.length) {
      return [];
    }
    const response = (await this.graphql<{
      data: {
        generateMediaUploadURLs: {
          uploads: Array<{
            url: string;
            targetKey: string;
          }>;
        };
      };
    }>("GenerateMediaUploadUrls", GENERATE_MEDIA_UPLOAD_URLS_MUTATION, {
      media: files.map(() => ({
        id: crypto.randomUUID(),
        extension: "jpg",
      })),
    })) as any;

    const uploads: StagedUploadTarget[] =
      response?.data?.generateMediaUploadURLs?.uploads ?? [];

    const uploadTasks = files.map((file, index) => () =>
      this.uploadImageFile(file, uploads[index]),
    );
    const staged = await chunkConcurrentRequestsWithRetry(uploadTasks, 5);

    const finalizeTasks = staged.map((upload) => async () => {
      const addResponse = await this.graphql<{
        data: { addListingPhoto: { image: { id: string } } };
      }>("AddListingPhoto", ADD_LISTING_PHOTO_MUTATION, {
        uuid: null,
        label: upload.url,
        uploadKey: upload.targetKey,
      });
      return addResponse.data.addListingPhoto.image.id;
    });

    return chunkConcurrentRequestsWithRetry(finalizeTasks, 5);
  }

  public async postListing(
    payload: WhatnotListingInput,
  ): Promise<ListingActionResult> {
    const response = await this.graphql<{
      data: {
        createListing: {
          listingNode?: { id: string };
          error?: string;
        };
      };
      errors?: Array<{ message: string }>;
    }>("CreateListing", CREATE_LISTING_MUTATION, payload);

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

  public async updateListing(
    payload: WhatnotListingInput,
  ): Promise<ListingActionResult> {
    const response = await this.graphql<{
      data: {
        updateListing2?: {
          listingNode?: { id: string };
          error?: string;
        };
      };
      errors?: Array<{ message: string }>;
    }>("UpdateListing", UPDATE_LISTING_MUTATION, { input: payload });

    if (response.errors?.length || response.data.updateListing2?.error) {
      const message =
        response.errors?.[0]?.message ??
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

  public async delistListing(id: string): Promise<ListingActionResult> {
    const response = await this.graphql<{
      data: {
        sellerBulkListingAction: Array<{ error?: string }>;
      };
      errors?: Array<{ message: string }>;
    }>("SellerBulkListingAction", SELLER_BULK_LISTING_ACTION_MUTATION, {
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

  public async getListings(
    cursor?: string,
    limit = 100,
    sellerId?: string,
  ): Promise<MarketplaceListingResult> {
    if (!sellerId) {
      const me = await this.getMe();
      if (!me?.id) {
        throw new Error("Could not fetch Whatnot user information.");
      }
      sellerId = me.id;
    }

    const response = await this.graphql<{
      data: {
        me: {
          inventory: {
            edges: Array<{
              cursor: string;
              node: {
                id: string;
                title: string;
                createdAt: string;
                price: { amount: number };
                images: Array<{ url: string }>;
              };
            }>;
            pageInfo: {
              hasNextPage: boolean;
              endCursor: string | null;
            };
          };
        };
      };
    }>("SellerHubInventory", SELLER_HUB_INVENTORY_QUERY, {
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

  public async getListing(id: string): Promise<Product | null> {
    const response = await this.graphql<{
      data: {
        categories?: unknown;
        getListing?: any;
      };
    }>("SellerHubInventoryEdit", SELLER_HUB_INVENTORY_EDIT_QUERY, {
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
    const shippingWeight =
      categoryId && shippingProfileId
        ? await this.getShippingWeight(categoryId, shippingProfileId)
        : undefined;

    return this.mapListingToProduct(listing, shippingWeight);
  }

  public async getShippingProfiles(categoryId: string) {
    const response = await this.graphql<{
      data: { shippingProfiles: any[] };
    }>("GetShippingProfiles", GET_SHIPPING_PROFILES_QUERY, { categoryId });
    return response.data.shippingProfiles ?? [];
  }

  public async getProductAttributes(categoryId: string) {
    const response = await this.graphql<{
      data: { getProductAttributes: any[] };
    }>("GetProductAttributes", GET_PRODUCT_ATTRIBUTES_QUERY, { categoryId });
    return response.data.getProductAttributes ?? [];
  }

  public async getMyLiveStreams() {
    const response = await this.graphql<{
      data: { myLiveStreams: Array<{ id: string }> };
    }>("SellerHubGetMyLivestreams", GET_MY_LIVESTREAMS_QUERY, {
      status: ["CREATED", "PLAYING", "STOPPED"],
    });
    return response.data.myLiveStreams ?? [];
  }

  public async checkLogin(): Promise<boolean> {
    const response = await fetch(`${WHATNOT_DOMAIN}/dashboard/inventory/new`, {
      redirect: "follow",
    });
    return !(response.redirected && response.url.includes("login"));
  }

  private async getMe() {
    const response = await this.graphql<{
      data: { currentUser: { id: string } | null };
    }>("CurrentUser", CURRENT_USER_QUERY, {});
    return response.data.currentUser;
  }

  private async storeCategories(categories: unknown) {
    try {
      await checkAlreadyExecuted("categoryLastLoggedWhatnot", async () => {
        const info = (await getLoggingInfo("Category", "whatnot", this.tld)) as
          | { isLogged?: boolean }
          | null;
        if (info?.isLogged) return;
        await log("Category", JSON.stringify({ categories }), null, "whatnot", this.tld);
      });
    } catch (error) {
      console.warn("[Whatnot] storeCategories failed", error);
    }
  }

  private async getShippingWeight(categoryId: string, profileId: string) {
    const profiles = await this.getShippingProfiles(categoryId);
    const match = profiles?.find((profile: any) => profile.id === profileId);
    return this.convertToStandardWeight(
      match?.weightAmount,
      match?.weightScale,
    );
  }

  private mapListingToProduct(
    listing: any,
    shippingWeight?: { value: number; unit: string } | undefined,
  ): Product {
    const categoryId = listing.product?.category?.id ?? null;
    const attributeValue = (predicate: (key: string) => boolean) =>
      listing.listingAttributeValues?.find((attr: any) =>
        predicate(attr.attribute?.key ?? ""),
      )?.value;

    const rawCondition = attributeValue((key) => key.includes("condition"));
    const condition = this.mapCondition(rawCondition);

    const sizeValue = attributeValue(
      (key) => key.includes("clothing_size") || key.includes("shoe_size"),
    );
    const colorValue = attributeValue((key) => key.includes("color"));
    const brandValue = attributeValue((key) => key.includes("brand"));
    const msrpValue = attributeValue((key) => key.includes("msrp"));

    let categoryPath = categoryId ?? null;
    if (categoryPath && this.mapperCategoryIds.includes(`${categoryPath}|`)) {
      const typeValue = attributeValue((key) =>
        this.importableProductTypes.includes(key),
      );
      categoryPath = `${categoryPath}|${typeValue ?? ""}`;
    }

    return {
      id: listing.id,
      marketPlaceId: listing.id,
      title: listing.title ?? "",
      description: listing.description ?? "",
      sku: listing.sku
        ? listing.sku.replace(/\$\$+/g, (match: string) => match.slice(1))
        : undefined,
      images: listing.images?.map((img: any) => img.url) ?? [],
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

  private mapCondition(value?: string | null) {
    if (!value) return null;
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

  public getProductUrl(id: string | number) {
    return `${WHATNOT_DOMAIN}/listing/${id}`;
  }

  private convertToStandardWeight(
    amount?: number,
    scale?: string,
  ): { value: number; unit: string } | undefined {
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

  private readonly importableProductTypes = [
    "fashion.vintage.clothing_type",
    "fashion.universal.type",
    "fashion.thrift.clothing_type",
    "fashion.designer_bag.type",
    "fashion.midrange_bags.type",
    "fashion.kids.clothing_type",
  ];

  private readonly mapperCategoryIds = [
    "Q2F0ZWdvcnlOb2RlOjEzMw==|",
    "Q2F0ZWdvcnlOb2RlOjI2Nw==|",
    "Q2F0ZWdvcnlOb2RlOjE0Ng==|",
  ];
}

