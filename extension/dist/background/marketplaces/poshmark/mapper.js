import { chunkConcurrentRequests, getProductMediaForMarketplace, } from "../../shared/api.js";
import { Condition } from "../../shared/enums.js";
const TLD_CURRENCIES = {
    "co.uk": "GBP",
    ca: "CAD",
    "com.au": "AUD",
};
const TLD_SYMBOLS = {
    "co.uk": "£",
    ca: "C$",
    "com.au": "A$",
};
const STYLE_MAP = {
    "70s": "70s",
    "80s": "80s",
    "90s": "90s",
    Activewear: "Activewear",
    Athleisure: "Athleisure",
    "Avant Garde": "Avant Garde",
    Baggy: "Baggy",
    Balletcore: "Balletcore",
    Beaded: "Beaded",
    Bikercore: "Bikercore",
    Bohemian: "Bohemian",
    Bodycon: "Bodycon",
    Bow: "Bow",
    Bridal: "Bridal",
    Bridesmaid: "Bridesmaid",
    "Business Casual": "Business Casual",
    "Cable Knit": "Cable Knit",
    Cashmere: "Cashmere",
    Casual: "Casual",
    Chunky: "Chunky",
    Collegiate: "Collegiate",
    Colorblock: "Colorblock",
    Colorful: "Colorful",
    Contemporary: "Contemporary",
    "Coord Sets": "Coord Sets",
    Coquette: "Coquette Girl",
    "Coquette Girl": "Coquette Girl",
    Corduroy: "Corduroy",
    Crochet: "Crochet",
    Cropped: "Cropped",
    "Cruelty-Free": "Cruelty-Free",
    "Cut Out": "Cut Out",
    Denim: "Denim",
    DIY: "DIY",
    Distressed: "Distressed",
    "Drop Waist": "Drop Waist",
    "Eclectic Grandpa": "Eclectic Grandpa",
    Embroidered: "Embroidered",
    Emo: "Goth",
    Fall: "Fall",
    "Faux Fur": "Faux Fur",
    Feminine: "Feminine",
    Festival: "Festival",
    Flare: "Flare",
    Floral: "Floral",
    Formal: "Formal",
    Fringe: "Fringe",
    Gingham: "Gingham",
    Girlhoodcore: "Girlhoodcore",
    Gorpcore: "Gorpcore",
    Goth: "Goth",
    Grunge: "Grunge",
    "Hand Knit": "Hand Knit",
    Handmade: "Handmade",
    Herringbone: "Herringbone",
    Houndstooth: "Houndstooth",
    Indie: "Indie Sleeze",
    Knit: "Knit",
    Lace: "Lace",
    Leather: "Leather",
    "Leopard Print": "Leopard Print",
    Lightweight: "Lightweight",
    Linen: "Linen",
    Luxury: "Luxury",
    Maximalism: "Maximalism",
    Mesh: "Mesh",
    Metallic: "Metallic",
    Minimalist: "Minimalist",
    Monochrome: "Monochrome",
    Monogram: "Monogram",
    Moto: "Moto",
    Neon: "Neon",
    Neutral: "Neutral",
    Nylon: "Nylon",
    Office: "Office",
    Oversized: "Oversized",
    Paisley: "Paisley",
    Pastel: "Pastel",
    Party: "Party",
    Patchwork: "Patchwork",
    Peplum: "Peplum",
    Plaid: "Plaid",
    Platform: "Platform",
    Pleated: "Pleated",
    "Polka Dot": "Polka Dot",
    Preppy: "Preppy",
    Punk: "Punk",
    Quilted: "Quilted",
    "Quiet Luxury": "Quiet Luxury",
    "Relaxed Fit": "Relaxed Fit",
    Resortwear: "Resortwear",
    Retro: "Retro",
    Rosette: "Rosette",
    Ruffle: "Ruffle",
    Satin: "Satin",
    Sequins: "Sequins",
    Sheer: "Sheer",
    Silk: "Silk",
    Sportswear: "Sporty",
    Strapless: "Strapless",
    Streetwear: "Streetwear",
    Suede: "Suede",
    Summer: "Summer",
    Tailored: "Tailored",
    "Tennis Prep": "Tennis Prep",
    Tropical: "Tropical",
    "Two-Tone": "Two-Tone",
    Unisex: "Unisex",
    Upcycled: "Upcycled",
    Utility: "Utility",
    Vacation: "Vacation",
    Vegan: "Vegan",
    Velour: "Velour",
    Vintage: "Vintage",
    Waterproof: "Waterproof",
    Wedding: "Wedding",
    Western: "Western",
    Whimsigoth: "Whimsigoth",
    Wool: "Wool",
    Woven: "Woven",
    Y2K: "Y2K",
};
export class PoshmarkMapper {
    deps;
    tld;
    constructor(deps, tld) {
        this.deps = deps;
        this.tld = tld;
    }
    async brandExists(department, brand) {
        if (!department || !brand) {
            return false;
        }
        const results = await this.deps.getBrand(department, brand);
        return results.some((entry) => entry.brand_name?.toLowerCase() === brand.toLowerCase());
    }
    async mapImages(productId, listingId) {
        const media = await getProductMediaForMarketplace(productId, "poshmark");
        if (!media?.length) {
            throw new Error("Poshmark requires at least one product image.");
        }
        const uploadTasks = media.map((file, index) => () => this.deps.uploadImage(file, index + 1, listingId));
        return chunkConcurrentRequests(uploadTasks, 3);
    }
    mapColor(value) {
        switch (value) {
            case "Red":
            case "Pink":
            case "Orange":
            case "Yellow":
            case "Green":
            case "Blue":
            case "Purple":
            case "Gold":
            case "Silver":
            case "Black":
            case "White":
            case "Cream":
            case "Brown":
            case "Tan":
            case "Gray":
                return value;
            case "Khaki":
                return "Tan";
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
            case "Beige":
                return "Cream";
            case "Clear":
                return "Blue";
            case "Burgundy":
                return "Red";
            default:
                return null;
        }
    }
    mapColors(product) {
        const colors = [];
        const primary = this.mapColor(product.color);
        const secondary = this.mapColor(product.color2);
        if (primary)
            colors.push(primary);
        if (secondary)
            colors.push(secondary);
        return colors;
    }
    mapStyleTags(product) {
        const styles = product.styleTags ?? [];
        const mapped = styles
            .map((style) => STYLE_MAP[style])
            .filter((style) => Boolean(style));
        return Array.from(new Set(mapped)).slice(0, 3);
    }
    async map(product, listingId) {
        const uploads = await this.mapImages(product.id, listingId);
        const coverShot = uploads[0];
        const remainingPictures = uploads.slice(1).map((id) => ({ id }));
        const currency = TLD_CURRENCIES[this.tld] ?? "USD";
        const currencySymbol = TLD_SYMBOLS[this.tld] ?? "$";
        const sizeId = product.size?.[0] ?? "OS";
        const condition = product.condition === Condition.NewWithTags ? "nwt" : "not_nwt";
        const isBoutique = product.dynamicProperties?.IsBoutique === "true";
        const styleTags = this.mapStyleTags(product);
        const colors = this.mapColors(product);
        const priceValue = Math.ceil(product.price ?? 0).toString();
        const originalPriceValue = product.originalPrice
            ? Math.ceil(product.originalPrice).toString()
            : "0";
        const inventoryStatus = product.availability === "NotForSale" ? "not_for_sale" : "available";
        const payload = {
            id: listingId,
            title: product.title,
            description: product.description,
            inventory: {
                multi_item: (product.quantity ?? 1) > 1,
                size_quantity_revision: 0,
                status: inventoryStatus,
                size_quantities: [
                    {
                        size_id: sizeId,
                        size_obj: {
                            id: sizeId,
                            display: sizeId,
                            display_with_size_set: sizeId,
                            size_system: "us",
                        },
                        size_system: "us",
                        quantity_available: product.quantity ?? 1,
                        quantity_sold: 0,
                        size_set_tags: [],
                        seller_inventory_private_info: {},
                    },
                ],
            },
            colors,
            catalog: {
                category: product.category?.[1],
                department: product.category?.[0],
                category_features: product.category?.[2] ? [product.category[2]] : [],
            },
            cover_shot: { id: coverShot },
            price_amount: {
                val: priceValue,
                currency_code: currency,
                currency_symbol: currencySymbol,
            },
            original_price_amount: {
                val: originalPriceValue,
                currency_code: currency,
                currency_symbol: currencySymbol,
            },
            pictures: remainingPictures,
            condition: isBoutique ? "ret" : condition,
            style_tags: styleTags,
        };
        if (product.sku) {
            payload.seller_private_info = { sku: product.sku };
        }
        if (product.brand &&
            (await this.brandExists(product.category?.[0], product.brand))) {
            payload.brand = product.brand;
        }
        return payload;
    }
}
