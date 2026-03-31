import {
  AVAILABLE_SHIPPING_CLASSES_QUERY,
  CREATE_LISTING_HASH,
  EDIT_LISTING_MUTATION,
  MERCARI_API,
  MERCARI_DOMAIN,
  MERCARI_INITIALIZE,
  MERCARI_UPLOAD_IMAGE,
  PRODUCT_QUERY,
  SMART_SALES_FEE_HASH,
  SMART_SALES_FEE_QUERY,
  UPLOAD_TEMP_LISTING_PHOTOS_HASH,
  USER_ITEMS_QUERY,
} from "./constants.js";
import type { CrosslistProduct, MarketplaceListingResult } from "../../types.js";
import { Condition, Color, isColor } from "../../shared/enums.js";

export interface MercariListingPayload {
  id?: string;
  photoIds: string[];
  name: string;
  price: number;
  description: string;
  categoryId: number;
  conditionId: number;
  brandId: number;
  zipCode: string;
  tags?: string[];
  shippingPayerId: number;
  shippingClassIds: number[];
  sizeId: number;
  isAutoPriceDrop: boolean;
  minPriceForAutoPriceDrop: number;
  offerConfig: {
    minPriceForSmartOffer: number;
  };
  colorId?: number;
  suggestedShippingClassIds?: number[];
  isShippingSoyo: boolean;
  shippingDeliveryType: "SOYO" | "MERCARI";
  shippingWeightUnit?: string;
  shippingPackageWeight?: number;
  salesFee?: number;
  imei?: string;
}

interface ShippingWeight {
  inOunces?: number;
  inGrams?: number;
}

interface AvailableShippingClassesResponse {
  availableShippingClassesV2?: {
    shippingClasses: Array<{
      id: number;
      fee: number;
      carrierDisplayName?: string;
      maxWeight?: number;
    }>;
  };
}

export type ListingActionResult = {
  success: boolean;
  message?: string;
  product?: { id: string; url: string };
  internalErrors?: string;
};

export class MercariClient {
  private csrfToken = "";
  private accessToken = "";

  private async ensureSession(force = false): Promise<void> {
    if (!force && this.csrfToken && this.accessToken) {
      return;
    }

    const response = await fetch(MERCARI_INITIALIZE, {
      method: "GET",
      credentials: "include",
    });
    const json = await response.json();
    this.csrfToken = json?.csrf ?? "";
    this.accessToken = json?.accessToken ?? "";

    if (!this.csrfToken || !this.accessToken) {
      throw new Error("Unable to initialize Mercari session.");
    }
  }

  private get authHeaders() {
    return {
      Accept: "application/json",
      "content-type": "application/json",
      "x-csrf-token": this.csrfToken,
      authorization: `Bearer ${this.accessToken}`,
    };
  }

  public async uploadImages(files: File[]): Promise<string[]> {
    await this.ensureSession();

    const form = new FormData();
    const operations = {
      operationName: "uploadTempListingPhotos",
      variables: { input: { photos: Array.from({ length: files.length }).map(() => null) } },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: UPLOAD_TEMP_LISTING_PHOTOS_HASH,
        },
      },
    };

    form.append("operations", JSON.stringify(operations));

    const map: Record<string, string[]> = {};
    files.forEach((_, index) => {
      map[index + 1] = [`variables.input.photos.${index}`];
    });
    form.append("map", JSON.stringify(map));

    files.forEach((file, index) => {
      form.append(String(index + 1), file, "blob");
    });

    const response = await fetch(MERCARI_UPLOAD_IMAGE, {
      method: "POST",
      body: form,
      headers: {
        Accept: "*/*",
        "X-Csrf-Token": this.csrfToken,
        "X-App-Version": "1",
        Priority: "u=1,i",
        Authorization: `Bearer ${this.accessToken}`,
        "Apollo-Require-Preflight": "true",
        "X-Double-Web": "1",
        "X-Gql-migration": "1",
        "X-Platform": "web",
      },
      credentials: "include",
    });

    const json = await response.json();
    const uploadIds = json?.data?.uploadTempListingPhotos?.uploadIds;
    if (!uploadIds || !Array.isArray(uploadIds)) {
      throw new Error("Image upload failed for Mercari.");
    }
    return uploadIds;
  }

  public async fetchCarriers(
    categoryId: number,
    weight: ShippingWeight,
    height?: number,
    width?: number,
    length?: number,
  ): Promise<AvailableShippingClassesResponse | null> {
    await this.ensureSession();

    const packageSize = (length ?? 0) * (width ?? 0) * (height ?? 0);
    const response = await fetch(MERCARI_API, {
      method: "POST",
      headers: {
        ...this.authHeaders,
        accept: "*/*",
        "apollo-require-preflight": "true",
        "x-platform": "web",
      },
      credentials: "include",
      body: JSON.stringify({
        operationName: "availableShippingClassesV2",
        variables: {
          input: {
            categoryId: Number.isFinite(categoryId) ? categoryId : 0,
            packageSize,
            dimension: {
              length: length ?? 0,
              width: width ?? 0,
              height: height ?? 0,
            },
            packageWeight: weight.inOunces ?? 0,
          },
        },
        query: AVAILABLE_SHIPPING_CLASSES_QUERY,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    if (json.errors) {
      throw {
        success: false,
        message: json.errors?.[0]?.message ?? "Unable to fetch Mercari carriers.",
        internalErrors: JSON.stringify(json),
      };
    }

    return json.data as AvailableShippingClassesResponse;
  }

  public async fetchSalesFee(payload: MercariListingPayload): Promise<number> {
    await this.ensureSession();
    const response = await fetch(MERCARI_API, {
      method: "POST",
      headers: {
        ...this.authHeaders,
        accept: "*/*",
        "apollo-require-preflight": "true",
        "x-platform": "web",
      },
      credentials: "include",
      body: JSON.stringify({
        operationName: "smartSalesFeeQuery",
        variables: {
          input: {
            sellItem: {
              photoIds: [],
              price: payload.price,
              categoryId: payload.categoryId,
              conditionId: payload.conditionId,
              zipCode: payload.zipCode,
              shippingPayerId: payload.shippingPayerId,
              shippingClassIds: payload.shippingClassIds,
              isAutoPriceDrop: payload.isAutoPriceDrop,
              minPriceForAutoPriceDrop: payload.minPriceForAutoPriceDrop,
              isShippingSoyo: payload.isShippingSoyo,
              shippingDeliveryType: payload.shippingDeliveryType,
            },
          },
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: SMART_SALES_FEE_HASH,
          },
        },
        query: SMART_SALES_FEE_QUERY,
      }),
    });

    const json = await response.json();
    const fee =
      json?.data?.smartSalesFee?.fees?.[0]?.calculatedFee ??
      json?.data?.smartSalesFee?.fees?.[0]?.fee;

    if (typeof fee !== "number") {
      throw new Error("Unable to fetch Mercari sales fee.");
    }
    return fee;
  }

  public async postListing(
    payload: MercariListingPayload,
  ): Promise<ListingActionResult> {
    await this.ensureSession();

    const response = await fetch(MERCARI_API, {
      method: "POST",
      headers: this.authHeaders,
      credentials: "include",
      body: JSON.stringify({
        operationName: "createListing",
        variables: { input: payload },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: CREATE_LISTING_HASH,
          },
        },
      }),
    });

    const json = await response.json();
    const listingId = json?.data?.createListing?.id;
    if (!listingId) {
      return this.handleMercariError(json);
    }

    return {
      success: true,
      product: {
        id: listingId,
        url: this.getProductUrl(listingId),
      },
    };
  }

  public async updateListing(
    listingId: string,
    payload: MercariListingPayload,
  ): Promise<ListingActionResult> {
    await this.ensureSession();
    const updateInput: MercariListingPayload = {
      ...payload,
      id: listingId,
    };
    delete updateInput.suggestedShippingClassIds;

    const response = await fetch(MERCARI_API, {
      method: "POST",
      headers: this.authHeaders,
      credentials: "include",
      body: JSON.stringify({
        operationName: "editListing",
        variables: { input: updateInput },
        query: EDIT_LISTING_MUTATION,
      }),
    });

    const json = await response.json();
    const updatedId = json?.data?.editListing?.id;
    if (!updatedId) {
      return this.handleMercariError(json);
    }

    return {
      success: true,
      product: {
        id: updatedId,
        url: this.getProductUrl(updatedId),
      },
    };
  }

  private handleMercariError(response: any): ListingActionResult {
    const error = response?.errors?.[0];
    const exception = error?.extensions?.exception;

    if (
      exception?.code === "LISTING_SELLER_ACTION_REQUIRED_EXCEPTION" &&
      Array.isArray(exception?.meta?.actions)
    ) {
      return {
        success: false,
        message: `Please validate your user data to activate your Mercari account: ${exception.meta.actions
          .sort()
          .join(", ")}`,
        internalErrors: JSON.stringify(response),
      };
    }

    if (
      typeof exception?.code === "string" &&
      exception.code.includes("VerificationException")
    ) {
      const required =
        exception?.meta?.blocked_action?.required_verifications ?? [];
      return {
        success: false,
        message: `Please validate your user data to activate your Mercari account: ${required
          .sort()
          .join(", ")}`,
        internalErrors: JSON.stringify(response),
      };
    }

    return {
      success: false,
      message: error?.message ?? "An unexpected error occurred on Mercari.",
      internalErrors: JSON.stringify(response),
    };
  }

  public async delistListing(id: string): Promise<ListingActionResult> {
    await this.ensureSession();

    const response = await fetch(MERCARI_API, {
      method: "POST",
      headers: this.authHeaders,
      credentials: "include",
      body: JSON.stringify({
        operationName: "UpdateItemStatusMutation",
        variables: { input: { id, status: "cancel" } },
        query: `mutation UpdateItemStatusMutation($input: UpdateItemStatusInput!) {
  updateItemStatus(input: $input) {
    status
    __typename
  }
}`,
      }),
    });

    const json = await response.json();
    if (response.status === 200 && !json.errors) {
      return { success: true };
    }
    return {
      success: false,
      message: "Mercari delist failed",
      internalErrors: JSON.stringify(json),
    };
  }

  public async getListings(
    page?: string,
    limit = 48,
    username?: string,
  ): Promise<MarketplaceListingResult> {
    await this.ensureSession();
    let userId = username;
    if (!userId) {
      const initialize = await fetch(MERCARI_INITIALIZE).then((res) => res.json());
      const user = initialize?.user;
      if (!user?.userId) {
        throw new Error("Please check you are logged in to your Mercari account.");
      }
      userId = user.userId;
    }

    const pageNumber = page ? parseInt(page, 10) : 1;
    const request = {
      keyword: "",
      page: pageNumber,
      sellerId: parseInt(userId ?? "0", 10),
      sortBy: "created",
      sortType: "desc",
      status: "on_sale",
    };

    const response = await fetch(MERCARI_API, {
      method: "POST",
      headers: {
        ...this.authHeaders,
        "apollo-require-preflight": "true",
      },
      credentials: "include",
      body: JSON.stringify({
        operationName: "userItemsQuery",
        variables: { input: request },
        query: USER_ITEMS_QUERY,
      }),
    });

    const json = await response.json();
    const items = json?.data?.userItems?.items ?? [];
    const products = items.map((item: any) => ({
      marketplaceId: item.id,
      title: item.name ?? null,
      price: item.price ? item.price / 100 : null,
      coverImage: item.photos?.[0]?.thumbnail ?? null,
      created: item.created ? new Date(item.created * 1000).toJSON() : null,
      marketplaceUrl: this.getProductUrl(item.id),
    }));

    const hasNext = json?.data?.userItems?.pagination?.hasNext;
    return {
      products,
      nextPage: hasNext ? (pageNumber + 1).toString() : null,
      username: userId,
    };
  }

  public async getListing(id: string): Promise<CrosslistProduct | null> {
    await this.ensureSession();
    const response = await fetch(MERCARI_API, {
      method: "POST",
      headers: {
        ...this.authHeaders,
        "apollo-require-preflight": "true",
      },
      credentials: "include",
      body: JSON.stringify({
        operationName: "productQuery",
        variables: { id },
        query: PRODUCT_QUERY,
      }),
    });

    const json = await response.json();
    const item = json?.data?.item;
    if (!item) {
      return null;
    }

    const condition = this.mapConditionIdToEnum(item.itemCondition?.id);
    const color1 = this.mapMercariIdToColor(item.colors?.[0]?.id);
    const color2 = this.mapMercariIdToColor(item.colors?.[1]?.id);

    const product: CrosslistProduct = {
      id,
      marketPlaceId: id,
      title: item.name ?? "",
      description: item.description ?? "",
      category: [item.itemCategory?.id?.toString() ?? ""],
      brand: item.brand?.brandName ?? undefined,
      condition: condition ?? Condition.Good,
      size: item.itemSize?.id ? [item.itemSize.id.toString()] : undefined,
      price: item.price ? item.price / 100 : 0,
      originalPrice: item.originalPrice ? item.originalPrice / 100 : undefined,
      color: color1 ?? undefined,
      color2: color2 ?? undefined,
      images: Array.isArray(item.photos)
        ? item.photos.slice(1).map((photo: any) => photo.imageUrl)
        : [],
      tags: item.tags?.tags?.join(",") ?? "",
      availability: item.status === "not_for_sale" ? "NotForSale" : "ForSale",
      styleTags: item.tags?.tags ?? [],
      dynamicProperties: item.imei ? { IMEI: item.imei } : {},
      shipping: {
        shippingWeight: this.mapShippingClassToWeight(
          item.shippingClass?.shippingClassName,
        ),
      },
      marketplaceUrl: this.getProductUrl(id),
    };

    return product;
  }

  private mapConditionIdToEnum(id?: number | null): Condition | null {
    switch (id) {
      case 1:
        return Condition.NewWithTags;
      case 2:
        return Condition.NewWithoutTags;
      case 3:
        return Condition.Good;
      case 4:
        return Condition.Fair;
      case 5:
        return Condition.Poor;
      default:
        return null;
    }
  }

  private mapShippingClassToWeight(
    name?: string | null,
  ): { value: number; unit: string } | undefined {
    if (!name) return undefined;
    const lookup: Record<string, number> = {
      "0.25 lb": 4,
      "0.5 lb": 8,
      "1 lb": 16,
      "2 lb": 32,
      "3 lb": 48,
      "4 lb": 64,
      "5 lb": 80,
    };
    const value = lookup[name];
    if (!value) return undefined;
    return { value, unit: "Ounces" };
  }

  private mapMercariIdToColor(id?: number | null): string | undefined {
    switch (id) {
      case 1:
        return Color.Black;
      case 2:
        return Color.Gray;
      case 3:
        return Color.White;
      case 4:
        return Color.Cream;
      case 5:
        return Color.Red;
      case 6:
        return Color.Pink;
      case 7:
        return Color.Purple;
      case 8:
        return Color.Blue;
      case 9:
        return Color.Green;
      case 10:
        return Color.Yellow;
      case 11:
        return Color.Orange;
      case 12:
        return Color.Brown;
      case 13:
        return Color.Gold;
      case 14:
        return Color.Silver;
      default:
        return undefined;
    }
  }

  public async checkLogin(): Promise<boolean> {
    try {
      const init = await fetch(MERCARI_INITIALIZE).then((res) => res.json());
      return Boolean(init?.user?.userId);
    } catch {
      return false;
    }
  }

  public getProductUrl(id: string | number): string {
    return `${MERCARI_DOMAIN}/us/item/${id}`;
  }
}

