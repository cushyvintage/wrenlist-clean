/**
 * Shopify API Integration
 * Wrapper for Shopify storefront product management
 *
 * API Docs: https://shopify.dev/api
 * Uses Admin API for product management
 * Base URL: https://{shop}.myshopify.com/admin/api/2024-01
 *
 * Fee Structure: 2.9% + $0.30 payment processing fee per transaction
 */

import { ApiResponse } from '@/lib/api-response'

export interface ShopifyProductInput {
  title: string
  description: string
  price: number
  compareAtPrice?: number
  collection?: string
  tags?: string[]
  images?: string[]
}

export interface ShopifyProductResponse {
  id: string
  url: string
  status: string
  price: number
  views: number
  likes: number
}

export interface ShopifyErrorResponse {
  errors?: Record<string, string | string[]>
  message?: string
}

class ShopifyService {
  private shopUrl: string
  private accessToken: string
  private apiVersion = '2024-01'

  constructor(shopUrl: string, accessToken: string) {
    this.shopUrl = shopUrl
    this.accessToken = accessToken
  }

  /**
   * Authenticate with Shopify API
   * Validates store access and token
   */
  async authenticate(): Promise<void> {
    try {
      const response = await fetch(
        `${this.shopUrl}/admin/api/${this.apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: `{
              shop {
                name
              }
            }`,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }
    } catch (error) {
      throw new Error(
        `Shopify authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get shop info
   */
  async getShopInfo(): Promise<ApiResponse<{ name: string; collections: Array<{ id: string; title: string }> }>> {
    try {
      const response = await fetch(
        `${this.shopUrl}/admin/api/${this.apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: `{
              shop {
                name
              }
              collections(first: 10) {
                edges {
                  node {
                    id
                    title
                  }
                }
              }
            }`,
          }),
        }
      )

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to fetch shop info',
        }
      }

      const data = (await response.json()) as {
        data?: {
          shop?: { name: string }
          collections?: {
            edges?: Array<{
              node?: { id: string; title: string }
            }>
          }
        }
        errors?: Array<{ message: string }>
      }

      if (data.errors && data.errors.length > 0) {
        return {
          status: 400,
          error: data.errors[0]?.message || 'Unknown error',
        }
      }

      const collections =
        data.data?.collections?.edges?.map((edge) => ({
          id: edge.node?.id || '',
          title: edge.node?.title || '',
        })) || []

      return {
        status: 200,
        data: {
          name: data.data?.shop?.name || '',
          collections,
        },
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a product on Shopify
   */
  async createProduct(input: ShopifyProductInput): Promise<ApiResponse<ShopifyProductResponse>> {
    try {
      const response = await fetch(
        `${this.shopUrl}/admin/api/${this.apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: `mutation createProduct($input: ProductInput!) {
              productCreate(input: $input) {
                product {
                  id
                  title
                  handle
                  status
                  variants(first: 1) {
                    edges {
                      node {
                        id
                        price
                      }
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
            variables: {
              input: {
                title: input.title,
                bodyHtml: input.description,
                productType: 'Vintage',
                tags: input.tags || [],
                vendor: 'CushyVintage',
                variants: [
                  {
                    price: input.price.toString(),
                    compareAtPrice: input.compareAtPrice?.toString(),
                  },
                ],
              },
            },
          }),
        }
      )

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to create product',
        }
      }

      const data = (await response.json()) as {
        data?: {
          productCreate?: {
            product?: {
              id: string
              title: string
              handle: string
              status: string
              variants?: {
                edges?: Array<{ node?: { id: string; price: string } }>
              }
            }
            userErrors?: Array<{ message: string }>
          }
        }
      }

      if (data.data?.productCreate?.userErrors?.length) {
        const errors = data.data.productCreate.userErrors.map((e) => e.message).join(', ')
        return {
          status: 400,
          error: errors,
        }
      }

      const product = data.data?.productCreate?.product

      if (!product) {
        return {
          status: 400,
          error: 'No product returned',
        }
      }

      const variantPrice = product.variants?.edges?.[0]?.node?.price || '0'

      return {
        status: 201,
        data: {
          id: product.id,
          url: `${this.shopUrl}/products/${product.handle}`,
          status: product.status,
          price: parseFloat(variantPrice),
          views: 0,
          likes: 0,
        },
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update an existing Shopify product
   */
  async updateProduct(
    productId: string,
    updates: Partial<ShopifyProductInput>
  ): Promise<ApiResponse<ShopifyProductResponse>> {
    try {
      const response = await fetch(
        `${this.shopUrl}/admin/api/${this.apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: `mutation updateProduct($input: ProductInput!) {
              productUpdate(input: $input) {
                product {
                  id
                  title
                  handle
                  status
                  variants(first: 1) {
                    edges {
                      node {
                        price
                      }
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
            variables: {
              input: {
                id: productId,
                ...(updates.title && { title: updates.title }),
                ...(updates.description && { bodyHtml: updates.description }),
                ...(updates.tags && { tags: updates.tags }),
              },
            },
          }),
        }
      )

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to update product',
        }
      }

      const data = (await response.json()) as {
        data?: {
          productUpdate?: {
            product?: {
              id: string
              title: string
              handle: string
              status: string
              variants?: {
                edges?: Array<{ node?: { price: string } }>
              }
            }
            userErrors?: Array<{ message: string }>
          }
        }
      }

      if (data.data?.productUpdate?.userErrors?.length) {
        const errors = data.data.productUpdate.userErrors.map((e) => e.message).join(', ')
        return {
          status: 400,
          error: errors,
        }
      }

      const product = data.data?.productUpdate?.product

      return {
        status: 200,
        data: {
          id: product?.id || productId,
          url: `${this.shopUrl}/products/${product?.handle || 'product'}`,
          status: product?.status || 'active',
          price: updates.price || 0,
          views: 0,
          likes: 0,
        },
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete a product from Shopify
   */
  async deleteProduct(productId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(
        `${this.shopUrl}/admin/api/${this.apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: `mutation deleteProduct($input: ProductDeleteInput!) {
              productDelete(input: $input) {
                deletedProductId
                userErrors {
                  field
                  message
                }
              }
            }`,
            variables: {
              input: {
                id: productId,
              },
            },
          }),
        }
      )

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to delete product',
        }
      }

      const data = (await response.json()) as {
        data?: {
          productDelete?: {
            userErrors?: Array<{ message: string }>
          }
        }
      }

      if (data.data?.productDelete?.userErrors?.length) {
        const errors = data.data.productDelete.userErrors.map((e) => e.message).join(', ')
        return {
          status: 400,
          error: errors,
        }
      }

      return {
        status: 204,
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get product details
   */
  async getProduct(productId: string): Promise<ApiResponse<ShopifyProductResponse>> {
    try {
      const response = await fetch(
        `${this.shopUrl}/admin/api/${this.apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: `{
              product(id: "${productId}") {
                id
                title
                handle
                status
                variants(first: 1) {
                  edges {
                    node {
                      price
                    }
                  }
                }
              }
            }`,
          }),
        }
      )

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to fetch product',
        }
      }

      const data = (await response.json()) as {
        data?: {
          product?: {
            id: string
            title: string
            handle: string
            status: string
            variants?: {
              edges?: Array<{ node?: { price: string } }>
            }
          }
        }
      }

      const product = data.data?.product

      if (!product) {
        return {
          status: 404,
          error: 'Product not found',
        }
      }

      const variantPrice = product.variants?.edges?.[0]?.node?.price || '0'

      return {
        status: 200,
        data: {
          id: product.id,
          url: `${this.shopUrl}/products/${product.handle}`,
          status: product.status,
          price: parseFloat(variantPrice),
          views: 0,
          likes: 0,
        },
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get request headers with OAuth token
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': this.accessToken,
      'User-Agent': 'Wrenlist/1.0',
    }
  }
}

export default ShopifyService
