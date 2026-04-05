import { chunkConcurrentRequests, getProductMedia, getProductMediaForMarketplace, } from "../../shared/api.js";
const VEHICLE_CATEGORY_ID = "807311116002614";
const SUPPORTED_COLORS = [
    "Red",
    "Pink",
    "Orange",
    "Yellow",
    "Green",
    "Blue",
    "Purple",
    "Gold",
    "Silver",
    "Black",
    "Gray",
    "White",
    "Brown",
    "Beige",
    "Clear",
];
const VEHICLE_ATTRIBUTE_MAP = {
    "Exterior Color": "exteriorColor",
    "Interior Color": "interiorColor",
    Make: "make",
    Model: "model",
    Mileage: "mileage",
    Year: "year",
    "Body Type": "vehicleType",
};
export class FacebookMapper {
    deps;
    currencyFallback = {
        US: "USD",
        UK: "GBP",
        CA: "CAD",
        AU: "AUD",
    };
    constructor(deps) {
        this.deps = deps;
    }
    async mapPhotos(productId, isVehicle) {
        const media = isVehicle
            ? await getProductMedia(productId, 20)
            : await getProductMediaForMarketplace(productId, "facebook");
        if (!media?.length) {
            throw new Error("Facebook requires at least one product image.");
        }
        const uploadTasks = media.map((file, index) => () => this.deps.uploadImage(file, index));
        const uploads = await chunkConcurrentRequests(uploadTasks, 3);
        const photoIds = uploads
            .map((upload) => upload?.payload?.photoID)
            .filter((id) => Boolean(id));
        if (!photoIds.length) {
            throw new Error("Unable to upload photos to Facebook.");
        }
        return photoIds;
    }
    mapCondition(condition) {
        switch (condition) {
            case "NewWithTags":
            case "NewWithoutTags":
                return "new";
            case "VeryGood":
                return "used_like_new";
            case "Good":
                return "used_good";
            case "Fair":
            case "Poor":
                return "used_fair";
            default:
                throw new Error("Condition not found");
        }
    }
    mapVehicleCondition(condition) {
        switch (condition) {
            case "NewWithTags":
            case "NewWithoutTags":
                return "excellent";
            case "VeryGood":
                return "very_good";
            case "Good":
                return "used_good";
            case "Fair":
                return "fair";
            case "Poor":
                return "poor";
            default:
                throw new Error("Condition not found");
        }
    }
    mapColor(color) {
        if (!color) {
            return null;
        }
        if (SUPPORTED_COLORS.includes(color)) {
            return color;
        }
        switch (color) {
            case "Cream":
            case "Tan":
            case "Khaki":
                return "Beige";
            case "Multi":
                return "Multi-Color";
            case "Turquoise":
            case "LightBlue":
            case "Navy":
                return "Blue";
            case "Coral":
            case "Apricot":
                return "Orange";
            case "Rose":
                return "Pink";
            case "Lilac":
                return "Purple";
            case "Mint":
            case "DarkGreen":
                return "Green";
            case "Mustard":
                return "Yellow";
            case "Burgundy":
                return "Red";
            default:
                return color;
        }
    }
    ensureLocation(shipping) {
        const address = shipping.shippingAddress ?? {};
        if (typeof address.lat !== "number" ||
            typeof address.lng !== "number") {
            throw {
                success: false,
                message: "Please enter valid shipping address details under your Wrenlist account settings.",
                type: "validation",
                internalErrors: "Lat/lng not available",
            };
        }
        return {
            latitude: address.lat,
            longitude: address.lng,
        };
    }
    buildDeliveryTypes(product) {
        const shipping = product.shipping;
        const deliveryTypes = [];
        if (shipping.shippingType !== "Pickup") {
            deliveryTypes.push("SHIPPING_ONSITE");
        }
        if (shipping.shippingType === "Pickup" || shipping.allowLocalPickup) {
            deliveryTypes.push("IN_PERSON");
        }
        if (product.publicMeetup) {
            deliveryTypes.push("PUBLIC_MEETUP");
        }
        if (shipping.doorPickup) {
            deliveryTypes.push("DOOR_PICKUP");
        }
        if (shipping.doorDropoff) {
            deliveryTypes.push("DOOR_DROPOFF");
        }
        return deliveryTypes;
    }
    async applyPrepaidShipping(payload, product) {
        const shipping = product.shipping;
        if (!shipping.shippingWeight) {
            return;
        }
        if (shipping.shippingWeight.inOunces != null && shipping.shippingWeight.inOunces > 799) {
            throw {
                success: false,
                message: "Facebook only supports package weights lower than 50lbs.",
                type: "validation",
                internalErrors: "Package too heavy",
            };
        }
        const carriers = await this.deps.fetchCarriers(product.category[0], shipping.shippingWeight, product.price);
        if (!carriers.length) {
            throw {
                success: false,
                message: "There were no shipping carriers found for your region, please change shipping to local pickup only or ship your own in your Wrenlist settings.",
                type: "validation",
                internalErrors: "No shipping carriers found",
            };
        }
        const preferredCarrier = product
            .preferredCarrier;
        const filtered = carriers.filter((carrier) => preferredCarrier
            ? carrier.commerce_shipping_carrier.includes(preferredCarrier)
            : true) || [];
        const candidateList = filtered.length ? filtered : carriers;
        const selected = candidateList.reduce((lowest, current) => !lowest || current.cost_amount < lowest.cost_amount ? current : lowest);
        const ounces = shipping.shippingWeight.inOunces ?? 0;
        payload.shipping_package_weight = {
            big_weight: {
                unit: "POUND",
                value: Math.floor(ounces / 16),
            },
            small_weight: {
                unit: "OUNCE",
                value: ounces % 16,
            },
        };
        payload.shipping_price = shipping.sellerPays ? "0" : (selected.cost_amount / 100).toString();
        payload.shipping_service_type = selected.shipping_service_type;
        payload.shipping_label_price = (selected.cost_amount / 100).toString();
        payload.shipping_label_rate_type = "CALCULATED_ON_PACKAGE_DETAILS";
        payload.shipping_calculation_logic_version = 1;
        payload.commerce_shipping_carrier = selected.commerce_shipping_carrier;
        payload.commerce_shipping_carriers = [selected.commerce_shipping_carrier];
        payload.shipping_options_data = [
            {
                commerce_shipping_carrier: selected.commerce_shipping_carrier,
                commerce_shipping_carriers: [],
                commerce_shipping_delivery_type: "SHIPPING",
                shipping_calculation_logic_version: 1,
                shipping_cost_option: shipping.sellerPays
                    ? "SELLER_PAID_SHIPPING"
                    : "BUYER_PAID_SHIPPING",
                shipping_cost_range_lower_cost: null,
                shipping_cost_range_upper_cost: null,
                shipping_label_price: {
                    currency: selected.cost_currency,
                    price: selected.cost_amount / 100,
                },
                shipping_label_rate_code: null,
                shipping_label_rate_type: "CALCULATED_ON_PACKAGE_DETAILS",
                shipping_option_type: "PREPAID_LABEL",
                shipping_package_weight: payload.shipping_package_weight,
                shipping_price: shipping.sellerPays
                    ? null
                    : {
                        currency: selected.cost_currency,
                        price: selected.cost_amount / 100,
                    },
                shipping_service_type: selected.shipping_service_type,
            },
        ];
    }
    applyOwnLabelShipping(payload, product) {
        const shipping = product.shipping;
        if (!shipping.domesticShipping && !shipping.sellerPays) {
            return;
        }
        if (shipping.domesticShipping && shipping.domesticShipping > 100) {
            throw {
                success: false,
                message: "Shipping cost can not exceed 100.",
                type: "validation",
                internalErrors: "Shipping cost too high",
            };
        }
        const country = shipping.shippingAddress?.country ?? "US";
        const currency = this.currencyFallback[country] ??
            "USD";
        payload.shipping_options_data = [
            {
                commerce_shipping_carrier: null,
                commerce_shipping_carriers: [],
                commerce_shipping_delivery_type: null,
                shipping_calculation_logic_version: null,
                shipping_cost_option: shipping.sellerPays || shipping.domesticShipping === 0
                    ? "SELLER_PAID_SHIPPING"
                    : "BUYER_PAID_SHIPPING",
                shipping_cost_range_lower_cost: null,
                shipping_cost_range_upper_cost: null,
                shipping_label_price: {
                    currency,
                    price: 0,
                },
                shipping_label_rate_code: null,
                shipping_label_rate_type: "FLAT_RATE",
                shipping_option_type: "OWN_LABEL",
                shipping_package_weight: null,
                shipping_price: shipping.sellerPays
                    ? null
                    : {
                        currency,
                        price: shipping.domesticShipping ?? 0,
                    },
                shipping_service_type: null,
            },
        ];
        payload.shipping_price = shipping.sellerPays
            ? "null"
            : (shipping.domesticShipping ?? 0).toString();
    }
    buildVehiclePayload(product) {
        const data = {
            fuelType: "",
            isKM: false,
            motorcycleABS: false,
            numberOfOwners: "",
            titleStatus: "",
            type: "autos",
            vehicleCategory: `${product.category[1] ?? ""}/`,
            vin: "",
            vehicleCondition: this.mapVehicleCondition(product.condition),
        };
        const entries = Object.entries(VEHICLE_ATTRIBUTE_MAP);
        for (const [sourceKey, targetKey] of entries) {
            const value = product.dynamicProperties?.[sourceKey];
            if (!value)
                continue;
            if (targetKey === "vehicleType") {
                data[targetKey] = value.toLowerCase().replaceAll(" ", "_");
            }
            else if (targetKey === "year") {
                data[targetKey] = parseInt(value, 10);
            }
            else {
                data[targetKey] = value.toString().toLowerCase();
            }
        }
        return JSON.stringify(data);
    }
    async map(product) {
        const attributeData = {
            vt_attributes_free_form: {},
            vt_attributes_normalized: {},
            condition: this.mapCondition(product.condition),
        };
        const color = this.mapColor(product.color);
        if (color) {
            attributeData.color = color;
            attributeData.vt_attributes_free_form["388499418630364"] = color;
        }
        if (product.brand) {
            attributeData.brand = product.brand;
        }
        if (product.size?.length) {
            if (product.size.length > 2) {
                attributeData.vt_attributes_normalized[product.size[1]] =
                    product.size[2];
            }
            else {
                attributeData.vt_attributes_normalized[product.size[0]] =
                    product.size[1];
            }
            attributeData.size = product.size[3] ?? product.size[1];
        }
        const { latitude, longitude } = this.ensureLocation(product.shipping);
        const deliveryTypes = this.buildDeliveryTypes(product);
        const addressCountry = product.shipping.shippingAddress?.country ?? "US";
        const currency = this.currencyFallback[addressCountry] ??
            "USD";
        const photos = await this.mapPhotos(product.id, product.category[0] === VEHICLE_CATEGORY_ID);
        const payload = {
            title: product.title,
            description: { text: product.description },
            category_id: product.category[0],
            source_type: "composer_listing_type_selector",
            surface: "composer",
            latitude,
            longitude,
            sku: product.sku,
            attribute_data_json: JSON.stringify(attributeData),
            photo_ids: photos,
            product_hashtag_names: product.tags?.replaceAll("#", "").replaceAll(" ", "").split(",") ?? [],
            hidden_from_friends_visibility: product.facebookShareWithFriends
                ? "VISIBLE_TO_EVERYONE"
                : "HIDDEN_FROM_FRIENDS",
            is_personalization_required: false,
            variants: [],
            video_ids: [],
            xpost_target_ids: [],
            suggested_hashtag_names: [],
            is_preview: false,
            draft_type: null,
            cost_per_additional_item: null,
            quantity: product.quantity,
            item_price: {
                currency,
                price: Math.ceil(product.price).toString(),
            },
            min_acceptable_checkout_offer_price: product.acceptOffers && product.price > 1
                ? Math.ceil(product.price * 0.5).toString()
                : "null",
            shipping_calculation_logic_version: null,
            shipping_cost_range_lower_cost: null,
            shipping_cost_range_upper_cost: null,
            shipping_label_rate_code: null,
            shipping_label_rate_type: null,
            shipping_package_weight: null,
            shipping_price: "null",
            shipping_service_type: null,
            shipping_cost_option: product.shipping.sellerPays
                ? "SELLER_PAID_SHIPPING"
                : "BUYER_PAID_SHIPPING",
            shipping_label_price: "0",
            shipping_offered: product.shipping.shippingType !== "Pickup",
            delivery_types: deliveryTypes,
            commerce_shipping_carrier: null,
            commerce_shipping_carriers: [],
            shipping_options_data: [],
        };
        if (product.shipping.shippingType !== "Pickup") {
            if (product.shipping.shippingType === "Prepaid") {
                await this.applyPrepaidShipping(payload, product);
            }
            else {
                this.applyOwnLabelShipping(payload, product);
            }
        }
        if (product.category[0] === VEHICLE_CATEGORY_ID) {
            payload.serialized_verticals_data = this.buildVehiclePayload(product);
        }
        return payload;
    }
}
