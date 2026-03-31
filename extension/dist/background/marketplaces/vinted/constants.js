export const VINTED_DEFAULT_TLD = "com";
export const VINTED_RULE_IDS = {
    UK_API: 121,
    US_API: 12,
    PAGE: 150,
};
export function buildVintedBaseUrl(tld) {
    const domain = tld && tld.length > 0 ? tld : VINTED_DEFAULT_TLD;
    return `https://www.vinted.${domain}`;
}
export function buildVintedApiBase(tld) {
    return `${buildVintedBaseUrl(tld)}/api/v2`;
}
export function buildVintedUrls(tld) {
    const api = buildVintedApiBase(tld);
    return {
        base: buildVintedBaseUrl(tld),
        api,
        imageUpload: `${api}/photos`,
        createListing: `${api}/item_upload/items`,
        brands: `${api}/brands?all_brands=true`,
        colors: `${api}/colors`,
        conditions: `${api}/statuses`,
    };
}
