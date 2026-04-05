import {
  getProductMediaForMarketplace,
} from "../../shared/api.js";
import type { Product } from "../../types.js";
import { mercariBrands } from "../../data/index.js";
import type { MercariClient, MercariListingPayload } from "./client.js";

const MAX_PRICE_CENTS = 200_000;
const MIN_PRICE_CENTS = 1;
const MAX_WEIGHT_OUNCES = 800; // 50 lbs
const DEFAULT_PREPAID_CLASS_ID = 1582;

function sanitizeText(value: string | undefined | null): string {
  if (!value) {
    return "";
  }
  return value
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      "",
    )
    .toString();
}

function normalizeTags(tags?: string | null): string[] | undefined {
  if (!tags) {
    return undefined;
  }

  return tags
    .replaceAll("#", "")
    .replaceAll(" ", "")
    .split(",")
    .filter(Boolean)
    .slice(0, 5);
}

export interface BuildPayloadOptions {
  includeSuggestedShippingClasses?: boolean;
}

export class MercariMapper {
  constructor(private readonly client: MercariClient) {}

  private mapColorId(color?: string | null): number | undefined {
    if (!color) return undefined;
    const normalized = color.trim();
    const possible = [
      "Black",
      "Gray",
      "White",
      "Beige",
      "Red",
      "Pink",
      "Purple",
      "Blue",
      "Green",
      "Yellow",
      "Orange",
      "Brown",
      "Gold",
      "Silver",
    ];

    const index = possible.findIndex((entry) => entry === normalized);
    return index === -1 ? undefined : index + 1;
  }

  private mapCondition(condition: Product["condition"]): number {
    switch (condition) {
      case "NewWithTags":
        return 1;
      case "NewWithoutTags":
        return 2;
      case "VeryGood":
      case "Good":
        return 3;
      case "Fair":
        return 4;
      case "Poor":
        return 5;
      default:
        throw {
          success: false,
          message: "Incorrect condition.",
          type: "validation",
          internalErrors: "Incorrect condition",
        };
    }
  }

  private async uploadPhotos(productId: string): Promise<string[]> {
    const media = await getProductMediaForMarketplace(productId, "mercari");
    if (!media || media.length === 0) {
      throw new Error("Mercari requires at least one product image.");
    }
    return this.client.uploadImages(media);
  }

  private mapBrandId(name?: string | null): number {
    if (!name) {
      return 0;
    }
    const brand = mercariBrands.find(
      (entry) => entry.name.toLowerCase() === name.toLowerCase(),
    );
    return brand?.id ?? 0;
  }

  private getZipCode(product: Product): string {
    const zip = product.shipping?.shippingAddress?.zipCode;
    if (!zip) {
      throw {
        success: false,
        message:
          "Please enter valid shipping address details under your Wrenlist account settings.",
        type: "validation",
        internalErrors: "Zipcode not entered",
      };
    }
    return zip;
  }

  private ensurePriceCents(priceCents: number): void {
    if (priceCents < MIN_PRICE_CENTS || priceCents > MAX_PRICE_CENTS) {
      throw new Error(
        "Please enter the item price in the range supported by Mercari.",
      );
    }
  }

  public async buildPayload(
    product: Product,
    options: BuildPayloadOptions = {},
  ): Promise<MercariListingPayload> {
    const priceCents = Math.round(product.price * 100);
    this.ensurePriceCents(priceCents);

    const photos = await this.uploadPhotos(product.id);
    const name = sanitizeText(product.title);
    const description = sanitizeText(product.description);
    const categoryId = Number(product.category?.[0] ?? 0);
    const sizeId = Number(product.size?.[0] ?? 0);
    const conditionId = this.mapCondition(product.condition);
    const brandId = this.mapBrandId(product.brand);
    const zipCode = this.getZipCode(product);

    const payload: MercariListingPayload = {
      photoIds: photos,
      name,
      price: priceCents,
      description,
      categoryId,
      conditionId,
      brandId,
      zipCode,
      tags: normalizeTags(product.tags ?? undefined),
      shippingPayerId: 1,
      shippingClassIds: [
        product.shipping.shippingType === "Prepaid" ? DEFAULT_PREPAID_CLASS_ID : 0,
      ],
      sizeId,
      isAutoPriceDrop: Boolean(product.smartPricing),
      minPriceForAutoPriceDrop: product.smartPricing
        ? Math.ceil(
            Math.max(product.smartPricingPrice ?? product.price * 0.9, 1) * 100,
          )
        : Math.ceil(priceCents - priceCents * 0.1),
      offerConfig: {
        minPriceForSmartOffer: 0,
      },
      colorId: this.mapColorId(product.color),
      suggestedShippingClassIds: [DEFAULT_PREPAID_CLASS_ID],
      isShippingSoyo: true,
      shippingDeliveryType: "SOYO",
      shippingWeightUnit: undefined,
      shippingPackageWeight: undefined,
    };

    let sellerShippingFee = 0;
    const shippingWeight = product.shipping.shippingWeight;
    const preferredCarrier =
      (product.shipping as Record<string, unknown>)?.preferredCarrier;

    if (
      product.shipping.shippingType === "Prepaid" &&
      shippingWeight?.inOunces != null
    ) {
      const shippingOunces = shippingWeight.inOunces ?? 0;
      if (shippingOunces > MAX_WEIGHT_OUNCES) {
        throw {
          success: false,
          message: "Mercari only supports package weights up to 50 lbs.",
          type: "validation",
          internalErrors: "Package too heavy",
        };
      }

      const carrierResponse = await this.client.fetchCarriers(
        categoryId,
        shippingWeight,
        product.shipping.shippingHeight as number | undefined,
        product.shipping.shippingWidth as number | undefined,
        product.shipping.shippingLength as number | undefined,
      );

      const available =
        carrierResponse?.availableShippingClassesV2?.shippingClasses ?? [];
      const filtered = available.filter((entry) => {
        const carrierMatch =
          typeof preferredCarrier === "string"
            ? entry.carrierDisplayName?.includes(preferredCarrier)
            : true;
        return (
          carrierMatch &&
          (entry.maxWeight == null ||
            entry.maxWeight >= shippingOunces)
        );
      });

      if (!filtered.length) {
        throw new Error(
          "No suitable carrier found for the given weight or preferred carrier.",
        );
      }

      const selected = filtered.reduce((lowest, current) =>
        !lowest || current.fee < lowest.fee ? current : lowest,
      );

      payload.shippingClassIds = [selected.id];
      payload.shippingPayerId = product.shipping.sellerPays ? 2 : 1;
      payload.shippingWeightUnit = "OUNCE";
      payload.shippingPackageWeight = shippingOunces;
      payload.isShippingSoyo = false;
      payload.shippingDeliveryType = "MERCARI";
      sellerShippingFee = product.shipping.sellerPays ? selected.fee : 0;
    }

    payload.salesFee = await this.client.fetchSalesFee(payload);

    if (payload.price - (payload.salesFee ?? 0) - sellerShippingFee <= 0) {
      throw new Error(
        "After fees and shipping, this listing would result in a negative price.",
      );
    }

    if (product.dynamicProperties?.IMEI) {
      payload.imei = product.dynamicProperties.IMEI;
    }

    if (options.includeSuggestedShippingClasses === false) {
      delete payload.suggestedShippingClassIds;
    }

    return payload;
  }
}

