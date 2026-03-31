export const FACEBOOK_BASE_URL = "https://www.facebook.com";
export const FACEBOOK_CREATE_URL = `${FACEBOOK_BASE_URL}/marketplace/create`;
export const FACEBOOK_CATEGORY_PAGE_URL = `${FACEBOOK_CREATE_URL}/item`;
export const FACEBOOK_SELLING_URL = `${FACEBOOK_BASE_URL}/marketplace/you/selling`;
export const FACEBOOK_IMAGE_UPLOAD_URL = "https://upload.facebook.com/ajax/react_composer/attachments/photo/upload";
export const FACEBOOK_GRAPHQL_URL = `${FACEBOOK_BASE_URL}/api/graphql/`;
export const FACEBOOK_DOC_IDS = {
    createListing: "5033081016747999",
    editListing: "9611035835616537",
    shippingOptions: "7147451128659659",
    deleteListing: "5875847535792786",
    sellingFeed: "4987728437942946",
    composerQuery: "8597158863734190",
};
export const FACEBOOK_SELLING_QUERY_NAME = "CometMarketplaceYouSellingFastContentContainerQuery";
export const FACEBOOK_CREATE_MUTATION_NAME = "useCometMarketplaceListingCreateMutation";
export const FACEBOOK_EDIT_MUTATION_NAME = "useCometMarketplaceListingEditMutation";
export const FACEBOOK_DELETE_MUTATION_NAME = "useCometMarketplaceListingDeleteMutation";
export const FACEBOOK_CATEGORY_CACHE_KEY = "categoryLastLoggedFacebook";
