import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { pullShopifyProducts } from "@/lib/shopify/products"

// Pull stock + IDs from Shopify back into local products.
// Match by shopify_product_id first, then SKU. Updates stock + Shopify IDs only —
// does NOT overwrite local price/cost/etc (this app is the source of truth).

export async function POST() {
  const admin = createAdminClient()
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, shop_domain, access_token")
    .in("status", ["connected", "syncing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!connection) {
    return NextResponse.json({ error: "Sin conexión activa a Shopify" }, { status: 400 })
  }

  const pulled = await pullShopifyProducts(connection.shop_domain, connection.access_token)

  const { data: localProducts } = await admin.from("products").select("id, sku, shopify_product_id, stock")
  const byShopifyId = new Map((localProducts || []).filter(p => p.shopify_product_id).map(p => [p.shopify_product_id as string, p]))
  const bySku = new Map((localProducts || []).filter(p => p.sku).map(p => [p.sku as string, p]))

  let updated = 0
  for (const sp of pulled) {
    const match = byShopifyId.get(sp.shopify_product_id) || (sp.sku ? bySku.get(sp.sku) : null)
    if (!match) continue
    const updates: Record<string, unknown> = {
      shopify_product_id: sp.shopify_product_id,
      shopify_variant_id: sp.shopify_variant_id,
      shopify_inventory_item_id: sp.shopify_inventory_item_id,
      last_shopify_sync_at: new Date().toISOString(),
    }
    if (sp.inventory_quantity !== null && sp.inventory_quantity !== match.stock) {
      updates.stock = sp.inventory_quantity
      // log the movement so the audit trail stays consistent
      await admin.from("stock_movements").insert({
        product_id: match.id,
        change: (sp.inventory_quantity ?? 0) - match.stock,
        reason: "shopify_sync",
        notes: "Pull desde Shopify",
      })
    }
    await admin.from("products").update(updates).eq("id", match.id)
    updated += 1
  }

  return NextResponse.json({ ok: true, updated, pulled: pulled.length })
}
