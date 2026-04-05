export const SHOPIFY_UPLOAD_IMAGE_URL =
  "https://shopify-staged-uploads.storage.googleapis.com/";

export const getShopifyAdminDomain = (shopId: string): string =>
  `https://admin.shopify.com/store/${shopId}`;

export const getShopifyGraphqlUrl = (shopId: string): string =>
  `https://admin.shopify.com/api/shopify/${shopId}/internal/web/graphql/core`;

export const UPLOAD_MEDIA_MUTATION = `
  mutation UploadMedia($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct($product: ProductInput!, $media: [CreateMediaInput!]) {
    productCreate(input: $product, media: $media) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_SAVE_UPDATE_MUTATION = `
  mutation ProductSaveUpdate($product: ProductInput!) {
    productUpdate(input: $product) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_PRODUCT_MUTATION = `
  mutation UpdateProduct($product: ProductInput!) {
    productUpdate(input: $product) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_INDEX_QUERY = `
  query ProductIndex($cursor: String) {
    products(first: 50, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          id
          title
          status
          createdAt
          featuredImage {
            transformedSrc
          }
          priceRangeV2 {
            maxVariantPrice {
              amount
            }
          }
        }
      }
    }
  }
`;

export const ADMIN_PRODUCT_DETAILS_QUERY = `
  query AdminProductDetails($productId: ID!, $variantsLimit: Int = 50) {
    product(id: $productId) {
      id
      title
      descriptionHtml
      tags
      vendor
      category {
        id
      }
      featuredImage {
        transformedSrc
      }
      images(first: 20) {
        edges {
          node {
            src: url
          }
        }
      }
      variants(first: $variantsLimit) {
        edges {
          node {
            id
            sku
            price
            weight
            weightUnit
            selectedOptions {
              name
              value
            }
            inventoryQuantity
          }
        }
      }
    }
  }
`;

export const GET_LOCATION_QUERY = `
  query ShopifyLocations($locationsFirst: Int!) {
    merchantLocations: locations(first: $locationsFirst) {
      edges {
        node {
          id
          isActive
          name
        }
      }
    }
  }
`;

export const GET_METAFIELD_DEFINITIONS_QUERY = `
  query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!, $namespace: String!) {
    metafieldDefinitions(ownerType: $ownerType, namespace: $namespace, first: 250) {
      edges {
        node {
          key
          namespace
        }
      }
    }
  }
`;

export const CREATE_METAFIELD_DEFINITION_MUTATION = `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        name
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const COLLECTIONS_LIST_QUERY = `
  query CollectionList($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`;

export const COLLECTION_CREATE_MUTATION = `
  mutation CollectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;





