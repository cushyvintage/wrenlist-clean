export const POSHMARK_PM_VERSION = "2025.8.1";
export const POSHMARK_APP_VERSION = "2.55";
export function getPoshmarkDomain(tld) {
    return tld ? `https://poshmark.${tld}` : "https://poshmark.com";
}
export function getPoshmarkCreateListingUrl(tld) {
    return `${getPoshmarkDomain(tld)}/create-listing`;
}
export function getPoshmarkBrandSearchUrl(tld) {
    return `${getPoshmarkDomain(tld)}/vm-rest/searches/brands/suggested`;
}
export function getPoshmarkPostsUrl(tld, userId) {
    return `${getPoshmarkDomain(tld)}/vm-rest/users/${userId}/posts`;
}
export function getPoshmarkMetaCatalogUrl(tld) {
    return `${getPoshmarkDomain(tld)}/vm-rest/meta/catalog_v2`;
}
