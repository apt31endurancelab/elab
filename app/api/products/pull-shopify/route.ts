import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { pullShopifyProducts } from "@/lib/shopify/products"
import { getShopifyShopInfo } from "@/lib/shopify"

// Pull products from Shopify into the local catalog.
// - Existing local products (matched by shopify_product_id, then SKU): update stock + Shopify IDs
//   only — never overwrites local price/cost (this app stays the source of truth for those).
// - Unmatched Shopify products: IMPORTED as new local products so the catalog mirrors the store.

export async function POST() {
  const admin = createAdminClient()
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, shop_domain, access_token, user_id")
    .in("status", ["connected", "syncing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!connection) {
    return NextResponse.json({ error: "Sin conexión activa a Shopify" }, { status: 400 })
  }

  const [pulled, shopInfo] = await Promise.all([
    pullShopifyProducts(connection.shop_domain, connection.access_token),
    getShopifyShopInfo(),
  ])
  const currency = shopInfo?.shop?.currencyCode || "USD"

  // Products require an owner user_id. Prefer the user doing the sync (so it shows
  // up in their catalog), then the connection's user, then any superadmin.
  let ownerId: string | null = null
  try {
    const supa = await createClient()
    const { data: { user } } = await supa.auth.getUser()
    ownerId = user?.id ?? null
  } catch { /* ignore */ }
  if (!ownerId) ownerId = connection.user_id
  if (!ownerId) {
    const { data: admins } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "superadmin")
      .limit(1)
    ownerId = admins?.[0]?.id ?? null
    if (ownerId) await admin.from("shopify_connections").update({ user_id: ownerId }).eq("id", connection.id)
  }

  const { data: localProducts } = await admin.from("products").select("id, sku, shopify_product_id, stock")
  const byShopifyId = new Map((localProducts || []).filter(p => p.shopify_product_id).map(p => [p.shopify_product_id as string, p]))
  const bySku = new Map((localProducts || []).filter(p => p.sku).map(p => [p.sku as string, p]))

  let updated = 0
  let imported = 0
  for (const sp of pulled) {
    const match = byShopifyId.get(sp.shopify_product_id) || (sp.sku ? bySku.get(sp.sku) : null)

    if (!match) {
      // IMPORT: create a new local product mirroring the Shopify one.
      const { error } = await admin.from("products").insert({
        user_id: ownerId,
        name: sp.title,
        sku: sp.sku,
        price: sp.price ?? 0,
        cost_price: 0,
        currency,
        stock: sp.inventory_quantity ?? 0,
        barcode: sp.barcode,
        is_active: true,
        shopify_product_id: sp.shopify_product_id,
        shopify_variant_id: sp.shopify_variant_id,
        shopify_inventory_item_id: sp.shopify_inventory_item_id,
        last_shopify_sync_at: new Date().toISOString(),
      })
      if (!error) imported += 1
      else console.error("Import product failed:", sp.title, error.message)
      continue
    }

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

  return NextResponse.json({ ok: true, updated, imported, pulled: pulled.length })
}
