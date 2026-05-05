// Push Endurance Lab products to Shopify (Admin GraphQL API).
// Uses productCreate/productUpdate + inventory APIs to keep them in sync.

import { adminFetch } from "./oauth"
import type { Product } from "@/lib/inventory"

type CreatedShopifyProduct = {
  id: string
  variants: { edges: { node: { id: string; inventoryItem: { id: string } } }[] }
}

const PRODUCT_CREATE_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        variants(first: 1) { edges { node { id inventoryItem { id } } } }
      }
      userErrors { field message }
    }
  }
`

const PRODUCT_UPDATE_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        variants(first: 1) { edges { node { id inventoryItem { id } } } }
      }
      userErrors { field message }
    }
  }
`

const VARIANT_UPDATE_MUTATION = `
  mutation productVariantUpdate($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      productVariant { id inventoryItem { id } }
      userErrors { field message }
    }
  }
`

const LOCATIONS_QUERY = `
  query locations {
    locations(first: 5, query: "status:active") {
      edges { node { id name isPrimary } }
    }
  }
`

const INVENTORY_SET_MUTATION = `
  mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
    inventorySetOnHandQuantities(input: $input) {
      inventoryAdjustmentGroup { reason }
      userErrors { field message }
    }
  }
`

export type SyncProductResult = {
  ok: boolean
  shopify_product_id?: string | null
  shopify_variant_id?: string | null
  shopify_inventory_item_id?: string | null
  error?: string
}

function buildProductInput(p: Product): Record<string, unknown> {
  return {
    title: p.name,
    descriptionHtml: p.description ? p.description.replace(/\n/g, "<br>") : undefined,
    productType: p.category || undefined,
    status: p.is_active ? "ACTIVE" : "DRAFT",
    variants: [
      {
        sku: p.sku || undefined,
        price: String(p.price),
        barcode: p.barcode || undefined,
        weight: p.weight ?? undefined,
        weightUnit: p.weight_unit
          ? p.weight_unit === "g" ? "GRAMS"
            : p.weight_unit === "lb" ? "POUNDS"
            : p.weight_unit === "oz" ? "OUNCES"
            : "KILOGRAMS"
          : undefined,
        inventoryManagement: "SHOPIFY",
      },
    ],
  }
}

async function getPrimaryLocationId(shop: string, token: string): Promise<string | null> {
  const data = await adminFetch<{ locations: { edges: { node: { id: string; isPrimary: boolean } }[] } }>(shop, token, LOCATIONS_QUERY)
  if (!data) return null
  const primary = data.locations.edges.find(e => e.node.isPrimary)?.node || data.locations.edges[0]?.node
  return primary?.id || null
}

export async function pushProductToShopify(shop: string, token: string, product: Product): Promise<SyncProductResult> {
  const baseInput = buildProductInput(product)
  let shopifyProductId = product.shopify_product_id
  let shopifyVariantId = product.shopify_variant_id
  let shopifyInventoryItemId = product.shopify_inventory_item_id

  if (shopifyProductId) {
    // UPDATE flow: product update + variant update
    const updateInput = { id: shopifyProductId, ...baseInput, variants: undefined } as Record<string, unknown>
    const updateRes = await adminFetch<{
      productUpdate: { product: CreatedShopifyProduct | null; userErrors: { field: string[]; message: string }[] }
    }>(shop, token, PRODUCT_UPDATE_MUTATION, { input: updateInput })

    if (!updateRes) return { ok: false, error: "productUpdate request failed" }
    if (updateRes.productUpdate.userErrors.length) {
      return { ok: false, error: updateRes.productUpdate.userErrors.map(e => e.message).join("; ") }
    }
    if (updateRes.productUpdate.product?.variants.edges[0]?.node) {
      shopifyVariantId = updateRes.productUpdate.product.variants.edges[0].node.id
      shopifyInventoryItemId = updateRes.productUpdate.product.variants.edges[0].node.inventoryItem.id
    }

    // Update variant price/sku/etc separately
    if (shopifyVariantId) {
      const variantInput: Record<string, unknown> = {
        id: shopifyVariantId,
        price: String(product.price),
        sku: product.sku || undefined,
        barcode: product.barcode || undefined,
        weight: product.weight ?? undefined,
      }
      const vRes = await adminFetch<{ productVariantUpdate: { userErrors: { message: string }[] } }>(shop, token, VARIANT_UPDATE_MUTATION, { input: variantInput })
      if (vRes?.productVariantUpdate.userErrors.length) {
        return { ok: false, error: vRes.productVariantUpdate.userErrors.map(e => e.message).join("; ") }
      }
    }
  } else {
    // CREATE flow
    const createRes = await adminFetch<{
      productCreate: { product: CreatedShopifyProduct | null; userErrors: { field: string[]; message: string }[] }
    }>(shop, token, PRODUCT_CREATE_MUTATION, { input: baseInput })

    if (!createRes) return { ok: false, error: "productCreate request failed" }
    if (createRes.productCreate.userErrors.length) {
      return { ok: false, error: createRes.productCreate.userErrors.map(e => e.message).join("; ") }
    }
    const created = createRes.productCreate.product
    if (!created) return { ok: false, error: "no product returned" }
    shopifyProductId = created.id
    shopifyVariantId = created.variants.edges[0]?.node.id
    shopifyInventoryItemId = created.variants.edges[0]?.node.inventoryItem.id
  }

  // Push stock to primary location
  if (shopifyInventoryItemId) {
    const locationId = await getPrimaryLocationId(shop, token)
    if (locationId) {
      await adminFetch(shop, token, INVENTORY_SET_MUTATION, {
        input: {
          reason: "correction",
          setQuantities: [{
            inventoryItemId: shopifyInventoryItemId,
            locationId,
            quantity: product.stock,
          }],
        },
      })
    }
  }

  return {
    ok: true,
    shopify_product_id: shopifyProductId,
    shopify_variant_id: shopifyVariantId,
    shopify_inventory_item_id: shopifyInventoryItemId,
  }
}

// Pull products + inventory levels from Shopify back into local products.
// Strategy: match by shopify_product_id first, fallback to SKU.
const PULL_PRODUCTS_QUERY = `
  query pullProducts($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          status
          totalInventory
          variants(first: 1) {
            edges { node { id sku price barcode inventoryItem { id } inventoryQuantity } }
          }
        }
      }
    }
  }
`

export type PulledProduct = {
  shopify_product_id: string
  shopify_variant_id: string | null
  shopify_inventory_item_id: string | null
  title: string
  sku: string | null
  price: number | null
  barcode: string | null
  inventory_quantity: number | null
}

export async function pullShopifyProducts(shop: string, token: string): Promise<PulledProduct[]> {
  const out: PulledProduct[] = []
  let cursor: string | null = null
  let pages = 0
  while (true) {
    const data: {
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
        edges: { node: {
          id: string; title: string; status: string; totalInventory: number;
          variants: { edges: { node: { id: string; sku: string | null; price: string; barcode: string | null; inventoryItem: { id: string }; inventoryQuantity: number } }[] }
        } }[]
      }
    } | null = await adminFetch(shop, token, PULL_PRODUCTS_QUERY, { cursor })
    if (!data) break
    for (const edge of data.products.edges) {
      const variant = edge.node.variants.edges[0]?.node
      out.push({
        shopify_product_id: edge.node.id,
        shopify_variant_id: variant?.id || null,
        shopify_inventory_item_id: variant?.inventoryItem.id || null,
        title: edge.node.title,
        sku: variant?.sku || null,
        price: variant?.price ? Number(variant.price) : null,
        barcode: variant?.barcode || null,
        inventory_quantity: variant?.inventoryQuantity ?? null,
      })
    }
    if (!data.products.pageInfo.hasNextPage) break
    cursor = data.products.pageInfo.endCursor
    pages += 1
    if (pages >= 50) break
  }
  return out
}
