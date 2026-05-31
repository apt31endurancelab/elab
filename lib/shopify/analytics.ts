import { shopifyAdminFetch } from "@/lib/shopify"

// Comprehensive, real-data analytics derived from the Shopify Admin API (2025-10).
// Everything here is computed from live orders / customers / products / inventory.
// The conversion funnel and traffic-source sections are intentionally NOT here:
// Shopify's Admin API does not expose sessions/traffic, that needs GA4 / ShopifyQL.

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "0"))
  return Number.isFinite(n) ? n : 0
}
const money = (set?: { shopMoney?: { amount?: string } } | null) => num(set?.shopMoney?.amount)

// ---- Raw API shapes ----------------------------------------------------------
type OrderNode = {
  id: string
  name: string
  createdAt: string
  cancelledAt: string | null
  sourceName: string | null
  tags: string[]
  displayFinancialStatus: string | null
  displayFulfillmentStatus: string | null
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  currentSubtotalPriceSet: { shopMoney: { amount: string } }
  totalShippingPriceSet: { shopMoney: { amount: string } }
  currentTotalTaxSet: { shopMoney: { amount: string } }
  currentTotalDiscountsSet: { shopMoney: { amount: string } }
  totalRefundedSet: { shopMoney: { amount: string } }
  paymentGatewayNames: string[]
  customer: { id: string } | null
  lineItems: { edges: Array<{ node: {
    quantity: number
    title: string
    sku: string | null
    originalTotalSet: { shopMoney: { amount: string } }
    discountedTotalSet: { shopMoney: { amount: string } }
    product: { id: string; title: string; vendor: string | null; productType: string | null } | null
  } }> }
}

type CustomerNode = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  note: string | null
  tags: string[]
  numberOfOrders: string
  createdAt: string
  amountSpent: { amount: string; currencyCode: string }
  defaultAddress: { city: string | null; country: string | null } | null
  emailMarketingConsent: { marketingState: string } | null
  lastOrder: { createdAt: string } | null
}

type ProductNode = {
  id: string
  title: string
  status: string
  totalInventory: number
  vendor: string | null
  productType: string | null
  variants: { edges: Array<{ node: { sku: string | null; inventoryQuantity: number | null; price: string } }> }
}

// ---- Output shape ------------------------------------------------------------
export type StoreAnalytics = {
  connected: boolean
  currency: string
  shopName: string | null
  windowOrders: number
  range: { label: string } | null
  sales: {
    grossSales: number; netSales: number; totalSales: number; returns: number
    discounts: number; shipping: number; taxes: number; aov: number
    ordersCount: number; itemsSold: number; revenuePerCustomer: number
  }
  salesTrend: Array<{ month: string; gross: number; net: number }>
  orders: Array<{
    id: string; name: string; createdAt: string; customer: string; total: number
    financialStatus: string; fulfillmentStatus: string; source: string; itemsCount: number
  }>
  customers: {
    total: number; newCount: number; returningCount: number; repeatPurchaseRate: number
    avgClv: number; subscribedRate: number
    list: Array<{
      id: string; name: string; firstName: string; lastName: string; email: string; phone: string
      note: string; ordersCount: number; totalSpent: number
      aov: number; location: string; marketing: boolean; lastOrderAt: string | null; tags: string[]
    }>
  }
  products: {
    count: number
    list: Array<{
      id: string; title: string; sku: string; vendor: string; productType: string
      inventory: number; status: string; price: number; unitsSold: number; revenue: number
    }>
  }
  inventory: {
    totalStock: number
    outOfStock: Array<{ title: string; sku: string }>
    locations: string[]
    byLocation: Array<{ location: string; available: number; incoming: number }>
  }
  payments: Array<{ method: string; amount: number; count: number }>
}

const ORDERS_QUERY = `
  query Orders($cursor: String, $query: String) {
    orders(first: 100, after: $cursor, sortKey: CREATED_AT, reverse: true, query: $query) {
      edges { cursor node {
        id name createdAt cancelledAt sourceName tags
        displayFinancialStatus displayFulfillmentStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        currentSubtotalPriceSet { shopMoney { amount } }
        totalShippingPriceSet { shopMoney { amount } }
        currentTotalTaxSet { shopMoney { amount } }
        currentTotalDiscountsSet { shopMoney { amount } }
        totalRefundedSet { shopMoney { amount } }
        paymentGatewayNames
        customer { id }
        lineItems(first: 20) { edges { node {
          quantity title sku
          originalTotalSet { shopMoney { amount } }
          discountedTotalSet { shopMoney { amount } }
          product { id title vendor productType }
        } } }
      } }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const CUSTOMERS_QUERY = `
  query Customers($cursor: String) {
    customers(first: 100, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      edges { node {
        id email firstName lastName phone note tags numberOfOrders createdAt
        amountSpent { amount currencyCode }
        defaultAddress { city country }
        emailMarketingConsent { marketingState }
        lastOrder { createdAt }
      } }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor) {
      edges { node {
        id title status totalInventory vendor productType
        variants(first: 10) { edges { node { sku inventoryQuantity price } } }
      } }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const INVENTORY_QUERY = `
  query InventoryByLocation {
    productVariants(first: 200) {
      edges { node {
        displayName sku
        inventoryItem {
          inventoryLevels(first: 10) {
            edges { node {
              location { name }
              quantities(names: ["available", "incoming"]) { name quantity }
            } }
          }
        }
      } }
    }
  }
`

async function fetchAllPages<T>(
  query: string,
  pick: (data: Record<string, { edges: Array<{ node: T }>; pageInfo: { hasNextPage: boolean; endCursor: string } }>) => { edges: Array<{ node: T }>; pageInfo: { hasNextPage: boolean; endCursor: string } },
  maxPages = 3,
  baseVars: Record<string, unknown> = {},
): Promise<T[]> {
  const out: T[] = []
  let cursor: string | null = null
  for (let i = 0; i < maxPages; i++) {
    const data: Record<string, { edges: Array<{ node: T }>; pageInfo: { hasNextPage: boolean; endCursor: string } }> | null =
      await shopifyAdminFetch(query, { cursor, ...baseVars }, { noStore: true })
    if (!data) break
    const conn = pick(data)
    out.push(...conn.edges.map((e) => e.node))
    if (!conn.pageInfo.hasNextPage) break
    cursor = conn.pageInfo.endCursor
  }
  return out
}

function monthKey(iso: string): string {
  // YYYY-MM without using Date parsing edge cases
  return iso.slice(0, 7)
}
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
function monthLabel(key: string): string {
  const m = parseInt(key.slice(5, 7), 10)
  return MONTHS_ES[m - 1] ?? key
}

// ---- Date ranges --------------------------------------------------------------
export type ResolvedRange = { from: Date; to: Date; label: string }

const DAY = 86400_000
export const RANGE_PRESETS: { value: string; label: string }[] = [
  { value: "24h", label: "Últimas 24 horas" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "month", label: "Este mes" },
  { value: "prev_month", label: "Mes anterior" },
  { value: "all", label: "Todo" },
]

// `now` is passed in by the caller (server page) so this module never reads the clock itself.
export function resolveRange(preset: string, now: Date): ResolvedRange | null {
  const to = new Date(now)
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  switch (preset) {
    case "24h": return { from: new Date(now.getTime() - DAY), to, label: "Últimas 24 horas" }
    case "7d": return { from: new Date(now.getTime() - 7 * DAY), to, label: "Últimos 7 días" }
    case "30d": return { from: new Date(now.getTime() - 30 * DAY), to, label: "Últimos 30 días" }
    case "month": return { from: new Date(Date.UTC(y, m, 1)), to, label: "Este mes" }
    case "prev_month": return {
      from: new Date(Date.UTC(y, m - 1, 1)),
      to: new Date(Date.UTC(y, m, 1) - 1),
      label: "Mes anterior",
    }
    default: return null // "all"
  }
}

// Equal-length period immediately before the given range (for comparisons).
export function previousRange(r: ResolvedRange): ResolvedRange {
  const span = r.to.getTime() - r.from.getTime()
  return {
    from: new Date(r.from.getTime() - span - 1),
    to: new Date(r.from.getTime() - 1),
    label: "Periodo anterior",
  }
}

function orderDateQuery(r: ResolvedRange | null): string | null {
  if (!r) return null
  return `created_at:>='${r.from.toISOString()}' created_at:<='${r.to.toISOString()}'`
}

export type SalesSummary = StoreAnalytics["sales"]

function computeSales(liveOrders: OrderNode[], customerCount: number): SalesSummary {
  let grossSales = 0, discounts = 0, shipping = 0, taxes = 0, returns = 0, totalSales = 0, itemsSold = 0
  for (const o of liveOrders) {
    grossSales += money(o.currentSubtotalPriceSet) + money(o.currentTotalDiscountsSet)
    discounts += money(o.currentTotalDiscountsSet)
    shipping += money(o.totalShippingPriceSet)
    taxes += money(o.currentTotalTaxSet)
    returns += money(o.totalRefundedSet)
    totalSales += money(o.currentTotalPriceSet)
    for (const li of o.lineItems.edges) itemsSold += li.node.quantity || 0
  }
  const ordersCount = liveOrders.length
  return {
    grossSales: Math.round(grossSales),
    netSales: Math.round(grossSales - discounts - returns),
    totalSales: Math.round(totalSales),
    returns: Math.round(returns),
    discounts: Math.round(discounts),
    shipping: Math.round(shipping),
    taxes: Math.round(taxes),
    aov: ordersCount > 0 ? totalSales / ordersCount : 0,
    ordersCount,
    itemsSold,
    revenuePerCustomer: customerCount > 0 ? totalSales / customerCount : 0,
  }
}

// Lightweight sales-only summary for a range — used for period-over-period comparison.
export async function getSalesForRange(range: ResolvedRange | null): Promise<SalesSummary> {
  const orderNodes = await fetchAllPages<OrderNode>(ORDERS_QUERY, (d) => d.orders, 3, { query: orderDateQuery(range) })
  return computeSales(orderNodes.filter((o) => !o.cancelledAt), 0)
}

export async function getStoreAnalytics(range: ResolvedRange | null = null): Promise<StoreAnalytics> {
  const [orderNodes, customerNodes, productNodes, invData] = await Promise.all([
    fetchAllPages<OrderNode>(ORDERS_QUERY, (d) => d.orders, 3, { query: orderDateQuery(range) }),
    fetchAllPages<CustomerNode>(CUSTOMERS_QUERY, (d) => d.customers),
    fetchAllPages<ProductNode>(PRODUCTS_QUERY, (d) => d.products),
    shopifyAdminFetch<{ productVariants: { edges: Array<{ node: {
      displayName: string; sku: string | null
      inventoryItem: { inventoryLevels: { edges: Array<{ node: {
        location: { name: string }
        quantities: Array<{ name: string; quantity: number }>
      } }> } } | null
    } }> } }>(INVENTORY_QUERY, undefined, { noStore: true }),
  ])

  const liveOrders = orderNodes.filter((o) => !o.cancelledAt)
  const currency = orderNodes[0]?.currentTotalPriceSet?.shopMoney?.currencyCode
    || customerNodes[0]?.amountSpent?.currencyCode
    || "CLP"

  // ---- Sales ----
  const sales = computeSales(liveOrders, customerNodes.length)

  // ---- Sales trend (last 6 months present in the window) ----
  const trendMap = new Map<string, { gross: number; net: number }>()
  for (const o of liveOrders) {
    const k = monthKey(o.createdAt)
    const cur = trendMap.get(k) ?? { gross: 0, net: 0 }
    const g = money(o.currentSubtotalPriceSet) + money(o.currentTotalDiscountsSet)
    cur.gross += g
    cur.net += g - money(o.currentTotalDiscountsSet) - money(o.totalRefundedSet)
    trendMap.set(k, cur)
  }
  const salesTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([k, v]) => ({ month: monthLabel(k), gross: Math.round(v.gross), net: Math.round(v.net) }))

  // ---- Orders table ----
  const orders = liveOrders.slice(0, 25).map((o) => ({
    id: o.id,
    name: o.name,
    createdAt: o.createdAt,
    customer: o.customer ? "Registrado" : "Invitado",
    total: money(o.currentTotalPriceSet),
    financialStatus: o.displayFinancialStatus ?? "—",
    fulfillmentStatus: o.displayFulfillmentStatus ?? "—",
    source: o.sourceName || "—",
    itemsCount: o.lineItems.edges.reduce((s, li) => s + (li.node.quantity || 0), 0),
  }))

  // ---- Product performance (units sold + revenue from line items) ----
  const perfMap = new Map<string, { unitsSold: number; revenue: number }>()
  for (const o of liveOrders) {
    for (const { node: li } of o.lineItems.edges) {
      const key = li.product?.id ?? li.title
      const cur = perfMap.get(key) ?? { unitsSold: 0, revenue: 0 }
      cur.unitsSold += li.quantity || 0
      cur.revenue += money(li.discountedTotalSet)
      perfMap.set(key, cur)
    }
  }
  const productList = productNodes.map((p) => {
    const perf = perfMap.get(p.id) ?? { unitsSold: 0, revenue: 0 }
    const v0 = p.variants.edges[0]?.node
    return {
      id: p.id,
      title: p.title,
      sku: v0?.sku || "—",
      vendor: p.vendor || "—",
      productType: p.productType || "—",
      inventory: p.totalInventory ?? 0,
      status: p.status,
      price: num(v0?.price),
      unitsSold: perf.unitsSold,
      revenue: perf.revenue,
    }
  }).sort((a, b) => b.revenue - a.revenue || b.inventory - a.inventory)

  // ---- Customers ----
  const customerList = customerNodes.map((c) => {
    const orders = num(c.numberOfOrders)
    const spent = num(c.amountSpent.amount)
    return {
      id: c.id,
      name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || "Cliente",
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "—",
      phone: c.phone || "",
      note: c.note || "",
      ordersCount: orders,
      totalSpent: spent,
      aov: orders > 0 ? spent / orders : 0,
      location: [c.defaultAddress?.city, c.defaultAddress?.country].filter(Boolean).join(", ") || "—",
      marketing: c.emailMarketingConsent?.marketingState === "SUBSCRIBED",
      lastOrderAt: c.lastOrder?.createdAt ?? null,
      tags: c.tags,
    }
  }).sort((a, b) => b.totalSpent - a.totalSpent)

  const returningCount = customerList.filter((c) => c.ordersCount > 1).length
  const newCount = customerList.length - returningCount
  const subscribedCount = customerList.filter((c) => c.marketing).length
  const totalSpentAll = customerList.reduce((s, c) => s + c.totalSpent, 0)

  // ---- Inventory by location + out of stock ----
  const locMap = new Map<string, { available: number; incoming: number }>()
  const variants = invData?.productVariants?.edges ?? []
  for (const { node: v } of variants) {
    for (const { node: lvl } of v.inventoryItem?.inventoryLevels?.edges ?? []) {
      const name = lvl.location?.name || "—"
      const cur = locMap.get(name) ?? { available: 0, incoming: 0 }
      for (const q of lvl.quantities ?? []) {
        if (q.name === "available") cur.available += q.quantity || 0
        if (q.name === "incoming") cur.incoming += q.quantity || 0
      }
      locMap.set(name, cur)
    }
  }
  const byLocation = Array.from(locMap.entries()).map(([location, v]) => ({ location, ...v }))
  const outOfStock = productList.filter((p) => p.inventory <= 0).map((p) => ({ title: p.title, sku: p.sku }))
  const totalStock = productList.reduce((s, p) => s + p.inventory, 0)

  // ---- Payments mix (by gateway, weighted by order total) ----
  const payMap = new Map<string, { amount: number; count: number }>()
  for (const o of liveOrders) {
    const gateways = o.paymentGatewayNames.length ? o.paymentGatewayNames : ["—"]
    const share = money(o.currentTotalPriceSet) / gateways.length
    for (const g of gateways) {
      const cur = payMap.get(g) ?? { amount: 0, count: 0 }
      cur.amount += share
      cur.count += 1
      payMap.set(g, cur)
    }
  }
  const payments = Array.from(payMap.entries())
    .map(([method, v]) => ({ method, amount: Math.round(v.amount), count: v.count }))
    .sort((a, b) => b.amount - a.amount)

  return {
    connected: true,
    currency,
    shopName: null,
    windowOrders: liveOrders.length,
    range: range ? { label: range.label } : null,
    sales,
    salesTrend,
    orders,
    customers: {
      total: customerList.length,
      newCount,
      returningCount,
      repeatPurchaseRate: customerList.length > 0 ? (returningCount / customerList.length) * 100 : 0,
      avgClv: customerList.length > 0 ? totalSpentAll / customerList.length : 0,
      subscribedRate: customerList.length > 0 ? (subscribedCount / customerList.length) * 100 : 0,
      list: customerList.slice(0, 25),
    },
    products: { count: productNodes.length, list: productList.slice(0, 50) },
    inventory: { totalStock, outOfStock, locations: Array.from(locMap.keys()), byLocation },
    payments,
  }
}
