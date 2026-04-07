import {
  DEPOP_ADDRESSES_V1,
  DEPOP_ADDRESSES_V1_QUERY,
  DEPOP_APP_BASE,
  DEPOP_DOMAIN,
  DEPOP_PICTURES_V2,
  DEPOP_POSTAL_ADDRESS,
  DEPOP_PRODUCT_VIEW,
  DEPOP_PRODUCTS_CREATE,
  DEPOP_PRODUCTS_V1,
  DEPOP_PRODUCTS_V2,
  DEPOP_SHOP_PRODUCTS,
} from "./constants.js";
import type { Product, MarketplaceListingResult } from "../../types.js";
import { Condition, Color, isColor } from "../../shared/enums.js";
import { countries } from "../../data/index.js";

interface DepopAddressInput {
  firstName: string;
  lastName: string;
  street: string;
  address2?: string;
  city: string;
  region: string;
  zipCode: string;
  country: string;
  email: string;
}

interface DepopListingResponse {
  id: number;
  slug: string;
  pretty_path?: string;
}

export class DepopClient {
  private userId = "";
  private bearerToken = "";

  constructor(private readonly tld: string) {}

  private async ensureSession(): Promise<void> {
    if (this.userId && this.bearerToken) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      chrome.cookies.getAll({ domain: DEPOP_DOMAIN }, (cookies) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        cookies.forEach((cookie) => {
          if (cookie.name === "access_token") {
            this.bearerToken = cookie.value;
          }
          if (cookie.name === "user_id") {
            this.userId = cookie.value;
          }
        });

        if (this.userId && this.bearerToken) {
          resolve();
        } else {
          reject({
            success: false,
            needsLogin: true,
            message: "Please make sure you are signed in to your Depop account",
          });
        }
      });
    });
  }

  private authHeaders(extra?: Record<string, string>) {
    return {
      "Content-Type": "application/json",
      "Depop-UserId": this.userId,
      Authorization: `Bearer ${this.bearerToken}`,
      ...extra,
    };
  }

  public async uploadImage(file: File): Promise<string> {
    await this.ensureSession();

    const request = await fetch(DEPOP_PICTURES_V2, {
      method: "POST",
      body: JSON.stringify({ type: "product", extension: "jpg" }),
      headers: this.authHeaders({
        accept: "application/json, text/plain, */*",
      }),
      credentials: "include",
    }).then((res) => res.json());

    if (!request.url || !request.id) {
      throw {
        success: false,
        message: "Image upload failed",
        internalErrors: JSON.stringify(request),
      };
    }

    await fetch(request.url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": "image/jpeg" },
    });

    return request.id;
  }

  public async getPostalAddressForAuthenticatedUser(provider: string) {
    await this.ensureSession();

    const response = await fetch(`${DEPOP_ADDRESSES_V1}?providers=${provider}`, {
      method: "GET",
      headers: this.authHeaders({
        accept: "application/json, text/plain, */*",
      }),
      credentials: "include",
    }).then((res) => res.json());

    return response;
  }

  public async createPostalAddress(address: DepopAddressInput) {
    await this.ensureSession();

    const response = await fetch(DEPOP_ADDRESSES_V1_QUERY, {
      method: "POST",
      headers: this.authHeaders(),
      credentials: "include",
      body: JSON.stringify({
        name: `${address.firstName} ${address.lastName}`,
        line1: address.street,
        line2: address.address2 ?? "",
        city: address.city,
        province: address.region,
        postalCode: address.zipCode,
        countryName: address.country === "UK" ? "GB" : address.country,
        email: address.email,
      }),
    });

    if (!response.ok) {
      throw await response.text();
    }

    return response.json();
  }

  public async postListing(payload: Record<string, unknown>) {
    try {
      await this.ensureSession();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "needsLogin" in err) {
        return err as { success: false; needsLogin: true; message: string };
      }
      throw err;
    }
    await this.storeCategories(payload.countryCode as string);

    const response = await fetch(DEPOP_PRODUCTS_V2, {
      method: "POST",
      headers: this.authHeaders({
        accept: "application/json, text/plain, */*",
      }),
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (response.status !== 201) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        return {
          success: false,
          message:
            parsed.message ??
            "An unexpected error occured while posting to Depop.",
          internalErrors: text,
        };
      } catch {
        return {
          success: false,
          message: "An unexpected error occured while posting to Depop.",
          internalErrors: text,
        };
      }
    }

    const data = (await response.json()) as DepopListingResponse;
    return {
      success: true,
      product: {
        id: data.id,
        url: `https://www.depop.com/products/${data.slug}`,
      },
    };
  }

  public async updateListing(
    marketplaceUrl: string,
    payload: Record<string, unknown>,
  ) {
    await this.ensureSession();

    const slug = this.extractSlugFromListingUrl(marketplaceUrl);
    if (!slug) {
      throw new Error("Unable to extract Depop slug from listing URL");
    }

    const response = await fetch(`${DEPOP_PRODUCTS_V2}${slug}/`, {
      method: "PUT",
      headers: this.authHeaders({
        accept: "application/json, text/plain, */*",
      }),
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (response.status !== 204) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        return {
          success: false,
          message: parsed.message ?? "Failed to update Depop listing",
          internalErrors: text,
        };
      } catch {
        return {
          success: false,
          message: "Failed to update Depop listing",
          internalErrors: text,
        };
      }
    }

    return { success: true };
  }

  public async delistListing(id: string) {
    try {
      await this.ensureSession();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "needsLogin" in err) {
        return err as { success: false; needsLogin: true; message: string };
      }
      throw err;
    }

    const response = await fetch(`${DEPOP_PRODUCTS_V1}${id}/`, {
      method: "DELETE",
      headers: this.authHeaders({
        accept: "application/json, text/plain, */*",
      }),
      credentials: "include",
    });

    if (response.status !== 204) {
      const body = await response.json();
      return {
        success: false,
        message: body.message ?? "Failed to delist Depop item",
        internalErrors: JSON.stringify(body),
      };
    }

    return { success: true };
  }

  public async getListings(
    cursor?: string,
    limit = 200,
  ): Promise<MarketplaceListingResult> {
    await this.ensureSession();

    const params = new URLSearchParams({
      limit: limit.toString(),
      cursor: cursor ?? "",
      statusFilter: "selling",
    });

    const response = await fetch(`${DEPOP_SHOP_PRODUCTS}?${params.toString()}`, {
      headers: {
        authorization: `Bearer ${this.bearerToken}`,
        "Content-Type": "application/json",
        accept: "application/json, text/plain, */*",
      },
      credentials: "include",
    }).then((res) => res.json());

    const products = response.products.map((product: any) => ({
      marketplaceId: product.id.toString(),
      title: this.readableTitle(product.slug),
      price: parseFloat(product.price.priceAmount),
      coverImage:
        product.pictures.length > 0
          ? product.pictures[0].slice(-1)[0].url
          : "",
      created: product.dateCreated,
      marketplaceUrl: this.getProductUrl(product.slug),
    }));

    return {
      products,
      nextPage: response.meta.end ? null : response.meta.cursor,
      username: this.userId,
    };
  }

  public async getListing(id: string): Promise<Product | null> {
    await this.ensureSession();

    const response = await fetch(
      `${DEPOP_PRODUCT_VIEW}${id}/?lang=en`,
      {
        headers: {
          authorization: `Bearer ${this.bearerToken}`,
          "Content-Type": "application/json",
          accept: "application/json, text/plain, */*",
        },
        credentials: "include",
      },
    );

    if (response.status !== 200) {
      return null;
    }

    const data = await response.json();
    const product = data;

    const condition = this.mapConditionFromDepop(product.condition?.id);

    const color = this.mapColor(
      product.colour?.[0]?.name ?? null,
    );
    const color2 = this.mapColor(
      product.colour?.[1]?.name ?? null,
    );

    const categoryRoot = product.isKids
      ? "kidswear"
      : product.gender === "female"
      ? "womenswear"
      : product.gender === "male"
      ? "menswear"
      : "everything-else";

    const category = `${categoryRoot}|${product.group}|${product.productType}`;

    return {
      id: product.id,
      marketPlaceId: product.id.toString(),
      images:
        product.pictures.length > 0
          ? product.pictures.slice(1).map(
              (picture: any) => picture[picture.length - 1].url,
            )
          : [],
      title: this.generateTitle(product),
      description: product.description ?? null,
      category: [category],
      condition: condition ?? Condition.Good,
      brand: product.brandName ?? null,
      size:
        product.sizes && product.sizes.length > 0
          ? [`${product.variantSetId}|${product.sizes[0].id}`]
          : undefined,
      color,
      color2,
      tags: "",
      price: product.price ? parseFloat(product.price.priceAmount) : 0,
      acceptOffers: false,
      smartPricing: false,
      smartPricingPrice: undefined,
      shipping: {},
      quantity: product.quantity,
      cover:
        product.pictures.length > 0
          ? product.pictures[0][product.pictures[0].length - 1].url
          : null,
      coverSmall: product.pictures.length > 0 ? product.pictures[0][0].url : null,
      marketplaceUrl: this.getProductUrl(product.slug),
      dynamicProperties: product.source?.length
        ? { Source: product.source[0].id }
        : {},
    } as Product;
  }

  public async checkLogin(): Promise<boolean> {
    try {
      await this.ensureSession();
      const response = await fetch(DEPOP_POSTAL_ADDRESS, {
        method: "GET",
        headers: this.authHeaders(),
        credentials: "include",
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  public getProductUrl(slug: string): string {
    return `https://www.depop.com/products/${slug}`;
  }

  private extractSlugFromListingUrl(url: string): string | null {
    const match = url.match(/depop\.com\/products\/(.+?)(?:\/|$)/i);
    return match?.[1] ?? null;
  }

  private readableTitle(slug: string): string {
    const trimmed = slug
      .toLowerCase()
      .replace(/-[a-f0-9]{4}$/, "")
      .split("-");
    trimmed.shift();
    return trimmed.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  private generateTitle(product: any): string {
    const brand = product.brandName || "";
    const gender =
      product.isKids ? "Kid's" : product.gender === "male" ? "Men's" : "Women's";
    const colorNames = product.colour
      ? product.colour.map((entry: any) => entry.name).join(" and ")
      : "";
    const productType = product.productType;
    return `${brand ? `${brand} ` : ""}${gender} ${
      colorNames ? `${colorNames} ` : ""
    }${productType}`;
  }

  private mapConditionFromDepop(value?: string): Condition | null {
    switch (value) {
      case "brand_new":
        return Condition.NewWithTags;
      case "like_new":
      case "used_like_new":
        return Condition.NewWithoutTags;
      case "used_good":
        return Condition.Good;
      case "used_excellent":
        return Condition.VeryGood;
      case "used_fair":
        return Condition.Fair;
      default:
        return null;
    }
  }

  private mapColor(value?: string | null): string | null {
    if (!value) return null;
    if (value === "Grey") return Color.Gray;
    return isColor(value) ? value : null;
  }

  private async storeCategories(countryCode: string | undefined) {
    try {
      await this.ensureSession();
      // Skip logging for now; implement when needed.
    } catch (error) {
      console.warn("[Depop] storeCategories skipped", error);
    }
  }
}

