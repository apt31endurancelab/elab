import { createAdminClient } from "@/lib/supabase/admin"
import { adminFetch } from "./oauth"

type ShopifyOrderNode = {
  id: string
  name: string
  email: string | null
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  subtotalPriceSet: { shopMoney: { amount: string } }
  totalDiscountsSet: { shopMoney: { amount: string } }
  totalTaxSet: { shopMoney: { amount: string } }
  displayFinancialStatus: string | null
  displayFulfillmentStatus: string | null
  createdAt: string
  updatedAt: string
  customer: { firstName: string | null; lastName: string | null; email: string | null } | null
  discountCodes: string[]
  lineItems: { edges: { node: { title: string; quantity: number; variantTitle: string | null; originalUnitPriceSet: { shopMoney: { amount: string } } } }[] }
}

const ORDERS_QUERY = `
  query orders($cursor: String) {
    orders(first: 100, after: $cursor, sortKey: CREATED_AT, reverse: false) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          name
          email
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount } }
          totalDiscountsSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          displayFinancialStatus
          displayFulfillmentStatus
          createdAt
          updatedAt
          customer { firstName lastName email }
          discountCodes
          lineItems(first: 30) {
            edges { node { title quantity variantTitle originalUnitPriceSet { shopMoney { amount } } } }
          }
        }
      }
    }
  }
`

function mapOrder(connectionId: string, node: ShopifyOrderNode) {
  const fullName = node.customer
    ? `${node.customer.firstName ?? ""} ${node.customer.lastName ?? ""}`.trim()
    : null
  return {
    connection_id: connectionId,
    shopify_id: node.id,
    order_number: node.name,
    customer_email: node.customer?.email || node.email || null,
    customer_name: fullName || null,
    total_price: Number(node.totalPriceSet.shopMoney.amount) || 0,
    subtotal_price: Number(node.subtotalPriceSet.shopMoney.amount) || 0,
    total_discounts: Number(node.totalDiscountsSet.shopMoney.amount) || 0,
    total_tax: Number(node.totalTaxSet.shopMoney.amount) || 0,
    currency: node.totalPriceSet.shopMoney.currencyCode,
    financial_status: node.displayFinancialStatus,
    fulfillment_status: node.displayFulfillmentStatus,
    discount_codes: node.discountCodes,
    line_items: node.lineItems.edges.map(e => e.node),
    shopify_created_at: node.createdAt,
    shopify_updated_at: node.updatedAt,
    raw: node as unknown,
  }
}

export type SyncResult = { ordersSynced: number; pages: number; error?: string }

export async function syncShopifyOrders(connectionId: string, opts?: { trigger?: "install" | "manual" | "cron" | "webhook" }): Promise<SyncResult> {
  const supabase = createAdminClient()
  const { data: connection, error } = await supabase
    .from("shopify_connections")
    .select("id, shop_domain, access_token")
    .eq("id", connectionId)
    .single()

  if (error || !connection) {
    return { ordersSynced: 0, pages: 0, error: "Connection not found" }
  }

  const { data: run } = await supabase
    .from("shopify_sync_runs")
    .insert({ connection_id: connectionId, trigger: opts?.trigger || "manual", status: "running" })
    .select("id")
    .single()

  await supabase
    .from("shopify_connections")
    .update({ status: "syncing", status_message: null })
    .eq("id", connectionId)

  let cursor: string | null = null
  let total = 0
  let pages = 0
  try {
    while (true) {
      const data: { orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; edges: { node: ShopifyOrderNode }[] } } | null = await adminFetch<{
        orders: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
          edges: { node: ShopifyOrderNode }[]
        }
      }>(connection.shop_domain, connection.access_token, ORDERS_QUERY, { cursor })

      if (!data) throw new Error("Shopify API request failed")

      const rows = data.orders.edges.map(e => mapOrder(connection.id, e.node))
      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("shopify_orders")
          .upsert(rows, { onConflict: "connection_id,shopify_id" })
        if (upsertErr) throw new Error(upsertErr.message)
        total += rows.length
      }

      pages += 1
      if (!data.orders.pageInfo.hasNextPage) break
      cursor = data.orders.pageInfo.endCursor
      // Safety stop: don't run forever in a single request.
      if (pages >= 50) break
    }

    await supabase
      .from("shopify_connections")
      .update({ status: "connected", last_sync_at: new Date().toISOString(), last_sync_error: null })
      .eq("id", connectionId)

    if (run) {
      await supabase
        .from("shopify_sync_runs")
        .update({ status: "success", orders_synced: total, finished_at: new Date().toISOString() })
        .eq("id", run.id)
    }

    return { ordersSynced: total, pages }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    await supabase
      .from("shopify_connections")
      .update({ status: "error", status_message: message, last_sync_error: message })
      .eq("id", connectionId)
    if (run) {
      await supabase
        .from("shopify_sync_runs")
        .update({ status: "error", orders_synced: total, error: message, finished_at: new Date().toISOString() })
        .eq("id", run.id)
    }
    return { ordersSynced: total, pages, error: message }
  }
}

export async function upsertOrderFromWebhook(connectionId: string, body: unknown): Promise<void> {
  const supabase = createAdminClient()
  // The REST webhook payload uses different field names than the GraphQL query.
  // We store the raw body and best-effort fill the typed columns.
  type WebhookOrder = {
    id: number | string
    admin_graphql_api_id?: string
    name?: string
    email?: string
    total_price?: string | number
    subtotal_price?: string | number
    total_discounts?: string | number
    total_tax?: string | number
    currency?: string
    financial_status?: string | null
    fulfillment_status?: string | null
    customer?: { email?: string; first_name?: string; last_name?: string }
    discount_codes?: { code: string }[]
    line_items?: { title: string; quantity: number; variant_title?: string; price?: string; product_id?: number | string; variant_id?: number | string; sku?: string }[]
    created_at?: string
    updated_at?: string
  }
  const o = body as WebhookOrder
  const shopifyId = o.admin_graphql_api_id || `gid://shopify/Order/${o.id}`
  const fullName = o.customer ? `${o.customer.first_name ?? ""} ${o.customer.last_name ?? ""}`.trim() : null
  const { data: existing } = await supabase
    .from("shopify_orders")
    .select("id")
    .eq("connection_id", connectionId)
    .eq("shopify_id", shopifyId)
    .maybeSingle()
  const isNew = !existing

  await supabase
    .from("shopify_orders")
    .upsert({
      connection_id: connectionId,
      shopify_id: shopifyId,
      order_number: o.name,
      customer_email: o.customer?.email || o.email || null,
      customer_name: fullName || null,
      total_price: Number(o.total_price) || 0,
      subtotal_price: Number(o.subtotal_price) || 0,
      total_discounts: Number(o.total_discounts) || 0,
      total_tax: Number(o.total_tax) || 0,
      currency: o.currency,
      financial_status: o.financial_status,
      fulfillment_status: o.fulfillment_status,
      discount_codes: (o.discount_codes || []).map(d => d.code),
      line_items: o.line_items,
      shopify_created_at: o.created_at,
      shopify_updated_at: o.updated_at,
      raw: o as unknown,
    }, { onConflict: "connection_id,shopify_id" })

  // On a brand-new order, decrement local stock for each line item we recognize.
  // Match by SKU first, then by shopify_product_id. The trigger on stock_movements
  // does NOT auto-adjust products.stock for reason='shopify_order', so we update
  // products.stock atomically here and log the movement separately.
  if (isNew && o.line_items && o.line_items.length > 0) {
    for (const item of o.line_items) {
      if (!item.quantity || item.quantity <= 0) continue
      let productId: string | null = null

      if (item.sku) {
        const { data: bySku } = await supabase
          .from("products")
          .select("id, stock")
          .eq("sku", item.sku)
          .maybeSingle()
        if (bySku) productId = bySku.id
      }
      if (!productId && item.product_id) {
        const gid = `gid://shopify/Product/${item.product_id}`
        const { data: byShopify } = await supabase
          .from("products")
          .select("id, stock")
          .eq("shopify_product_id", gid)
          .maybeSingle()
        if (byShopify) productId = byShopify.id
      }
      if (!productId) continue

      const { data: prod } = await supabase
        .from("products")
        .select("stock")
        .eq("id", productId)
        .single()
      if (!prod) continue

      const newStock = Math.max(0, (prod.stock ?? 0) - item.quantity)
      await supabase.from("products").update({ stock: newStock, updated_at: new Date().toISOString() }).eq("id", productId)
      await supabase.from("stock_movements").insert({
        product_id: productId,
        change: -item.quantity,
        resulting_stock: newStock,
        reason: "shopify_order",
        reference_type: "shopify_order",
        notes: `${o.name || shopifyId} — ${item.title}`,
      })
    }
  }
}
