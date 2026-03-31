export const DEFAULT_TLD = "com";
export const SHOPIFY_SHOP_URL_KEY = "shopifyShopUrl";
export const UNEXPECTED_ERROR_MESSAGE = "An unexpected error occurred, please contact our support team.";
export function resolveTld(marketplace, options = {}) {
    if (options.tld) {
        return options.tld;
    }
    const key = `${marketplace}Tld`;
    const fromSettings = options.settings?.[key];
    if (typeof fromSettings === "string" && fromSettings.trim().length > 0) {
        return fromSettings;
    }
    return DEFAULT_TLD;
}
export function resolveShopifyUrl(settings) {
    const value = settings?.[SHOPIFY_SHOP_URL_KEY];
    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
    }
    return undefined;
}
export function includesText(value, needle) {
    if (!value) {
        return false;
    }
    return value.toLowerCase().includes(needle.toLowerCase());
}
export function needsVintedTokenRefresh(result) {
    return (includesText(result.internalErrors, '"code":106') ||
        includesText(result.internalErrors, '"code": 106') ||
        includesText(result.internalErrors, "invalid_authentication_token"));
}
export function includesCsrfError(result) {
    return (includesText(result.internalErrors, "csrf") ||
        includesText(result.message, "csrf"));
}
export function normalizeError(error) {
    if (isListingActionResult(error)) {
        return error;
    }
    if (typeof error === "string") {
        return { success: false, message: error };
    }
    if (error instanceof Error) {
        return {
            success: false,
            message: error.message || UNEXPECTED_ERROR_MESSAGE,
            internalErrors: safeStringify(error),
        };
    }
    return {
        success: false,
        message: UNEXPECTED_ERROR_MESSAGE,
        internalErrors: safeStringify(error),
    };
}
function isListingActionResult(value) {
    return Boolean(value &&
        typeof value === "object" &&
        "success" in value);
}
function safeStringify(value) {
    if (typeof value === "undefined") {
        return undefined;
    }
    try {
        if (typeof value === "object" && value !== null) {
            return JSON.stringify(value, Object.getOwnPropertyNames(value));
        }
        return JSON.stringify(value);
    }
    catch {
        return undefined;
    }
}
