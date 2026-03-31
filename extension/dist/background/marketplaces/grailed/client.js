import { checkAlreadyExecuted, getLoggingInfo, log, } from "../../shared/crosslistApi.js";
import { Color, Condition, isColor } from "../../shared/enums.js";
import { countries } from "../../data/index.js";
const GRAILED_MEDIA_UPLOAD_URL = "https://grailed-media.s3.amazonaws.com/";
const GRAILED_MEDIA_PRESIGN_ENDPOINT = "https://www.grailed.com/api/photos/presign/listing";
const GRAILED_BASE_URL = "https://www.grailed.com";
const GRAILED_ME_ENDPOINT = `${GRAILED_BASE_URL}/api/users/me`;
const GRAILED_LISTINGS_ENDPOINT = `${GRAILED_BASE_URL}/api/listings`;
const GRAILED_ADDRESSES_ENDPOINT = `${GRAILED_BASE_URL}/api/users/[USER_ID]/postal_addresses`;
const GRAILED_BRAND_SEARCH_ENDPOINT = "https://mnrwefss2q-dsn.algolia.net/1/indexes/Designer_production/query?x-algolia-agent=Algolia%20for%20JavaScript%20(3.35.1)%3B%20Browser&x-algolia-application-id=MNRWEFSS2Q&x-algolia-api-key=bc9ee1c014521ccf312525a4ef324a16";
export class GrailedClient {
    tld;
    constructor(tld) {
        this.tld = tld;
    }
    async getPostalAddressForAuthenticatedUser() {
        const csrfToken = await this.getCSRFToken();
        if (!csrfToken) {
            throw new Error("CSRF cookie not present");
        }
        const profile = await fetch(GRAILED_ME_ENDPOINT).then((res) => res.json());
        const userId = profile?.data?.id;
        if (!userId) {
            throw new Error("Unable to resolve Grailed user id");
        }
        const addresses = await fetch(GRAILED_ADDRESSES_ENDPOINT.replace("[USER_ID]", userId.toString()), {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-amplitude-id": "1664652228743",
                "x-api-version": "application/grailed.api.v1",
                "x-csrf-token": csrfToken,
            },
            credentials: "include",
        }).then((res) => res.json());
        return addresses;
    }
    async getCSRFToken() {
        await fetch(GRAILED_ME_ENDPOINT);
        const cookie = await chrome.cookies.get({
            url: GRAILED_BASE_URL,
            name: "csrf_token",
        });
        return cookie ? decodeURIComponent(cookie.value) : null;
    }
    async storeCategories() {
        try {
            await checkAlreadyExecuted("categoryLastLoggedGrailed", async () => {
                const info = (await getLoggingInfo("Category", "grailed"));
                if (!info?.isLogged) {
                    const categories = await fetch(`${GRAILED_BASE_URL}/api/config/categories`).then((res) => res.json());
                    await log("Category", JSON.stringify(categories), null, "grailed");
                }
            });
        }
        catch (error) {
            console.error("[Grailed] storeCategories failed", error);
        }
    }
    async uploadImage(file) {
        const presignResponse = await fetch(GRAILED_MEDIA_PRESIGN_ENDPOINT, {
            credentials: "include",
        }).then((res) => res.json());
        const form = new FormData();
        Object.entries(presignResponse.data.fields).forEach(([key, value]) => {
            form.append(key, value);
        });
        form.append("Content-Type", "image/jpeg");
        form.append("file", file, file.name);
        await fetch(GRAILED_MEDIA_UPLOAD_URL, {
            method: "POST",
            body: form,
            credentials: "include",
            headers: {
                accept: "*/*",
                "cache-control": "no-cache",
                pragma: "no-cache",
            },
            referrer: "https://www.grailed.com",
            referrerPolicy: "strict-origin-when-cross-origin",
            mode: "cors",
        });
        return presignResponse.data.image_url;
    }
    async getBrand(department, query) {
        const response = await fetch(GRAILED_BRAND_SEARCH_ENDPOINT, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: JSON.stringify({
                params: `query=${encodeURIComponent(query)}&page=0&hitsPerPage=1&filters=departments%3A${department}&facetFilters=%5B%22marketplace%3Agrailed%22%5D`,
            }),
        }).then((res) => res.json());
        if (!response.nbHits || !response.hits?.length) {
            return null;
        }
        return response.hits[0];
    }
    async postListing(payload) {
        await this.storeCategories();
        const csrfToken = await this.getCSRFToken();
        if (!csrfToken) {
            return { success: false, message: "CSRF cookie not present" };
        }
        const response = await fetch(GRAILED_LISTINGS_ENDPOINT, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-amplitude-id": "1649357526146",
                "x-api-version": "application/grailed.api.v1",
                "x-csrf-token": csrfToken,
            },
            body: JSON.stringify(payload),
            credentials: "include",
        });
        if (response.status !== 200) {
            const text = await response.text();
            try {
                const parsed = JSON.parse(text);
                return {
                    success: false,
                    message: parsed?.error?.message ?? "An unexpected error occurred",
                    internalErrors: JSON.stringify(parsed),
                };
            }
            catch {
                return {
                    success: false,
                    message: "An unexpected error occurred",
                    internalErrors: text,
                };
            }
        }
        const data = (await response.json());
        return {
            success: true,
            product: {
                id: data.data.id.toString(),
                url: `${GRAILED_BASE_URL}${data.data.pretty_path}`,
            },
        };
    }
    async updateListing(marketplaceId, payload) {
        const csrfToken = await this.getCSRFToken();
        if (!csrfToken) {
            return { success: false, message: "CSRF cookie not present" };
        }
        const response = await fetch(`${GRAILED_LISTINGS_ENDPOINT}/${marketplaceId}`, {
            method: "PUT",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-amplitude-id": "1649357526146",
                "x-csrf-token": csrfToken,
            },
            body: JSON.stringify(payload),
            credentials: "include",
        });
        if (response.status !== 200) {
            const text = await response.text();
            try {
                const parsed = JSON.parse(text);
                return {
                    success: false,
                    message: parsed?.error?.message ?? "An unexpected error occurred",
                    internalErrors: text,
                };
            }
            catch {
                return {
                    success: false,
                    message: "An unexpected error occurred",
                    internalErrors: text,
                };
            }
        }
        const data = (await response.json());
        return {
            success: true,
            product: {
                id: data.data.id.toString(),
                url: `${GRAILED_BASE_URL}${data.data.pretty_path}`,
            },
        };
    }
    async delistListing(id) {
        const csrfToken = await this.getCSRFToken();
        if (!csrfToken) {
            return {
                success: false,
                message: "CSRF Cookie not found",
                internalErrors: "CSRF Cookie not found",
            };
        }
        const response = await fetch(`${GRAILED_LISTINGS_ENDPOINT}/${id}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-amplitude-id": "1649357526146",
                "x-api-version": "application/grailed.api.v1",
                "x-csrf-token": csrfToken,
            },
            credentials: "include",
        });
        if (response.status !== 200) {
            const errorBody = await response.json();
            return {
                success: false,
                message: errorBody.message,
                internalErrors: JSON.stringify(errorBody),
            };
        }
        return { success: true };
    }
    async getListings(page, perPage = 99, username) {
        const pageNumber = page ? parseInt(page, 10) : 1;
        let userId = username;
        if (!userId) {
            const profile = await fetch(GRAILED_ME_ENDPOINT);
            if (profile.status !== 200) {
                throw new Error("Please check you are logged in to your marketplace account.");
            }
            const json = await profile.json();
            userId = json.data.id;
        }
        const wardrobe = await fetch(`${GRAILED_BASE_URL}/api/users/${userId}/wardrobe?page=${pageNumber}&limit=${perPage}`).then((res) => res.json());
        const products = wardrobe.data.map((entry) => ({
            marketplaceId: entry.id.toString(),
            title: entry.title,
            price: entry.price,
            coverImage: entry.cover_photo
                ? `${entry.cover_photo.url}?fm=webp&h=245&w=245`
                : "",
            created: entry.created_at,
            marketplaceUrl: this.getProductUrl(entry.id),
        }));
        return {
            products,
            nextPage: wardrobe.metadata.is_last_page
                ? null
                : (pageNumber + 1).toString(),
            username: userId,
        };
    }
    async getListing(id) {
        const response = await fetch(`${GRAILED_LISTINGS_ENDPOINT}/${id}`);
        if (response.status !== 200) {
            return null;
        }
        const data = (await response.json()).data;
        const mapCondition = (condition) => {
            switch (condition) {
                case "is_new":
                    return Condition.NewWithTags;
                case "is_gently_used":
                    return Condition.Good;
                case "is_used":
                    return Condition.Fair;
                case "is_worn":
                    return Condition.Poor;
                default:
                    return null;
            }
        };
        const colorTrait = data?.traits?.find((trait) => trait.name === "color")?.value ?? null;
        const normalizedColor = colorTrait === "grey"
            ? Color.Gray
            : colorTrait
                ? `${colorTrait.charAt(0).toUpperCase()}${colorTrait
                    .slice(1)
                    .toLowerCase()}`
                : null;
        const color = normalizedColor && isColor(normalizedColor) ? normalizedColor : null;
        const listing = {
            id,
            marketPlaceId: id,
            title: data?.title ?? null,
            description: data?.description ?? null,
            category: data?.category_path ? [data.category_path] : [],
            condition: mapCondition(data?.condition ?? "") ?? Condition.Good,
            brand: data?.designer?.name ?? null,
            size: data?.category_path?.startsWith("womens_")
                ? [data?.exact_size]
                : [data?.size],
            color,
            tags: data?.hashtags ?? [],
            price: data?.price ?? null,
            acceptOffers: data?.make_offer ?? false,
            smartPricing: false,
            smartPricingPrice: null,
            images: data?.photos?.map((photo) => photo.url),
            shipping: {},
            dynamicProperties: {},
            marketplaceUrl: this.getProductUrl(id),
            cover: data?.photos?.[0]?.url ?? null,
            coverSmall: data?.photos?.[0]?.url ?? null,
        };
        const origin = data?.traits?.find((trait) => trait.name === "country_of_origin")
            ?.value ?? null;
        if (origin) {
            const country = countries.find(({ value }) => value === origin);
            if (country?.label) {
                listing.dynamicProperties["Country of Origin"] = country.label;
            }
        }
        return listing;
    }
    async checkLogin() {
        const cookie = await chrome.cookies.get({
            url: "https://www.grailed.com",
            name: "grailed_jwt",
        });
        return !!cookie;
    }
    getProductUrl(id) {
        return `https://www.grailed.com/listings/${id}`;
    }
}
