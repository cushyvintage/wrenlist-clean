export const WHATNOT_DOMAIN = "https://www.whatnot.com";
export const WHATNOT_GRAPHQL_API = `${WHATNOT_DOMAIN}/services/graphql/`;

export const GENERATE_MEDIA_UPLOAD_URLS_MUTATION = `
mutation GenerateMediaUploadUrls($media: [GenerateMediaUploadInput!]!) {
  generateMediaUploadURLs(media: $media) {
    uploads {
      id
      method
      url
      headers {
        name
        value
        __typename
      }
      targetKey
      expiresAt
      error
      __typename
    }
    error
    __typename
  }
}
`;

export const ADD_LISTING_PHOTO_MUTATION = `
mutation AddListingPhoto($uuid: String, $label: String!, $uploadKey: String!) {
  addListingPhoto(uuid: $uuid, label: $label, uploadKey: $uploadKey) {
    image {
      id
      url
      key
      bucket
      __typename
    }
    success
    message
    __typename
  }
}
`;

export const CREATE_LISTING_MUTATION = `
mutation CreateListing($uuid: ID!, $title: String!, $description: String, $transactionType: ListingTransactionType!, $transactionProps: TransactionPropsInput, $price: MoneyInput, $catalogProductId: String, $productId: ID, $salesChannels: [SalesChannelInfoInput], $productAttributeValues: [ProductAttributeValueInput], $quantity: Int, $images: [ListingImageInput], $listIndividually: Boolean, $categoryId: ID, $shippingProfileId: ID, $weight: WeightInput, $hazmatType: HazmatLabelType, $isPartialSave: Boolean, $reservedForSalesChannel: ReservedForSalesChannelType, $sku: String, $costPerItem: MoneyInput, $barcode: String, $variants: [ListingVariantInput!], $timedListingEvent: TimedListingEventInput, $metadata: ListingMetadata) {
  createListing(
    uuid: $uuid
    title: $title
    description: $description
    transactionType: $transactionType
    transactionProps: $transactionProps
    price: $price
    catalogProductId: $catalogProductId
    productId: $productId
    salesChannels: $salesChannels
    productAttributeValues: $productAttributeValues
    quantity: $quantity
    images: $images
    listIndividually: $listIndividually
    categoryId: $categoryId
    shippingProfileId: $shippingProfileId
    weight: $weight
    hazmatType: $hazmatType
    isPartialSave: $isPartialSave
    reservedForSalesChannel: $reservedForSalesChannel
    sku: $sku
    costPerItem: $costPerItem
    barcode: $barcode
    variants: $variants
    timedListingEvent: $timedListingEvent
    metadata: $metadata
  ) {
    listingNode {
      id
      __typename
    }
    error
    __typename
  }
}
`;

export const UPDATE_LISTING_MUTATION = `
mutation UpdateListing($input: ListingInput!) {
  updateListing2(input: $input) {
    listingNode {
      id
      __typename
    }
    error
    __typename
  }
}
`;

export const GET_SHIPPING_PROFILES_QUERY = `
query GetShippingProfiles($categoryId: ID) {
  shippingProfiles(categoryId: $categoryId) {
    id
    name
    weightAmount
    weightScale
    __typename
  }
}
`;

export const GET_PRODUCT_ATTRIBUTES_QUERY = `
query GetProductAttributes($categoryId: ID!) {
  getProductAttributes(categoryId: $categoryId) {
    id
    key
    label
    valueType
    isRequired
    displayRules
    validationRules
    __typename
  }
}
`;

export const GET_MY_LIVESTREAMS_QUERY = `
query SellerHubGetMyLivestreams($status: [LiveStreamStatus!] = [CREATED, PLAYING, STOPPED, ENDED, CANCELLED]) {
  myLiveStreams(status: $status) {
    id
    title
    __typename
  }
}
`;

export const SELLER_HUB_INVENTORY_QUERY = `
query SellerHubInventory($first: Int, $after: String, $statuses: [ListingStatus]) {
  me {
    id
    inventory(first: $first, after: $after, statuses: $statuses, sort: { direction: "DESC", field: CREATION_TIME }) {
      edges {
        node {
          id
          title
          createdAt
          price {
            amount
          }
          images {
            url
          }
          __typename
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`;

export const SELLER_BULK_LISTING_ACTION_MUTATION = `
mutation SellerBulkListingAction($ids: [ID!]!, $action: String!, $arguments: JSONString) {
  sellerBulkListingAction(ids: $ids, action: $action, arguments: $arguments) {
    listing {
      id
    }
    listingNode {
      id
    }
    error
  }
}
`;

export const SELLER_HUB_INVENTORY_EDIT_QUERY = `
query SellerHubInventoryEdit($listingId: ID!, $includeListing: Boolean!) {
  categories: categoryBrowse {
    id
    name
  }
  getListing(listingId: $listingId) @include(if: $includeListing) {
    id
    title
    description
    sku
    quantity
    price {
      amount
    }
    transactionType
    productAttributeValues {
      attribute {
        key
      }
      value
    }
    images {
      url
    }
    product {
      category {
        id
      }
      shippingProfile {
        id
      }
    }
  }
}
`;

export const CURRENT_USER_QUERY = `
query CurrentUser {
  currentUser: me {
    id
    username
  }
}
`;





