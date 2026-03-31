import { AVAILABLE_SHIPPING_CLASSES_QUERY, CREATE_LISTING_HASH, EDIT_LISTING_MUTATION, MERCARI_API, MERCARI_DOMAIN, MERCARI_INITIALIZE, MERCARI_UPLOAD_IMAGE, PRODUCT_QUERY, SMART_SALES_FEE_HASH, SMART_SALES_FEE_QUERY, UPLOAD_TEMP_LISTING_PHOTOS_HASH, USER_ITEMS_QUERY, } from "./constants.js";
import { Condition, Color } from "../../shared/enums.js";
export class MercariClient {
    csrfToken = "";
    accessToken = "";
    async ensureSession(force = false) {
        if (!force && this.csrfToken && this.accessToken) {
            return;
        }
        const response = await fetch(MERCARI_INITIALIZE, {
            method: "GET",
            credentials: "include",
        });
        const json = await response.json();
        this.csrfToken = json?.csrf ?? "";
        this.accessToken = json?.accessToken ?? "";
        if (!this.csrfToken || !this.accessToken) {
            throw new Error("Unable to initialize Mercari session.");
        }
    }
    get authHeaders() {
        return {
            Accept: "application/json",
            "content-type": "application/json",
            "x-csrf-token": this.csrfToken,
            authorization: `Bearer ${this.accessToken}`,
        };
    }
    async uploadImages(files) {
        await this.ensureSession();
        const form = new FormData();
        const operations = {
            operationName: "uploadTempListingPhotos",
            variables: { input: { photos: Array.from({ length: files.length }).map(() => null) } },
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: UPLOAD_TEMP_LISTING_PHOTOS_HASH,
                },
            },
        };
        form.append("operations", JSON.stringify(operations));
        const map = {};
        files.forEach((_, index) => {
            map[index + 1] = [`variables.input.photos.${index}`];
        });
        form.append("map", JSON.stringify(map));
        files.forEach((file, index) => {
            form.append(String(index + 1), file, "blob");
        });
        const response = await fetch(MERCARI_UPLOAD_IMAGE, {
            method: "POST",
            body: form,
            headers: {
                Accept: "*/*",
                "X-Csrf-Token": this.csrfToken,
                "X-App-Version": "1",
                Priority: "u=1,i",
                Authorization: `Bearer ${this.accessToken}`,
                "Apollo-Require-Preflight": "true",
                "X-Double-Web": "1",
                "X-Gql-migration": "1",
                "X-Platform": "web",
            },
            credentials: "include",
        });
        const json = await response.json();
        const uploadIds = json?.data?.uploadTempListingPhotos?.uploadIds;
        if (!uploadIds || !Array.isArray(uploadIds)) {
            throw new Error("Image upload failed for Mercari.");
        }
        return uploadIds;
    }
    async fetchCarriers(categoryId, weight, height, width, length) {
        await this.ensureSession();
        const packageSize = (length ?? 0) * (width ?? 0) * (height ?? 0);
        const response = await fetch(MERCARI_API, {
            method: "POST",
            headers: {
                ...this.authHeaders,
                accept: "*/*",
                "apollo-require-preflight": "true",
                "x-platform": "web",
            },
            credentials: "include",
            body: JSON.stringify({
                operationName: "availableShippingClassesV2",
                variables: {
                    input: {
                        categoryId: Number.isFinite(categoryId) ? categoryId : 0,
                        packageSize,
                        dimension: {
                            length: length ?? 0,
                            width: width ?? 0,
                            height: height ?? 0,
                        },
                        packageWeight: weight.inOunces ?? 0,
                    },
                },
                query: AVAILABLE_SHIPPING_CLASSES_QUERY,
            }),
        });
        if (!response.ok) {
            return null;
        }
        const json = await response.json();
        if (json.errors) {
            throw {
                success: false,
                message: json.errors?.[0]?.message ?? "Unable to fetch Mercari carriers.",
                internalErrors: JSON.stringify(json),
            };
        }
        return json.data;
    }
    async fetchSalesFee(payload) {
        await this.ensureSession();
        const response = await fetch(MERCARI_API, {
            method: "POST",
            headers: {
                ...this.authHeaders,
                accept: "*/*",
                "apollo-require-preflight": "true",
                "x-platform": "web",
            },
            credentials: "include",
            body: JSON.stringify({
                operationName: "smartSalesFeeQuery",
                variables: {
                    input: {
                        sellItem: {
                            photoIds: [],
                            price: payload.price,
                            categoryId: payload.categoryId,
                            conditionId: payload.conditionId,
                            zipCode: payload.zipCode,
                            shippingPayerId: payload.shippingPayerId,
                            shippingClassIds: payload.shippingClassIds,
                            isAutoPriceDrop: payload.isAutoPriceDrop,
                            minPriceForAutoPriceDrop: payload.minPriceForAutoPriceDrop,
                            isShippingSoyo: payload.isShippingSoyo,
                            shippingDeliveryType: payload.shippingDeliveryType,
                        },
                    },
                },
                extensions: {
                    persistedQuery: {
                        version: 1,
                        sha256Hash: SMART_SALES_FEE_HASH,
                    },
                },
                query: SMART_SALES_FEE_QUERY,
            }),
        });
        const json = await response.json();
        const fee = json?.data?.smartSalesFee?.fees?.[0]?.calculatedFee ??
            json?.data?.smartSalesFee?.fees?.[0]?.fee;
        if (typeof fee !== "number") {
            throw new Error("Unable to fetch Mercari sales fee.");
        }
        return fee;
    }
    async postListing(payload) {
        await this.ensureSession();
        const response = await fetch(MERCARI_API, {
            method: "POST",
            headers: this.authHeaders,
            credentials: "include",
            body: JSON.stringify({
                operationName: "createListing",
                variables: { input: payload },
                extensions: {
                    persistedQuery: {
                        version: 1,
                        sha256Hash: CREATE_LISTING_HASH,
                    },
                },
            }),
        });
        const json = await response.json();
        const listingId = json?.data?.createListing?.id;
        if (!listingId) {
            return this.handleMercariError(json);
        }
        return {
            success: true,
            product: {
                id: listingId,
                url: this.getProductUrl(listingId),
            },
        };
    }
    async updateListing(listingId, payload) {
        await this.ensureSession();
        const updateInput = {
            ...payload,
            id: listingId,
        };
        delete updateInput.suggestedShippingClassIds;
        const response = await fetch(MERCARI_API, {
            method: "POST",
            headers: this.authHeaders,
            credentials: "include",
            body: JSON.stringify({
                operationName: "editListing",
                variables: { input: updateInput },
                query: EDIT_LISTING_MUTATION,
            }),
        });
        const json = await response.json();
        const updatedId = json?.data?.editListing?.id;
        if (!updatedId) {
            return this.handleMercariError(json);
        }
        return {
            success: true,
            product: {
                id: updatedId,
                url: this.getProductUrl(updatedId),
            },
        };
    }
    handleMercariError(response) {
        const error = response?.errors?.[0];
        const exception = error?.extensions?.exception;
        if (exception?.code === "LISTING_SELLER_ACTION_REQUIRED_EXCEPTION" &&
            Array.isArray(exception?.meta?.actions)) {
            return {
                success: false,
                message: `Please validate your user data to activate your Mercari account: ${exception.meta.actions
                    .sort()
                    .join(", ")}`,
                internalErrors: JSON.stringify(response),
            };
        }
        if (typeof exception?.code === "string" &&
            exception.code.includes("VerificationException")) {
            const required = exception?.meta?.blocked_action?.required_verifications ?? [];
            return {
                success: false,
                message: `Please validate your user data to activate your Mercari account: ${required
                    .sort()
                    .join(", ")}`,
                internalErrors: JSON.stringify(response),
            };
        }
        return {
            success: false,
            message: error?.message ?? "An unexpected error occurred on Mercari.",
            internalErrors: JSON.stringify(response),
        };
    }
    async delistListing(id) {
        await this.ensureSession();
        const response = await fetch(MERCARI_API, {
            method: "POST",
            headers: this.authHeaders,
            credentials: "include",
            body: JSON.stringify({
                operationName: "UpdateItemStatusMutation",
                variables: { input: { id, status: "cancel" } },
                query: `mutation UpdateItemStatusMutation($input: UpdateItemStatusInput!) {
  updateItemStatus(input: $input) {
    status
    __typename
  }
}`,
            }),
        });
        const json = await response.json();
        if (response.status === 200 && !json.errors) {
            return { success: true };
        }
        return {
            success: false,
            message: "Mercari delist failed",
            internalErrors: JSON.stringify(json),
        };
    }
    async getListings(page, limit = 48, username) {
        await this.ensureSession();
        let userId = username;
        if (!userId) {
            const initialize = await fetch(MERCARI_INITIALIZE).then((res) => res.json());
            const user = initialize?.user;
            if (!user?.userId) {
                throw new Error("Please check you are logged in to your Mercari account.");
            }
            userId = user.userId;
        }
        const pageNumber = page ? parseInt(page, 10) : 1;
        const request = {
            keyword: "",
            page: pageNumber,
            sellerId: parseInt(userId ?? "0", 10),
            sortBy: "created",
            sortType: "desc",
            status: "on_sale",
        };
        const response = await fetch(MERCARI_API, {
            method: "POST",
            headers: {
                ...this.authHeaders,
                "apollo-require-preflight": "true",
            },
            credentials: "include",
            body: JSON.stringify({
                operationName: "userItemsQuery",
                variables: { input: request },
                query: USER_ITEMS_QUERY,
            }),
        });
        const json = await response.json();
        const items = json?.data?.userItems?.items ?? [];
        const products = items.map((item) => ({
            marketplaceId: item.id,
            title: item.name ?? null,
            price: item.price ? item.price / 100 : null,
            coverImage: item.photos?.[0]?.thumbnail ?? null,
            created: item.created ? new Date(item.created * 1000).toJSON() : null,
            marketplaceUrl: this.getProductUrl(item.id),
        }));
        const hasNext = json?.data?.userItems?.pagination?.hasNext;
        return {
            products,
            nextPage: hasNext ? (pageNumber + 1).toString() : null,
            username: userId,
        };
    }
    async getListing(id) {
        await this.ensureSession();
        const response = await fetch(MERCARI_API, {
            method: "POST",
            headers: {
                ...this.authHeaders,
                "apollo-require-preflight": "true",
            },
            credentials: "include",
            body: JSON.stringify({
                operationName: "productQuery",
                variables: { id },
                query: PRODUCT_QUERY,
            }),
        });
        const json = await response.json();
        const item = json?.data?.item;
        if (!item) {
            return null;
        }
        const condition = this.mapConditionIdToEnum(item.itemCondition?.id);
        const color1 = this.mapMercariIdToColor(item.colors?.[0]?.id);
        const color2 = this.mapMercariIdToColor(item.colors?.[1]?.id);
        const product = {
            id,
            marketPlaceId: id,
            title: item.name ?? "",
            description: item.description ?? "",
            category: [item.itemCategory?.id?.toString() ?? ""],
            brand: item.brand?.brandName ?? undefined,
            condition: condition ?? Condition.Good,
            size: item.itemSize?.id ? [item.itemSize.id.toString()] : undefined,
            price: item.price ? item.price / 100 : 0,
            originalPrice: item.originalPrice ? item.originalPrice / 100 : undefined,
            color: color1 ?? undefined,
            color2: color2 ?? undefined,
            images: Array.isArray(item.photos)
                ? item.photos.slice(1).map((photo) => photo.imageUrl)
                : [],
            tags: item.tags?.tags?.join(",") ?? "",
            availability: item.status === "not_for_sale" ? "NotForSale" : "ForSale",
            styleTags: item.tags?.tags ?? [],
            dynamicProperties: item.imei ? { IMEI: item.imei } : {},
            shipping: {
                shippingWeight: this.mapShippingClassToWeight(item.shippingClass?.shippingClassName),
            },
            marketplaceUrl: this.getProductUrl(id),
        };
        return product;
    }
    mapConditionIdToEnum(id) {
        switch (id) {
            case 1:
                return Condition.NewWithTags;
            case 2:
                return Condition.NewWithoutTags;
            case 3:
                return Condition.Good;
            case 4:
                return Condition.Fair;
            case 5:
                return Condition.Poor;
            default:
                return null;
        }
    }
    mapShippingClassToWeight(name) {
        if (!name)
            return undefined;
        const lookup = {
            "0.25 lb": 4,
            "0.5 lb": 8,
            "1 lb": 16,
            "2 lb": 32,
            "3 lb": 48,
            "4 lb": 64,
            "5 lb": 80,
        };
        const value = lookup[name];
        if (!value)
            return undefined;
        return { value, unit: "Ounces" };
    }
    mapMercariIdToColor(id) {
        switch (id) {
            case 1:
                return Color.Black;
            case 2:
                return Color.Gray;
            case 3:
                return Color.White;
            case 4:
                return Color.Cream;
            case 5:
                return Color.Red;
            case 6:
                return Color.Pink;
            case 7:
                return Color.Purple;
            case 8:
                return Color.Blue;
            case 9:
                return Color.Green;
            case 10:
                return Color.Yellow;
            case 11:
                return Color.Orange;
            case 12:
                return Color.Brown;
            case 13:
                return Color.Gold;
            case 14:
                return Color.Silver;
            default:
                return undefined;
        }
    }
    async checkLogin() {
        try {
            const init = await fetch(MERCARI_INITIALIZE).then((res) => res.json());
            return Boolean(init?.user?.userId);
        }
        catch {
            return false;
        }
    }
    getProductUrl(id) {
        return `${MERCARI_DOMAIN}/us/item/${id}`;
    }
}
