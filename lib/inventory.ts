// Shared types + small helpers for products, suppliers, stock.

export type Product = {
  id: string
  user_id: string
  name: string
  description: string | null
  sku: string | null
  category: string | null
  barcode: string | null
  price: number
  cost_price: number
  currency: string
  stock: number
  low_stock_threshold: number
  weight: number | null
  weight_unit: string | null
  image_url: string | null
  is_active: boolean
  shopify_product_id: string | null
  shopify_variant_id: string | null
  shopify_inventory_item_id: string | null
  last_shopify_sync_at: string | null
  shopify_sync_error: string | null
  created_at: string
  updated_at: string
}

export type Supplier = {
  id: string
  user_id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  country_code: string | null
  tax_id: string | null
  tax_id_type: string | null
  payment_terms: string | null
  default_currency: string | null
  default_lead_time_days: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ProductSupplier = {
  id: string
  product_id: string
  supplier_id: string
  supplier_sku: string | null
  cost_price: number
  currency: string
  lead_time_days: number | null
  min_order_qty: number
  is_primary: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type StockMovement = {
  id: string
  user_id: string | null
  product_id: string
  change: number
  resulting_stock: number | null
  reason: "purchase" | "sale" | "return" | "adjustment" | "shopify_sync" | "shopify_order" | "invoice" | "manual"
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  unit_cost: number | null
  created_at: string
}

export const STOCK_REASON_LABELS: Record<StockMovement["reason"], string> = {
  purchase: "Compra a proveedor",
  sale: "Venta",
  return: "Devolución",
  adjustment: "Ajuste manual",
  shopify_sync: "Sincronización Shopify",
  shopify_order: "Pedido Shopify",
  invoice: "Factura emitida",
  manual: "Movimiento manual",
}

export function marginAmount(price: number, costPrice: number): number {
  return Math.max(0, Number(price) - Number(costPrice))
}

export function marginPercent(price: number, costPrice: number): number {
  const p = Number(price)
  if (!p || Number.isNaN(p)) return 0
  return ((p - Number(costPrice)) / p) * 100
}

export function markupPercent(price: number, costPrice: number): number {
  const c = Number(costPrice)
  if (!c || Number.isNaN(c)) return 0
  return ((Number(price) - c) / c) * 100
}

export function formatCurrency(amount: number, currency: string | null = "CLP"): string {
  const code = currency || "CLP"
  if (code === "CLP") return `$${Math.round(Number(amount)).toLocaleString("es-CL")}`
  if (code === "EUR") return `€${Number(amount).toLocaleString("es-ES", { minimumFractionDigits: 2 })}`
  if (code === "USD") return `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  return `${code} ${Number(amount).toLocaleString("es-ES")}`
}

export function isLowStock(p: Pick<Product, "stock" | "low_stock_threshold">): boolean {
  if (!p.low_stock_threshold || p.low_stock_threshold <= 0) return p.stock <= 0
  return p.stock <= p.low_stock_threshold
}

export const SUPPORTED_CURRENCIES = ["CLP", "EUR", "USD", "MXN", "ARS", "BRL", "GBP"] as const
