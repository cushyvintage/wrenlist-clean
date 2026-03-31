export const MERCARI_DOMAIN = "https://www.mercari.com";
export const MERCARI_API = `${MERCARI_DOMAIN}/v1/api`;
export const MERCARI_INITIALIZE = `${MERCARI_DOMAIN}/v1/initialize`;
export const MERCARI_UPLOAD_IMAGE = `${MERCARI_API}?dt=1`;

export const UPLOAD_TEMP_LISTING_PHOTOS_HASH =
  "9aa889ac01e549a01c66c7baabc968b0e4a7fa4cd0b6bd32b7599ce10ca09a10";
export const CREATE_LISTING_HASH =
  "265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0";
export const SMART_SALES_FEE_HASH =
  "d4ee60063d341014e36f33462b0fb62e54aee9174c09d02a2c00da815e7d00b7";

export const AVAILABLE_SHIPPING_CLASSES_QUERY = `
query availableShippingClassesV2($input: AvailableShippingClassesInput!) {
  availableShippingClassesV2(input: $input) {
    shippingClasses {
      id
      name
      minWeight
      maxWeight
      fee
      carrier
      displayOrder
      carrierDisplayName
      requestClassDisplayName
      requiresDimensions
      version
      etaForSeller
      retailRate
      packageSize
      handlingType
      __typename
    }
    dimensionalWeight {
      weight
      unit
      __typename
    }
    __typename
  }
}
`;

export const EDIT_LISTING_MUTATION = `
mutation editListing($input: EditListingInput!) {
  editListing(input: $input) {
    id
    seller {
      id
      numSellItems
      __typename
    }
    __typename
  }
}
`;

export const USER_ITEMS_QUERY = `
query userItemsQuery($input: UserItemsInput!) {
  userItems(input: $input) {
    items {
      id
      name
      price
      originalPrice
      status
      numLikes
      itemPv
      updated
      created
      pagerId
      subStatus
      itemType
      isAutoPriceDrop
      photos {
        thumbnail
        __typename
      }
      draftItemType
      draftItemStatus
      draftItemActionsRequired {
        field
        message
        __typename
      }
      __typename
    }
    pagination {
      limit
      currentPage
      totalCount
      hasNext
      __typename
    }
    __typename
  }
}
`;

export const PRODUCT_QUERY = `
query productQuery($id: String!) {
  item(id: $id) {
    itemId: id
    itemType
    status
    name
    price
    description
    itemCondition {
      id
      conditionName: name
      __typename
    }
    itemSize {
      id
      sizeName: name
      __typename
    }
    itemCategory {
      id
      __typename
    }
    brand {
      id
      brandId: id
      brandName: name
      __typename
    }
    shippingPayer {
      id
      name
      code
      __typename
    }
    shippingMethod {
      id
      shippingMethodName: name
      __typename
    }
    shippingFromArea {
      id
      shippingFromAreaName: name
      __typename
    }
    shippingClass {
      id
      shippingClassName: name
      fee
      __typename
    }
    shippingClasses {
      displayOrder
      fee
      id
      requestClassDisplayName
      __typename
    }
    updated
    created
    categoryTitle
    tags {
      itemId
      tags
      __typename
    }
    photos {
      imageUrl
      thumbnail
      __typename
    }
    originalPrice
    isOfferable
    isPresetOfferable
    shippingPackageDimension {
      length
      width
      height
      __typename
    }
    isShippingSoyo
    __typename
  }
}
`;

export const SMART_SALES_FEE_QUERY = `
query smartSalesFeeQuery($input: SalesFeeInput) {
  smartSalesFee(input: $input) {
    version
    minPrice
    maxPrice
    fees {
      message
      extraMessage
      calculatedFee
      faqId
      __typename
    }
    __typename
  }
}
`;





