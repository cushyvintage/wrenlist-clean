import { depopBrands } from "../../data/index.js";
import { chunkConcurrentRequestsWithRetry, getProductMediaForMarketplace, } from "../../shared/api.js";
import { Color, Condition, isColor } from "../../shared/enums.js";
const TLD_CURRENCIES = {
    "co.uk": "GBP",
    ca: "CAD",
    "com.au": "AUD",
};
const TLD_COUNTRY_CODES = {
    "co.uk": "GB",
    ca: "CA",
    "com.au": "AU",
};
const COUNTRY_LABELS = {
    UK: "United Kingdom",
    GB: "United Kingdom",
    US: "United States",
    AU: "Australia",
    CA: "Canada",
};
const STYLE_MAP = {
    "70s": "retro",
    "80s": "retro",
    "90s": "retro",
    Activewear: "sportswear",
    Athleisure: "loungewear",
    "Avant Garde": "avant_garde",
    Bikercore: "biker",
    Bohemian: "boho",
    Casual: "casual",
    Coquette: "coquette",
    Costume: "costume",
    Cosplay: "cosplay",
    Cottage: "cottage",
    Emo: "emo",
    Fairy: "fairy",
    Futuristic: "futuristic",
    Glam: "glam",
    Gorpcore: "gorpcore",
    Goth: "goth",
    Grunge: "grunge",
    Indie: "indie",
    Kidcore: "kidcore",
    Loungewear: "loungewear",
    Minimalist: "minimalist",
    Preppy: "preppy",
    Punk: "punk",
    Rave: "rave",
    Regency: "regency",
    Retro: "retro",
    Skater: "skater",
    Sportswear: "sportswear",
    Streetwear: "streetwear",
    Twee: "twee",
    Utility: "techwear",
    Western: "western",
    Whimsigoth: "whimsygoth",
    Y2K: "y2_k",
};
const AGE_MAP = {
    "2020 - 2024": "modern",
    "2010 - 2019": "modern",
    "2005 - 2009": "y2k",
    "2000 - 2004": "y2k",
    "1990s": "90s",
    "1980s": "80s",
    "1970s": "70s",
    "1960s": "60s",
    "1950s": "50s",
    "1940s": "antique",
    "1930s": "antique",
    "1920s": "antique",
    "1910s": "antique",
    "1900 - 1901": "antique",
    "1800s": "antique",
    "1700s": "antique",
    Before1700: "antique",
    Before2005: "modern",
    MadeToOrder: "",
};
export class DepopMapper {
    depopClient;
    tld;
    constructor(depopClient, tld) {
        this.depopClient = depopClient;
        this.tld = tld;
    }
    mapCondition(condition) {
        switch (condition) {
            case Condition.NewWithTags:
                return "brand_new";
            case Condition.NewWithoutTags:
                return "used_like_new";
            case Condition.VeryGood:
                return "used_excellent";
            case Condition.Good:
                return "used_good";
            case Condition.Fair:
            case Condition.Poor:
                return "used_fair";
            default:
                return null;
        }
    }
    async mapBrand(name) {
        if (!name) {
            return "unbranded";
        }
        const brand = depopBrands.find((entry) => entry.status === "active" &&
            entry.name.toLowerCase() === name.toLowerCase()) ?? null;
        return brand?.id ?? "unbranded";
    }
    async mapPhotos(productId) {
        const media = await getProductMediaForMarketplace(productId, "depop");
        if (!media?.length) {
            return [];
        }
        const tasks = media.map((file) => async () => this.depopClient.uploadImage(file));
        return chunkConcurrentRequestsWithRetry(tasks, 1);
    }
    mapGender(categoryRoot) {
        if (categoryRoot === "womenswear")
            return "female";
        if (categoryRoot === "menswear")
            return "male";
        return null;
    }
    getProvider(tld) {
        return tld === "co.uk" ? "MY_HERMES" : "USPS";
    }
    mapParcelSize(weight, provider) {
        if (!weight) {
            throw {
                success: false,
                message: "Missing shipping weight",
                type: "validation",
            };
        }
        if (provider === "USPS") {
            const ounces = weight.inOunces ?? 0;
            if (ounces <= 4)
                return "under_4oz";
            if (ounces <= 8)
                return "small";
            if (ounces <= 12)
                return "under_12oz";
            if (ounces <= 16)
                return "under_1lb";
            if (ounces <= 32)
                return "medium";
            if (ounces <= 160)
                return "large";
            throw {
                success: false,
                message: "Depop only supports package weights up to 10lbs.",
                type: "validation",
                internalErrors: "Package too heavy",
            };
        }
        const grams = weight.inGrams ?? 0;
        if (grams <= 1000)
            return "small";
        if (grams <= 2000)
            return "medium";
        if (grams <= 5000)
            return "large";
        throw {
            success: false,
            message: "Depop only supports package weights up to 5kg.",
            type: "validation",
            internalErrors: "Package too heavy",
        };
    }
    mapColor(color) {
        if (!color)
            return null;
        switch (color) {
            case Color.Beige:
                return "cream";
            case Color.Gray:
                return "grey";
            case Color.Turquoise:
            case Color.LightBlue:
                return "blue";
            case Color.Coral:
            case Color.Apricot:
                return "orange";
            case Color.Rose:
                return "pink";
            case Color.Lilac:
                return "purple";
            case Color.Mint:
            case "DarkGreen":
            case Color.DarkGreen:
                return "green";
            case Color.Mustard:
                return "yellow";
            case Color.Clear:
                return "blue";
            default:
                return isColor(color) ? color.toLowerCase() : null;
        }
    }
    mapColors(product) {
        const mapped = [
            this.mapColor(product.color),
            this.mapColor(product.color2),
        ];
        return mapped.filter(Boolean);
    }
    mapStyleTags(styles) {
        if (!styles?.length)
            return [];
        const mapped = styles
            .map((style) => STYLE_MAP[style])
            .filter((value) => Boolean(value))
            .map((value) => value.replace(/\s+/g, "_").toLowerCase());
        return [...new Set(mapped)].slice(0, 3);
    }
    mapWhenMade(value) {
        if (!value)
            return [];
        const mapped = AGE_MAP[value];
        return mapped ? [mapped] : [];
    }
    async map(product) {
        const currency = TLD_CURRENCIES[this.tld] ?? "USD";
        const countryCode = TLD_COUNTRY_CODES[this.tld] ?? "US";
        const addressLabel = COUNTRY_LABELS[countryCode] ?? COUNTRY_LABELS["US"] ?? "United States";
        const categoryRoot = product.category[0]?.toLowerCase() ?? "menswear";
        const payload = {
            address: addressLabel,
            countryCode,
            geoLat: 39.3812661305678,
            geoLng: -97.9222112121185,
            brand: (await this.mapBrand(product.brand)) ?? "unbranded",
            colour: this.mapColors(product),
            condition: this.mapCondition(product.condition),
            description: product.description,
            gender: this.mapGender(categoryRoot),
            isKids: categoryRoot === "kidswear",
            nationalShippingCost: product.shipping.shippingType === "ShipYourOwn"
                ? product.shipping.domesticShipping?.toString()
                : undefined,
            internationalShippingCost: product.shipping.worldwideShipping != null
                ? product.shipping.worldwideShipping.toString()
                : undefined,
            pictureIds: await this.mapPhotos(product.id),
            priceAmount: product.price.toString(),
            priceCurrency: currency,
            group: product.category[1],
            productType: product.category[2],
            variants: product.size?.[1]
                ? { [product.size[1]]: product.quantity }
                : undefined,
            quantity: product.quantity,
            variantSetId: product.size?.[0]
                ? parseInt(product.size[0], 10)
                : undefined,
            attributes: {},
            shippingMethods: [],
            listingLifecycleId: crypto.randomUUID(),
            style: this.mapStyleTags(product.styleTags),
            age: this.mapWhenMade(product.whenMade),
        };
        if (product.dynamicProperties?.["Source"]) {
            payload.source = [product.dynamicProperties["Source"]];
        }
        if (product.shipping.shippingType === "Prepaid" && product.shipping.shippingWeight) {
            const provider = this.getProvider(this.tld);
            const addresses = await this.depopClient.getPostalAddressForAuthenticatedUser(provider);
            let shippingAddresses = addresses;
            if (!shippingAddresses?.length) {
                shippingAddresses = [
                    await this.depopClient.createPostalAddress(product.shipping.shippingAddress),
                ];
            }
            const address = shippingAddresses[0];
            payload.shippingMethods = [
                {
                    shippingProviderId: provider,
                    shipFromAddressId: address.id,
                    payer: product.shipping.sellerPays ? "seller" : "buyer",
                    parcelSizeId: this.mapParcelSize(product.shipping.shippingWeight, provider),
                },
            ];
            payload.address = `${address.city}, ${COUNTRY_LABELS[address.country] ?? address.country}`;
        }
        return payload;
    }
}
