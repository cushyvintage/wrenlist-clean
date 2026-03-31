import { Condition } from "../../shared/enums.js";
import { getProductMediaForMarketplace, } from "../../shared/crosslistApi.js";
export class WhatnotMapper {
    deps;
    tld;
    clothingTypes = [
        "fashion.vintage.clothing_type",
        "fashion.universal.type",
        "fashion.thrift.clothing_type",
        "fashion.designer_bag.type",
        "fashion.midrange_bags.type",
        "fashion.kids.clothing_type",
    ];
    tldCurrencies = {
        "co.uk": "GBP",
        ca: "CAD",
        "com.au": "AUD",
    };
    conditionMappings = {
        [Condition.NewWithoutTags]: [
            "New without Tags",
            "New",
            "Open-box",
            "Uncirculated - Mint",
        ],
        [Condition.NewWithTags]: ["New With Tags", "Brand New", "Graded", "Uncirculated - Mint", "New"],
        [Condition.VeryGood]: [
            "Pre-owned - Excellent",
            "Refurbished",
            "Mint",
            "Good - Extremely Fine",
            "Used",
        ],
        [Condition.Good]: [
            "Pre-owned - Good",
            "Used and fully functioning",
            "Light Played",
            "Good - Extremely Fine",
            "Used",
        ],
        [Condition.Fair]: [
            "Pre-owned - Fair",
            "Used and fully functioning",
            "Moderately Played",
            "Poor - Fair",
            "Used",
        ],
        [Condition.Poor]: [
            "Pre-owned - Damaged",
            "For parts, not fully functioning, or untested",
            "Heavily Played",
            "Poor - Fair",
            "Used",
        ],
    };
    constructor(deps, tld) {
        this.deps = deps;
        this.tld = tld;
    }
    async map(product) {
        const media = await getProductMediaForMarketplace(product.id, "whatnot");
        const uploads = media.length ? await this.deps.uploadImages(media) : [];
        if (!uploads.length) {
            throw new Error("Whatnot requires at least one product image.");
        }
        const attributes = await this.deps.getProductAttributes(product.category[0]);
        const attributeValues = [];
        const currency = this.tldCurrencies[this.tld] ?? "USD";
        const conditionValue = this.mapCondition(product.condition, attributes);
        if (conditionValue)
            attributeValues.push(conditionValue);
        if (product.size?.[0]) {
            const sizeValue = this.mapAttributeValue(attributes, (attr) => attr.key.includes("clothing_size") || attr.key.includes("shoe_size"), product.size[0]);
            if (sizeValue)
                attributeValues.push(sizeValue);
        }
        if (product.category?.[1]) {
            const clothingValue = this.mapClothingType(product.category[1], attributes);
            if (clothingValue)
                attributeValues.push(clothingValue);
        }
        if (product.brand) {
            const brandValue = this.mapAttributeValue(attributes, (attr) => attr.key.includes("brand"), product.brand);
            if (brandValue)
                attributeValues.push(brandValue);
        }
        if (product.color) {
            const colorValue = this.mapAttributeValue(attributes, (attr) => attr.key.includes("color"), product.color);
            if (colorValue)
                attributeValues.push(colorValue);
        }
        if (product.originalPrice) {
            const msrpValue = this.mapAttributeValue(attributes, (attr) => attr.key.includes("msrp"), product.originalPrice.toString());
            if (msrpValue)
                attributeValues.push(msrpValue);
        }
        if (product.dynamicProperties?.["Coin type"]) {
            const coinValue = this.mapAttributeValue(attributes, (attr) => attr.key.includes("coins.type"), product.dynamicProperties["Coin type"]);
            if (coinValue)
                attributeValues.push(coinValue);
        }
        const salesChannels = [
            { id: null, type: "MARKETPLACE" },
        ];
        if (product.isAuction) {
            const liveStreams = await this.deps.getMyLiveStreams();
            const liveId = liveStreams?.[0]?.id;
            if (!liveId) {
                throw {
                    success: false,
                    message: "Please create a live show on Whatnot before listing an auction.",
                    internalErrors: "No live show available",
                };
            }
            salesChannels.splice(0, salesChannels.length, { id: liveId, type: "LIVE" });
        }
        const shippingProfileId = await this.getShippingProfileId(product.category[0], product.shipping);
        const priceValue = product.isAuction
            ? product.auctionStartingPrice ?? product.price
            : product.price;
        return {
            uuid: crypto.randomUUID(),
            title: product.title,
            description: product.description?.replace(/^\$+/g, (match) => `$${match}`),
            hazmatType: "NOT_HAZMAT",
            images: uploads.map((id) => ({ id })),
            categoryId: product.category[0],
            price: {
                amount: Math.round(priceValue) * 100,
                currency,
            },
            productAttributeValues: attributeValues,
            quantity: product.quantity ?? 1,
            salesChannels,
            sku: product.sku?.replace(/\$+/g, (match) => `$${match}`),
            timedListingEvent: null,
            transactionProps: {
                isOfferable: true,
                auction: product.isAuction ? { endTime: null, isSuddenDeath: false } : null,
                purchaseLimits: null,
            },
            transactionType: product.isAuction ? "AUCTION" : "BUY_IT_NOW",
            reservedForSalesChannel: product.isAuction ? "LIVE" : "NONE",
            variants: null,
            shippingProfileId,
        };
    }
    async mapForUpdate(product) {
        const payload = await this.map(product);
        delete payload.uuid;
        return {
            ...payload,
            id: product.marketplaceId ?? product.marketPlaceId,
        };
    }
    mapCondition(condition, attributes) {
        const options = this.conditionMappings[condition];
        if (!options) {
            return null;
        }
        const attribute = attributes.find((attr) => attr.key.includes("condition"));
        if (!attribute) {
            return null;
        }
        const match = options.find((value) => attribute.validationRules?.enum?.includes(value));
        return match ? { id: attribute.id, value: match } : null;
    }
    mapAttributeValue(attributes, predicate, value) {
        const attribute = attributes.find(predicate);
        if (!attribute) {
            return null;
        }
        if (attribute.validationRules?.enum &&
            !attribute.validationRules.enum.includes(value)) {
            return null;
        }
        return { id: attribute.id, value };
    }
    mapClothingType(value, attributes) {
        const attribute = attributes.find((attr) => this.clothingTypes.includes(attr.key));
        if (!attribute) {
            return null;
        }
        const match = attribute.validationRules?.enum?.find((entry) => entry === value);
        return match ? { id: attribute.id, value: match } : null;
    }
    async getShippingProfileId(categoryId, shipping) {
        const weightInOunces = this.toOunces(shipping.shippingWeight);
        if (!weightInOunces) {
            return null;
        }
        const profiles = await this.deps.getShippingProfiles(categoryId);
        if (!profiles.length) {
            return null;
        }
        const enhanced = profiles.map((profile) => ({
            ...profile,
            weightInOunces: this.convertWeightToOunces(profile.weightAmount, profile.weightScale),
        }));
        const sorted = enhanced
            .filter((profile) => profile.weightInOunces > 0)
            .sort((a, b) => a.weightInOunces - b.weightInOunces);
        if (!sorted.length) {
            return null;
        }
        if (weightInOunces > sorted[sorted.length - 1].weightInOunces) {
            throw new Error("Shipping weight is too high.");
        }
        const match = sorted.find((profile) => profile.weightInOunces >= weightInOunces);
        return match?.id ?? null;
    }
    toOunces(weight) {
        if (!weight) {
            return null;
        }
        if (typeof weight.inOunces === "number") {
            return weight.inOunces;
        }
        const value = weight.value ?? 0;
        if (!value) {
            return null;
        }
        const unit = weight.unit?.toLowerCase();
        switch (unit) {
            case "ounces":
            case "ounce":
                return value;
            case "pounds":
            case "pound":
                return value * 16;
            case "grams":
                return value * 0.0352739619;
            case "kilograms":
            case "kilos":
                return value * 35.2739619;
            default:
                return null;
        }
    }
    convertWeightToOunces(value, scale) {
        if (value == null || !scale) {
            return -1;
        }
        switch (scale) {
            case "OUNCE":
                return Math.round(value);
            case "POUND":
                return Math.round(value * 16);
            case "GRAM":
                return Math.round(value * 0.0352739619);
            case "KILO":
                return Math.round(value * 35.2739619);
            default:
                return -1;
        }
    }
}
