import { countries } from "../../data/index.js";
import {
  chunkConcurrentRequests,
  getProductMediaForMarketplace,
} from "../../shared/api.js";
import { Color, Condition, isColor } from "../../shared/enums.js";
import type { Product } from "../../types.js";
import type { GrailedClient } from "./client.js";

interface GrailedBrand {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
  departments: string[];
}

const FALLBACK_BRAND: GrailedBrand = {
  id: 31752,
  slug: "Other",
  name: "other",
  logo_url: null,
  departments: ["menswear", "womenswear"],
};

type ShippingRegion =
  | "asia"
  | "au"
  | "ca"
  | "eu"
  | "uk"
  | "us"
  | "other";

type GrailedShippingConfig = Record<
  ShippingRegion,
  { amount: number; enabled: boolean }
>;

export class GrailedMapper {
  constructor(private readonly grailedClient: GrailedClient) {}

  private mapConditionToIndex(condition: Condition): string | null {
    switch (condition) {
      case Condition.NewWithTags:
      case Condition.NewWithoutTags:
        return "is_new";
      case Condition.VeryGood:
      case Condition.Good:
        return "is_gently_used";
      case Condition.Fair:
        return "is_used";
      case Condition.Poor:
        return "is_worn";
      default:
        return null;
    }
  }

  private mapColor(color: string | null | undefined): string | null {
    if (!color) {
      return null;
    }

    switch (color) {
      case Color.Turquoise:
      case Color.LightBlue:
      case Color.Navy:
      case Color.Clear:
        return "Blue";
      case Color.Coral:
      case Color.Apricot:
        return "Orange";
      case Color.Rose:
        return "Pink";
      case Color.Lilac:
        return "Purple";
      case Color.Mint:
      case Color.DarkGreen:
      case Color.Khaki:
        return "Green";
      case Color.Mustard:
        return "Yellow";
      case Color.Burgundy:
        return "Red";
      case Color.Tan:
      case Color.Cream:
        return "Beige";
      default:
        return isColor(color) ? color.toLowerCase() : null;
    }
  }

  private async mapPhotos(
    productId: string,
    client: GrailedClient,
  ): Promise<Array<{ id: number | null; rotate: number; url: string }>> {
    const media = await getProductMediaForMarketplace(productId, "grailed");

    if (!media.length) {
      return [];
    }

    const uploadTasks = media.map(
      (file) => async () => ({
        id: null,
        rotate: 0,
        url: await client.uploadImage(file),
      }),
    );

    return chunkConcurrentRequests(uploadTasks, 3);
  }

  private buildShippingMatrix(
    product: Product,
    addressCountryCode: string,
  ): GrailedShippingConfig {
    const domestic = product.shipping.domesticShipping ?? 0;
    const worldwide = product.shipping.worldwideShipping ?? 0;
    const hasWorldwide = product.shipping.worldwideShipping != null;

    const enabledDomesticCountries = ["AU", "CA", "GB", "US"];

    return {
      asia: { amount: worldwide, enabled: hasWorldwide },
      au: {
        amount: addressCountryCode === "AU" ? domestic : worldwide,
        enabled: hasWorldwide || addressCountryCode === "AU",
      },
      ca: {
        amount: addressCountryCode === "CA" ? domestic : worldwide,
        enabled: hasWorldwide || addressCountryCode === "CA",
      },
      eu: { amount: worldwide, enabled: hasWorldwide },
      uk: {
        amount: addressCountryCode === "GB" ? domestic : worldwide,
        enabled: hasWorldwide || addressCountryCode === "GB",
      },
      us: {
        amount: addressCountryCode === "US" ? domestic : worldwide,
        enabled: hasWorldwide || addressCountryCode === "US",
      },
      other: {
        amount: enabledDomesticCountries.includes(addressCountryCode)
          ? worldwide
          : domestic,
        enabled:
          hasWorldwide || !enabledDomesticCountries.includes(addressCountryCode),
      },
    };
  }

  public async map(product: Product): Promise<Record<string, unknown>> {
    const addresses =
      await this.grailedClient.getPostalAddressForAuthenticatedUser();

    if (!addresses || !addresses.data?.length) {
      throw {
        success: false,
        message:
          "Please add an address in your Grailed account under 'My Addresses' before posting.",
        type: "validation",
        internalErrors: "No address found in Grailed",
      };
    }

    const returnAddress =
      addresses.data.find((entry: any) => entry.default_return) ??
      addresses.data[0];

    const categorySlug = product.category[0]?.toLowerCase().trim() ?? "";
    const department = categorySlug.includes("women_")
      ? "womenswear"
      : "menswear";

    let designers: GrailedBrand[] = [FALLBACK_BRAND];

    if (product.brand) {
      const brand =
        (await this.grailedClient.getBrand(
          department,
          product.brand ?? "unbranded",
        )) ?? FALLBACK_BRAND;
      designers = [brand];
    }

    const shipments = this.buildShippingMatrix(
      product,
      returnAddress.country_code,
    );

    const hashtags =
      product.tags && product.tags.trim() !== ""
        ? product.tags
            .replaceAll("#", "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined;

    const payload: Record<string, unknown> = {
      buynow: true,
      category_path: categorySlug,
      condition: this.mapConditionToIndex(product.condition),
      description: product.description,
      designers,
      exact_size:
        product.size && categorySlug.includes("womens_")
          ? product.size[0]
          : null,
      hashtags,
      hidden_from_algolia: false,
      makeoffer: Boolean(product.acceptOffers),
      minimum_price: product.smartPricingPrice ?? null,
      photos: await this.mapPhotos(product.id, this.grailedClient),
      price: product.price <= 2 ? 2.01 : Math.ceil(product.price),
      product_id: null,
      return_address_id: returnAddress.id,
      shipping_label: {
        label_type: "large",
        signature_confirmation_type: "",
        free_shipping: Boolean(product.shipping.sellerPays),
      },
      shipping: shipments,
      size:
        product.size && !categorySlug.includes("womens_")
          ? product.size[0]
          : null,
      title: product.title,
      traits: [
        {
          name: "color",
          value: this.mapColor(product.color) ?? undefined,
        },
      ],
    };

    const origin = product.dynamicProperties?.["Country of Origin"];
    if (origin) {
      const match = countries.find(({ label }) => label === origin);
      if (match?.value) {
        (payload.traits as Array<{ name: string; value: string | undefined }>).push(
          { name: "country_of_origin", value: match.value },
        );
      }
    }

    return payload;
  }
}

