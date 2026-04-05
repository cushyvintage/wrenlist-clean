import {
  getProductMediaForMarketplace,
} from "../../shared/api.js";
import type { Product } from "../../types.js";

const PRODUCT_OPTIONS = [
  { name: "Size", position: 1 },
  { name: "Color", position: 2 },
  { name: "Condition", position: 3 },
] as const;

const METAFIELD_DEFINITIONS = {
  size: {
    key: "size",
    namespace: "custom",
    type: "single_line_text_field",
  },
  color: {
    key: "color",
    namespace: "custom",
    type: "single_line_text_field",
  },
};

export interface ShopifyMediaInput {
  mediaContentType: string;
  originalSource: string;
}

export interface ShopifyCreatePayload {
  media: ShopifyMediaInput[];
  product: Record<string, unknown>;
}

export interface ShopifyUpdatePayload {
  mediaToReorder: unknown[];
  mediaToUpdate: unknown[];
  product: Record<string, unknown>;
  productId: string;
  publicationsToPublish: unknown[];
  publicationsToUnpublish: unknown[];
  shouldPublish: boolean;
  shouldQueryB2bCatalogs: boolean;
  shouldQueryMarkets: boolean;
  shouldQueryMarketsPro: boolean;
  shouldReorderMedia: boolean;
  shouldReturnChannelPublishingData: boolean;
  shouldUnpublish: boolean;
  shouldUpdateMedia: boolean;
  skipProductUpdate: boolean;
}

export interface ShopifyImageUploadResult {
  success: boolean;
  mediaContentType: string;
  originalSource: string;
}

export interface ShopifyMapperDeps {
  uploadImages: (files: File[]) => Promise<ShopifyImageUploadResult[]>;
  getLocationId: () => Promise<string>;
}

export class ShopifyMapper {
  constructor(private readonly deps: ShopifyMapperDeps) {}

  public async map(product: Product): Promise<ShopifyCreatePayload> {
    const mediaFiles = await getProductMediaForMarketplace(product.id, "shopify");
    if (!mediaFiles.length) {
      throw new Error("Shopify requires at least one product image.");
    }

    const uploads = await this.deps.uploadImages(mediaFiles);
    const locationId = await this.deps.getLocationId();

    const { productOptions, metafields } = this.buildOptionData(product);

    return {
      media: uploads.map((upload) => ({
        mediaContentType: upload.mediaContentType,
        originalSource: upload.originalSource,
      })),
      product: this.buildProductInput(product, productOptions, locationId, metafields),
    };
  }

  public async mapForEdit(
    product: Product,
  ): Promise<ShopifyUpdatePayload> {
    const locationId = await this.deps.getLocationId();
    const { productOptions, metafields } = this.buildOptionData(product);

    return {
      mediaToReorder: [],
      mediaToUpdate: [],
      product: this.buildProductInputForEdit(
        product,
        productOptions,
        locationId,
        metafields,
      ),
      productId: `gid://shopify/Product/${product.marketplaceId}`,
      publicationsToPublish: [],
      publicationsToUnpublish: [],
      shouldPublish: false,
      shouldQueryB2bCatalogs: true,
      shouldQueryMarkets: true,
      shouldQueryMarketsPro: false,
      shouldReorderMedia: false,
      shouldReturnChannelPublishingData: false,
      shouldUnpublish: false,
      shouldUpdateMedia: false,
      skipProductUpdate: false,
    };
  }

  private buildOptionData(product: Product) {
    const productOptions: Array<{
      name: string;
      position: number;
      values: Array<{ name: string }>;
    }> = [];
    const metafields: Array<Record<string, unknown>> = [];

    if (product.size?.length) {
      productOptions.push({
        ...PRODUCT_OPTIONS[0],
        values: [{ name: product.size[0] }],
      });
      metafields.push({
        ...METAFIELD_DEFINITIONS.size,
        value: product.size[0],
      });
    }

    const colorValues = [product.color, product.color2].filter(Boolean) as string[];
    if (colorValues.length) {
      productOptions.push({
        ...PRODUCT_OPTIONS[1],
        values: [{ name: colorValues[0] }],
      });
      metafields.push({
        ...METAFIELD_DEFINITIONS.color,
        value: colorValues.join(", "),
      });
    }

    return { productOptions, metafields };
  }

  private buildProductInput(
    product: Product,
    productOptions: Array<{ name: string; position: number; values: Array<{ name: string }> }>,
    locationId: string,
    metafields: Array<Record<string, unknown>>,
  ) {
    const tags = (product.tags ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const weightValue = product.shipping.shippingWeight?.value ?? 0;
    const weightUnitRaw = product.shipping.shippingWeight?.unit ?? "Ounces";
    const weightUnit =
      weightUnitRaw?.toLowerCase() === "grams" ? "GRAMS" : "OUNCES";

    const variantOptions = productOptions.flatMap((option) => option.values ?? []);

    return {
      title: product.title,
      descriptionHtml: (product.description ?? "").replace(/\n/g, "<br/>"),
      category: product.category?.[0]
        ? `gid://shopify/TaxonomyCategory/${product.category[0]}`
        : null,
      customProductType: "",
      collectionsToJoin: [],
      vendor: product.brand ?? "",
      tags,
      productOptions,
      variants: [
        {
          inventoryItem: {
            cost: null,
            tracked: true,
          },
          inventoryPolicy: "DENY",
          price: product.price,
          barcode: "",
          compareAtPrice: product.originalPrice ?? null,
          sku: product.sku ?? "",
          requiresShipping: true,
          weight: weightValue,
          weightUnit,
          inventoryQuantities: [
            {
              availableQuantity: product.quantity ?? 1,
              locationId,
            },
          ],
          taxable: false,
          options: variantOptions.map((value) => value.name),
          metafields,
        },
      ],
      workflow: "product-details-create",
      status: "ACTIVE",
    };
  }

  private buildProductInputForEdit(
    product: Product,
    productOptions: Array<{ name: string; position: number; values: Array<{ name: string }> }>,
    locationId: string,
    metafields: Array<Record<string, unknown>>,
  ) {
    const base = this.buildProductInput(product, productOptions, locationId, metafields);
    return {
      ...base,
      id: `gid://shopify/Product/${product.marketplaceId}`,
      workflow: "product-details-update",
    };
  }
}





