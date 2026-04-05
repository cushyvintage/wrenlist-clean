import { chunkConcurrentRequests, getProductMediaForMarketplace, } from "../../shared/crosslistApi.js";
import { Condition, Color, isColor } from "../../shared/enums.js";
const COLOR_LOOKUP = [
    { id: 1, code: "BLACK", alias: "black" },
    { id: 2, code: "BROWN", alias: "brown" },
    { id: 3, code: "GREY", alias: "grey" },
    { id: 4, code: "BODY", alias: "body" },
    { id: 5, code: "PINK", alias: "pink" },
    { id: 6, code: "PURPLE", alias: "purple" },
    { id: 7, code: "RED", alias: "red" },
    { id: 8, code: "YELLOW", alias: "yellow" },
    { id: 9, code: "BLUE", alias: "blue" },
    { id: 10, code: "GREEN", alias: "green" },
    { id: 11, code: "ORANGE", alias: "orange" },
    { id: 12, code: "WHITE", alias: "white" },
    { id: 13, code: "SILVER", alias: "silver" },
    { id: 14, code: "GOLD", alias: "gold" },
    { id: 15, code: "VARIOUS", alias: "multi" },
    { id: 16, code: "KHAKI", alias: "khaki" },
    { id: 17, code: "TURQUOISE", alias: "turquoise" },
    { id: 20, code: "CREAM", alias: "cream" },
    { id: 21, code: "APRICOT", alias: "apricot" },
    { id: 22, code: "CORAL", alias: "coral" },
    { id: 23, code: "BURGUNDY", alias: "burgundy" },
    { id: 24, code: "ROSE", alias: "rose" },
    { id: 25, code: "LILAC", alias: "lilac" },
    { id: 26, code: "LIGHT-BLUE", alias: "light-blue" },
    { id: 27, code: "NAVY", alias: "navy" },
    { id: 28, code: "DARK-GREEN", alias: "dark-green" },
    { id: 29, code: "MUSTARD", alias: "mustard" },
    { id: 30, code: "MINT", alias: "mint" },
    { id: 32, code: "CLEAR", alias: "clear" },
];
const CONDITION_MAP = {
    [Condition.NewWithTags]: 6,
    [Condition.NewWithoutTags]: 1,
    [Condition.VeryGood]: 2,
    [Condition.Good]: 3,
    [Condition.Fair]: 4,
    [Condition.Poor]: 4,
};
const VIDEO_RATING_MAP = {
    "AO - Adults only": "175",
    "E - Everyone": "170",
    "E10+ - Everyone 10+": "171",
    "M - Mature 17+": "173",
    "PEGI 12": "162",
    "PEGI 16": "164",
    "PEGI 18": "163",
    "PEGI 3": "160",
    "PEGI 7": "161",
    "RP - Rating pending": "174",
    "T - Teen 13+": "172",
    "USK 0": "165",
    "USK 12": "167",
    "USK 16": "168",
    "USK 18": "169",
    "USK 6": "166",
    Unspecified: "176",
};
const CONSOLE_PLATFORM_MAP = {
    "Asus ROG Ally": 1259,
    Atari: 1260,
    Ayaneo: 1261,
    Commodore: 1262,
    "Lenovo Legion Go": 1263,
    "Nintendo 2DS": 1264,
    "Nintendo 3DS": 1265,
    "Nintendo 64": 1266,
    "Nintendo DS": 1267,
    "Nintendo Entertainment System": 1268,
    "Nintendo Game Boy": 1269,
    "Nintendo Game Boy Advance": 1270,
    "Nintendo GameCube": 1272,
    "Nintendo Switch": 1273,
    "Nintendo Wii": 1274,
    "Nintendo Wii U": 1275,
    "PC & Mac": 1276,
    "PlayStation 1": 1277,
    "PlayStation 2": 1278,
    "PlayStation 3": 1279,
    "PlayStation 4": 1280,
    "PlayStation 5": 1281,
    "PlayStation Portable": 1282,
    "PlayStation Vita": 1283,
    "Sega Dreamcast": 1284,
    "Sega Mega Drive": 1285,
    "Steam Deck": 1286,
    "Super Nintendo": 1287,
    "Xbox (original)": 1288,
    "Xbox 360": 1289,
    "Xbox One": 1290,
    "Xbox Series S & X": 1291,
};
const RAM_MAP = {
    "2 GB": 3462,
    "4 GB": 3460,
    "8 GB": 3458,
    "12 GB": 3456,
    "16 GB": 3455,
    "24 GB": 3453,
    "32 GB": 3452,
    "64 GB": 3449,
};
const KEYBOARD_LAYOUT_MAP = {
    AZERTY: 1430,
    QWERTY: 1434,
    QWERTZ: 1435,
    "Other keyboard layout": 1896,
};
const SCREEN_SIZE_MAP = {
    '13.3"': 3497,
    '14"': 3496,
    '15.6"': 3496,
    '16"': 3495,
    '17.3"': 3495,
    '18"': 3494,
};
const OS_MAP = {
    macOS: 3487,
    Windows: 3488,
    "Chrome OS": 3489,
    Linux: 3490,
    DOS: 3491,
    Other: 3492,
    "No operating system": 3493,
};
const STORAGE_CAPACITY_MAP = {
    "64 GB": 3480,
    "128 GB": 3478,
    "256 GB": 3474,
    "512 GB": 3470,
    "1 TB": 3469,
    "2 TB": 3467,
    "4 TB": 3464,
};
const INTERNAL_MEMORY_MAP = {
    "256 MB": 1292,
    "512 MB": 1293,
    "1 GB": 1294,
    "2 GB": 1295,
    "3 GB": 1296,
    "4 GB": 1297,
    "6 GB": 1298,
    "8 GB": 1299,
    "10 GB": 1300,
    "12 GB": 1301,
    "16 GB": 1302,
    "32 GB": 1303,
    "64 GB": 1304,
    "128 GB": 1305,
    "256 GB": 1306,
    "512 GB": 1307,
    "1 TB": 1308,
    "2 TB": 1309,
    "3 TB": 1310,
    "4 TB": 1311,
};
const SIM_LOCK_MAP = {
    "Network Locked": 1312,
    "Factory Locked": 1312,
    "Network Unlocked": 1313,
};
const CPU_MAP = {
    "Apple M1": 3393,
    "Apple M1 Pro": 3394,
    "Apple M1 Max": 3395,
    "Apple M2": 3396,
    "Apple M2 Pro": 3397,
    "Apple M2 Max": 3398,
    "Apple M3": 3399,
    "Apple M3 Pro": 3400,
    "Apple M3 Max": 3401,
    "Apple M4": 3402,
    "Apple M4 Pro": 3403,
    "Apple M4 Max": 3404,
    "AMD Ryzen 9": 3405,
    "AMD Ryzen 7": 3406,
    "AMD Ryzen 5": 3407,
    "AMD Ryzen 3": 3410,
    "AMD Ryzen AI": 3408,
    "AMD Ryzen Threadripper": 3409,
    "AMD FX Series": 3411,
    "AMD E Series": 3412,
    "AMD A Series": 3413,
    "AMD Turion": 3414,
    "AMD Athlon": 3415,
    "Intel Core i9": 3416,
    "Intel Core i7": 3417,
    "Intel Core i5": 3418,
    "Intel Core i3": 3419,
    "Intel Core Ultra 9": 3420,
    "Intel Core Ultra 7": 3421,
    "Intel Core Ultra 5": 3422,
    "Intel Core Ultra 3": 3423,
    "Intel Core M7": 3424,
    "Intel Core M5": 3425,
    "Intel Core M3": 3426,
    "Intel Core M": 3427,
    "Intel Processor 300": 3428,
    "Intel Processor N Series": 3429,
    "Intel Processor U Series": 3430,
    "Intel Core 7": 3431,
    "Intel Core 5": 3432,
    "Intel Core 3": 3433,
    "Intel Core 2 Quad": 3434,
    "Intel Core 2 Duo": 3435,
    "Intel Xeon": 3436,
    "Intel Pentium": 3437,
    "Intel Celeron": 3438,
    "Intel Atom": 3439,
    "MediaTek Helio": 3440,
    "MediaTek Kompanio": 3441,
    "NVIDIA Tegra": 3442,
    "Qualcomm Snapdragon": 3443,
    Other: 3444,
};
const KEYBOARD_LAYOUT_DEFAULT = 1896;
export class VintedMapper {
    vintedClient;
    tld;
    currencyMap = {
        "co.uk": "GBP",
        ca: "CAD",
    };
    constructor(vintedClient, tld) {
        this.vintedClient = vintedClient;
        this.tld = tld;
    }
    async getPackageSize(shippingType, weight, catalogId) {
        if (shippingType !== "Prepaid" || !weight) {
            return 4;
        }
        if (this.tld === "co.uk") {
            if ((weight.inGrams ?? 0) > 20000) {
                throw {
                    success: false,
                    message: "Vinted only supports package weights up to 20kg.",
                    type: "validation",
                    internalErrors: "Package too heavy",
                };
            }
            const packageSizes = await this.vintedClient.fetchAvailablePackageSizes(catalogId);
            if (packageSizes.length === 0) {
                return 1;
            }
            const candidates = [
                { limit: 500, code: "SMALL" },
                { limit: 1000, code: "MEDIUM" },
                { limit: 2000, code: "LARGE" },
                { limit: 5000, code: "HEAVY_SMALL" },
                { limit: 10000, code: "HEAVY_MEDIUM" },
                { limit: 20000, code: "HEAVY_LARGE" },
                { limit: 5000, code: "BULKY_SMALL" },
                { limit: 10000, code: "BULKY_MEDIUM" },
                { limit: 20000, code: "BULKY_LARGE" },
                { limit: 30000, code: "BULKY_X_LARGE" },
            ];
            for (const candidate of candidates) {
                if ((weight.inGrams ?? 0) <= candidate.limit) {
                    const match = packageSizes.find((pkg) => pkg.code === candidate.code);
                    if (match) {
                        return match.id;
                    }
                }
            }
            throw {
                success: false,
                message: "Vinted only supports package weights up to 20kg.",
                type: "validation",
                internalErrors: "Package too heavy",
            };
        }
        const ounces = weight.inOunces ?? 0;
        if (ounces <= 16)
            return 1;
        if (ounces <= 32)
            return 2;
        if (ounces <= 64)
            return 3;
        throw {
            success: false,
            message: "Vinted only supports package weights up to 4lbs.",
            type: "validation",
            internalErrors: "Package too heavy",
        };
    }
    /**
     * Get package size ID for a specific category by fetching available options from Vinted.
     * This matches Crosslist's approach - always calculate from weight using available options,
     * never trust pre-computed IDs as they may not be valid for the target category.
     */
    async getPackageSizeForCategory(catalogId, weight, shippingType) {
        // If no catalogId, return default Medium (2)
        if (!catalogId) {
            console.warn('[Vinted Mapper] getPackageSizeForCategory called with null catalogId, returning default Medium (2)');
            return 2;
        }
        // For non-Prepaid shipping, use default size 4
        if (shippingType !== "Prepaid") {
            return 4;
        }
        // Fetch available package sizes for this specific category
        const availableSizes = await this.vintedClient.fetchAvailablePackageSizes(catalogId.toString());
        console.log('[Vinted Mapper] Available package sizes for catalog', catalogId, ':', availableSizes.map(p => ({ id: p.id, code: p.code })));
        // If no sizes available (API failed or returned empty), use hardcoded defaults.
        // Matches Crosslist's _packageSizeIdToWeight mapping: {1:500g, 2:1000g, 3:2000g, 8:5000g, 9:10000g, 10:20000g}
        if (availableSizes.length === 0) {
            if (!weight || (!weight.inGrams && !weight.inOunces)) {
                console.warn('[Vinted Mapper] No package sizes from API and no weight — using default 2 (Medium)');
                return 2; // Medium = sensible default for most items
            }
            if (this.tld === "co.uk") {
                const grams = weight.inGrams ?? 0;
                if (grams <= 500)
                    return 1; // Small
                if (grams <= 1000)
                    return 2; // Medium
                if (grams <= 2000)
                    return 3; // Large
                if (grams <= 5000)
                    return 8; // Heavy Small
                if (grams <= 10000)
                    return 9; // Heavy Medium
                return 10; // Heavy Large
            }
            else {
                const ounces = weight.inOunces ?? 0;
                if (ounces <= 16)
                    return 1;
                if (ounces <= 32)
                    return 2;
                return 3;
            }
        }
        // If no weight provided, use first available size
        if (!weight || (!weight.inGrams && !weight.inOunces)) {
            const defaultSize = availableSizes[0];
            console.log('[Vinted Mapper] No weight provided, using first available size:', defaultSize.id, defaultSize.code);
            return defaultSize.id;
        }
        if (this.tld === "co.uk") {
            const grams = weight.inGrams ?? 0;
            if (grams > 30000) {
                throw {
                    success: false,
                    message: "Vinted only supports package weights up to 30kg.",
                    type: "validation",
                    internalErrors: "Package too heavy",
                };
            }
            // Match weight to code, then find ID from available options (Crosslist approach)
            // Order matters: check from smallest to largest
            const weightToCode = [
                { maxGrams: 500, code: "SMALL" },
                { maxGrams: 1000, code: "MEDIUM" },
                { maxGrams: 2000, code: "LARGE" },
                { maxGrams: 5000, code: "HEAVY_SMALL" },
                { maxGrams: 5000, code: "BULKY_SMALL" },
                { maxGrams: 10000, code: "HEAVY_MEDIUM" },
                { maxGrams: 10000, code: "BULKY_MEDIUM" },
                { maxGrams: 20000, code: "HEAVY_LARGE" },
                { maxGrams: 20000, code: "BULKY_LARGE" },
                { maxGrams: 30000, code: "BULKY_X_LARGE" },
            ];
            // Find the first matching size by weight that's available for this category
            for (const candidate of weightToCode) {
                if (grams <= candidate.maxGrams) {
                    const match = availableSizes.find(pkg => pkg.code === candidate.code);
                    if (match) {
                        console.log('[Vinted Mapper] Matched weight', grams, 'g to', match.code, '(id:', match.id, ')');
                        return match.id;
                    }
                }
            }
            // If no weight-based match found, use first available size
            console.warn('[Vinted Mapper] No weight match found for', grams, 'g, using first available:', availableSizes[0].code);
            return availableSizes[0].id;
        }
        else {
            // US/Canada: simple ounce-based mapping
            const ounces = weight.inOunces ?? 0;
            if (ounces <= 16)
                return availableSizes.find(p => p.id === 1)?.id ?? availableSizes[0].id;
            if (ounces <= 32)
                return availableSizes.find(p => p.id === 2)?.id ?? availableSizes[0].id;
            if (ounces <= 64)
                return availableSizes.find(p => p.id === 3)?.id ?? availableSizes[0].id;
            throw {
                success: false,
                message: "Vinted only supports package weights up to 4lbs.",
                type: "validation",
                internalErrors: "Package too heavy",
            };
        }
    }
    isTitleValid(title) {
        const len = title.length;
        const normalized = title.replace(/[\s-]+/g, "");
        if (normalized.length === 0)
            return true;
        const uppercaseRatio = (normalized.match(/[A-Z]/g) ?? []).length / normalized.length;
        return !(/[A-Z]{7,}/.test(normalized) ||
            (len > 12 && uppercaseRatio >= 0.5));
    }
    async mapBrand(brand) {
        if (!brand) {
            return { id: 425886, title: "NO LABEL" };
        }
        const results = await this.vintedClient.fetchBrands(brand);
        const match = results.find((entry) => entry.title.toLowerCase() === brand.toLowerCase());
        // If brand not found in Vinted, use "NO LABEL" as fallback
        // Vinted requires a valid brand_id for updates
        if (!match) {
            console.log(`[Vinted Mapper] Brand "${brand}" not found in Vinted, using "NO LABEL" as fallback`);
            return { id: 425886, title: "NO LABEL" };
        }
        return match;
    }
    async mapColorToIndex(color) {
        if (!color)
            return null;
        let alias = color;
        if (alias === "Gray")
            alias = "grey";
        if (alias === "Multi")
            alias = "various";
        if (alias === "Tan")
            alias = "khaki";
        if (alias === "LightBlue")
            alias = "light-blue";
        if (alias === "DarkGreen")
            alias = "dark-green";
        if (alias === "Beige")
            alias = "body";
        const match = COLOR_LOOKUP.find((entry) => entry.alias.toLowerCase() === alias.toLowerCase());
        if (match)
            return match.id;
        throw {
            success: false,
            message: `No color with color name "${color}" found`,
        };
    }
    async mapPhotos(media, tempUuid) {
        if (!media?.length) {
            return [];
        }
        const uploadTasks = media.map((file) => () => this.vintedClient.uploadImage(file, tempUuid));
        const results = await chunkConcurrentRequests(uploadTasks, 3);
        return results.map((photo) => ({ id: photo.id, orientation: 0 }));
    }
    mapVideoRating(value) {
        return value ? VIDEO_RATING_MAP[value] : undefined;
    }
    mapConsolePlatform(value) {
        return value ? CONSOLE_PLATFORM_MAP[value] : undefined;
    }
    mapRam(value) {
        return value ? RAM_MAP[value] : undefined;
    }
    mapKeyboardLayout(value) {
        return value ? KEYBOARD_LAYOUT_MAP[value] ?? KEYBOARD_LAYOUT_DEFAULT : undefined;
    }
    mapScreenSize(value) {
        return value ? SCREEN_SIZE_MAP[value] : undefined;
    }
    mapOs(value) {
        return value ? OS_MAP[value] : undefined;
    }
    mapStorageCapacity(value) {
        return value ? STORAGE_CAPACITY_MAP[value] : undefined;
    }
    mapInternalMemory(value) {
        return value ? INTERNAL_MEMORY_MAP[value] : undefined;
    }
    mapSimLock(value) {
        return value ? SIM_LOCK_MAP[value] : undefined;
    }
    mapCpu(value) {
        return value ? CPU_MAP[value] : undefined;
    }
    normalizeColor(value) {
        if (!value)
            return null;
        if (value === "Dark green")
            return Color.DarkGreen;
        if (value === "Light blue")
            return Color.LightBlue;
        if (value === "Grey")
            return Color.Gray;
        return isColor(value) ? value : null;
    }
    /**
     * Preflight validation: Check product data before sending to Vinted
     * Based on known Vinted validation errors:
     * - Code 131: Missing zipcode (handled in postListing)
     * - Code 52: Need 3+ images for well-known brands
     * - validation_error: Missing/invalid fields (catalog_id, title, price, etc.)
     *
     * Returns validation result and pre-computed values to avoid duplicate API calls
     */
    async validateProduct(product) {
        const errors = [];
        // Required fields
        if (!product.title || product.title.trim().length === 0) {
            errors.push("Title is required");
        }
        if (!product.description || product.description.trim().length === 0) {
            errors.push("Description is required");
        }
        if (!product.price || product.price <= 0) {
            errors.push("Price must be greater than 0");
        }
        if (!product.condition || !CONDITION_MAP[product.condition]) {
            errors.push(`Invalid condition: ${product.condition}. Must be one of: ${Object.keys(CONDITION_MAP).join(", ")}`);
        }
        if (!product.category || product.category.length === 0 || !product.category[0]) {
            errors.push("Category is required");
        }
        // Check if product has catalog ID directly (from vinted_category_id or vinted_catalog_id)
        // Also check marketplace_data.vinted.catalog_id (from imported products)
        // Parse to number if it's a string
        const rawDirectCatalogId = product.vintedCatalogId ||
            product.dynamicProperties?.vintedCatalogId ||
            product.marketplace_data?.vinted?.catalog_id;
        const directCatalogId = typeof rawDirectCatalogId === 'number'
            ? rawDirectCatalogId
            : (typeof rawDirectCatalogId === 'string' && /^\d+$/.test(rawDirectCatalogId.trim())
                ? parseInt(rawDirectCatalogId.trim(), 10)
                : null);
        // Check if category[0] is already a numeric ID
        const numericCategoryId = product.category?.[0] && typeof product.category[0] === 'string' && /^\d+$/.test(product.category[0])
            ? parseInt(product.category[0], 10)
            : null;
        // Pre-fetch values we'll need anyway (avoid duplicate calls)
        // If we already have a numeric catalog ID, skip catalog fetching/resolution
        const needCatalogResolution = !(directCatalogId || numericCategoryId);
        const [resolvedCatalogId, catalogs, brand, media] = await Promise.all([
            needCatalogResolution && product.category?.[0]
                ? this.vintedClient.getCatalogId(product.category[0])
                : Promise.resolve(null),
            needCatalogResolution ? this.vintedClient.fetchCatalogs() : Promise.resolve([]),
            this.mapBrand(product.brand),
            getProductMediaForMarketplace(product.id, "vinted"),
        ]);
        // Determine final catalog ID - prefer direct ID, then numeric category, then resolved
        let finalCatalogId = null;
        if (directCatalogId) {
            // Trust the provided catalog ID (already validated as number)
            finalCatalogId = directCatalogId;
            console.log('[Vinted Mapper] Using direct catalogId:', finalCatalogId);
        }
        else if (numericCategoryId) {
            // Trust the numeric category ID
            finalCatalogId = numericCategoryId;
        }
        else if (resolvedCatalogId) {
            // Use resolved catalog ID from category name
            finalCatalogId = resolvedCatalogId;
        }
        else if (product.category?.[0]) {
            // Could not resolve category name to catalog ID - log warning but don't block publish
            // User can pick category manually on Vinted
            console.warn('[Vinted Mapper] Could not resolve catalog ID for category:', product.category[0], '— user will pick on Vinted');
        }
        // Check images - at least 1 required, 3+ for well-known brands
        // If vintedMetadata has existing photo IDs, skip image fetch validation entirely
        const hasExistingVintedPhotos = product.vintedMetadata?.photos?.length > 0;
        const imageUrls = product.images || [];
        const hasImageUrls = Array.isArray(imageUrls) && imageUrls.length > 0;
        if (!hasExistingVintedPhotos) {
            if (!hasImageUrls) {
                errors.push("Product has no images in the database. Please add at least 1 image URL to the product.");
            }
            else if (!media || media.length === 0) {
                // Product has image URLs but media endpoint failed to fetch them
                errors.push(`Product has ${imageUrls.length} image URL(s) but failed to fetch them. Check that image URLs are accessible.`);
            }
        }
        else {
            // Check if brand is well-known (not "NO LABEL")
            const isWellKnownBrand = brand.id !== 425886 && brand.id !== null;
            if (isWellKnownBrand && media.length < 3) {
                errors.push("Well-known brands require at least 3 images");
            }
        }
        // Validate shipping info for package size
        if (!product.shipping?.shippingWeight) {
            errors.push("Shipping weight is required");
        }
        return {
            valid: errors.length === 0,
            errors,
            catalogId: finalCatalogId || resolvedCatalogId,
            brand,
            media,
        };
    }
    async map(product) {
        // Preflight validation (also pre-fetches catalogId, brand, and media)
        const validation = await this.validateProduct(product);
        if (!validation.valid) {
            throw {
                success: false,
                message: `Validation failed: ${validation.errors.join("; ")}`,
                type: "validation",
                errors: validation.errors,
            };
        }
        // Use pre-fetched values from validation
        const brand = validation.brand;
        const catalogId = validation.catalogId;
        // If catalogId couldn't be resolved, allow null — user will pick category on Vinted
        if (!catalogId) {
            console.warn('[Vinted Mapper] Catalog ID is null — user will select category on Vinted. Category hint:', product.category?.[0]);
        }
        // First check if colorIds are already provided as numeric IDs in dynamicProperties
        // This happens when the product has pre-computed Vinted color IDs from the AI batch process
        let colorIds = [];
        const precomputedColorIds = product.dynamicProperties?.colorIds;
        if (Array.isArray(precomputedColorIds) && precomputedColorIds.length > 0) {
            // Use the pre-computed IDs directly (they're already Vinted color IDs)
            colorIds = precomputedColorIds.filter((id) => typeof id === 'number' && id > 0);
            console.log('[Vinted Mapper] Using pre-computed colorIds:', colorIds);
        }
        else {
            // Fall back to mapping color names to IDs
            try {
                colorIds = [
                    await this.mapColorToIndex(product.color),
                    await this.mapColorToIndex(product.color2),
                ].filter((id) => Boolean(id));
            }
            catch (colorError) {
                console.warn('[Vinted Mapper] Color mapping failed, continuing without color:', colorError);
                // Don't throw - just proceed without colors and let Vinted's validation catch it
            }
        }
        const conditionId = CONDITION_MAP[product.condition];
        // Get uploadSessionId from the Vinted client (fetched from /items/new page)
        // Crosslist uses this for both temp_uuid and top-level upload_session_id
        const uploadSessionId = await this.vintedClient.refreshUploadSessionId();
        const tempUuid = uploadSessionId;
        // Calculate package size from weight using available options for this category.
        // Falls back to dynamicProperties.packageSizeId or default (2 = Medium) if API call fails.
        let packageSizeId;
        try {
            if (catalogId) {
                packageSizeId = await this.getPackageSizeForCategory(catalogId, product.shipping.shippingWeight, product.shipping.shippingType);
                console.log('[Vinted Mapper] Calculated packageSizeId:', packageSizeId, 'for catalog:', catalogId);
            }
            else {
                // No catalog ID — use fallback
                const fallback = product.dynamicProperties?.packageSizeId;
                packageSizeId = typeof fallback === 'number' ? fallback : 2;
                console.warn('[Vinted Mapper] No catalogId, using fallback package size:', packageSizeId);
            }
        }
        catch (pkgError) {
            // Fallback to provided packageSizeId or default Medium (2)
            const fallback = product.dynamicProperties?.packageSizeId;
            packageSizeId = typeof fallback === 'number' ? fallback : 2;
            console.warn('[Vinted Mapper] Package size fetch failed, using fallback:', packageSizeId, pkgError);
        }
        console.log('[Vinted Mapper] Final payload catalogId:', catalogId, 'type:', typeof catalogId);
        // Build payload matching Vinted's expected structure (aligned with Crosslist's working format)
        const payload = {
            item: {
                id: null,
                currency: this.currencyMap[this.tld] ?? "USD",
                temp_uuid: tempUuid,
                title: this.isTitleValid(product.title)
                    ? product.title
                    : `${product.title[0]}${product.title.slice(1).toLowerCase()}`,
                description: product.description,
                brand_id: brand.id,
                brand: brand.title,
                size_id: product.size?.[0] ? parseInt(String(product.size[0]), 10) : null,
                catalog_id: catalogId,
                isbn: null,
                is_unisex: false,
                status_id: conditionId,
                video_game_rating_id: null,
                price: product.price < 1 ? 1 : product.price,
                package_size_id: packageSizeId,
                shipment_prices: {
                    domestic: product.shipping.shippingType === "ShipYourOwn"
                        ? String(product.shipping.domesticShipping)
                        : null,
                    international: null,
                },
                color_ids: colorIds,
                // If vintedMetadata has existing photo IDs, reuse them directly (avoids re-upload)
                assigned_photos: product.vintedMetadata?.photos?.length
                    ? product.vintedMetadata.photos.map((p) => ({ id: p.id, orientation: 0 }))
                    : await this.mapPhotos(validation.media, tempUuid),
                measurement_length: null,
                measurement_width: null,
                item_attributes: [],
                manufacturer: null,
                manufacturer_labelling: null,
            },
            feedback_id: null,
            push_up: false,
            parcel: null,
            upload_session_id: uploadSessionId,
            // shippingAddress is stripped by client.ts before posting, used for address fallback
            shippingAddress: product.shipping.shippingAddress,
        };
        if (product.dynamicProperties?.ISBN) {
            payload.item.isbn = product.dynamicProperties.ISBN;
            let languageAdded = false;
            try {
                const isbnAttributes = await this.vintedClient.fetchISBNInfo(product.dynamicProperties.ISBN);
                const language = isbnAttributes.find((attr) => attr.code === "language_book");
                if (language) {
                    const languageId = language.value_ids?.[0];
                    if (languageId) {
                        payload.item.item_attributes.push({
                            code: "language_book",
                            ids: [languageId],
                        });
                        languageAdded = true;
                    }
                }
            }
            catch (isbnError) {
                // ISBN lookup failed - this is common for older/rare books not in Vinted's database
                console.warn('[Vinted Mapper] ISBN lookup failed, continuing without ISBN info:', isbnError);
            }
            // Fallback: If ISBN lookup didn't return language or failed, default to English (6435)
            // This is required for book categories - Vinted validates language_book
            if (!languageAdded) {
                console.log('[Vinted Mapper] ISBN lookup returned no language or failed, defaulting to English (6435)');
                payload.item.item_attributes.push({
                    code: "language_book",
                    ids: [6435], // English
                });
            }
        }
        if (product.dynamicProperties?.["Content rating"]) {
            payload.item.video_game_rating_id = this.mapVideoRating(product.dynamicProperties["Content rating"]);
        }
        if (product.dynamicProperties?.Platform) {
            const platformId = this.mapConsolePlatform(product.dynamicProperties.Platform);
            if (platformId) {
                payload.item.item_attributes.push({
                    code: "computer_platform",
                    ids: [platformId],
                });
            }
        }
        if (product.dynamicProperties?.MaterialVinted) {
            const ids = product.dynamicProperties.MaterialVinted.split("|").map((value) => parseInt(value, 10));
            payload.item.item_attributes.push({ code: "material", ids });
        }
        else if (product.dynamicProperties?.materialId) {
            // From wizard: materialId is a single numeric Vinted material ID
            const matId = parseInt(String(product.dynamicProperties.materialId), 10);
            if (!isNaN(matId)) {
                payload.item.item_attributes.push({ code: "material", ids: [matId] });
            }
        }
        if (product.dynamicProperties?.["Operating system series"]) {
            const osId = this.mapOs(product.dynamicProperties["Operating system series"]);
            if (osId) {
                payload.item.item_attributes.push({
                    code: "computer_operating_system",
                    ids: [osId],
                });
            }
        }
        if (product.dynamicProperties?.["Processor series"]) {
            const cpuId = this.mapCpu(product.dynamicProperties["Processor series"]);
            if (cpuId) {
                payload.item.item_attributes.push({
                    code: "computer_cpu_line",
                    ids: [cpuId],
                });
            }
        }
        if (product.dynamicProperties?.["Hard Drive Capacity"]) {
            const storageId = this.mapStorageCapacity(product.dynamicProperties["Hard Drive Capacity"]);
            if (storageId) {
                payload.item.item_attributes.push({
                    code: "computer_storage_capacity",
                    ids: [storageId],
                });
            }
        }
        if (product.dynamicProperties?.["RAM Size"]) {
            const ramId = this.mapRam(product.dynamicProperties["RAM Size"]);
            if (ramId) {
                payload.item.item_attributes.push({
                    code: "computer_ram",
                    ids: [ramId],
                });
            }
        }
        if (product.dynamicProperties?.["Screen Size"]) {
            const screenId = this.mapScreenSize(product.dynamicProperties["Screen Size"]);
            if (screenId) {
                payload.item.item_attributes.push({
                    code: "laptop_display_size",
                    ids: [screenId],
                });
            }
        }
        if (product.dynamicProperties?.["Charger included"]) {
            payload.item.item_attributes.push({
                code: "laptop_charger_included",
                ids: [product.dynamicProperties["Charger included"] === "true" ? 3500 : 3501],
            });
        }
        if (product.dynamicProperties?.["Keyboard layout"]) {
            const keyboardId = this.mapKeyboardLayout(product.dynamicProperties["Keyboard layout"]);
            if (keyboardId) {
                payload.item.item_attributes.push({
                    code: "keyboard_layout",
                    ids: [keyboardId],
                });
            }
        }
        if (product.dynamicProperties?.["Lock Status"]) {
            const simLockId = this.mapSimLock(product.dynamicProperties["Lock Status"]);
            if (simLockId) {
                payload.item.item_attributes.push({
                    code: "sim_lock",
                    ids: [simLockId],
                });
            }
        }
        if (product.dynamicProperties?.["Storage Capacity"] &&
            (product.category[0] === "3661" || product.category[0] === "3728")) {
            const internalId = this.mapInternalMemory(product.dynamicProperties["Storage Capacity"]);
            if (internalId) {
                payload.item.item_attributes.push({
                    code: "internal_memory_capacity",
                    ids: [internalId],
                });
            }
        }
        payload.item.model = { metadata: { collection_id: 1 } };
        return payload;
    }
    normalizeColorValue(value) {
        return this.normalizeColor(value);
    }
}
