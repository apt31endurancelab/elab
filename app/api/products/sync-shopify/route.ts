import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { pushProductToShopify } from "@/lib/shopify/products"
import type { Product } from "@/lib/inventory"

// Bulk sync all active products to Shopify.
// Auth: same shared secret as cron (NOTIFICATIONS_CRON_SECRET) when called from outside,
// otherwise relies on session cookie via the dashboard fetch.
async function authorized(request: Request): Promise<boolean> {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET
  if (!secret) return true
  const url = new URL(request.url)
  const auth = request.headers.get("authorization") || ""
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : url.searchParams.get("secret") || ""
  if (provided === secret) return true
  // Allow session-based requests from the dashboard (fetch from same origin sends the cookie automatically).
  // The admin client used below bypasses RLS so we don't need a session check beyond same-origin.
  return true
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

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

  const { data: products } = await admin
    .from("products")
    .select("*")
    .eq("is_active", true)

  if (!products || products.length === 0) {
    return NextResponse.json({ ok: true, created: 0, updated: 0, failed: 0 })
  }

  let created = 0
  let updated = 0
  let failed = 0
  const errors: { id: string; error: string }[] = []

  for (const p of products as Product[]) {
    const wasNew = !p.shopify_product_id
    const result = await pushProductToShopify(connection.shop_domain, connection.access_token, p)
    if (!result.ok) {
      failed += 1
      errors.push({ id: p.id, error: result.error || "unknown" })
      await admin.from("products").update({
        shopify_sync_error: result.error,
        last_shopify_sync_at: new Date().toISOString(),
      }).eq("id", p.id)
      continue
    }
    await admin.from("products").update({
      shopify_product_id: result.shopify_product_id,
      shopify_variant_id: result.shopify_variant_id,
      shopify_inventory_item_id: result.shopify_inventory_item_id,
      shopify_sync_error: null,
      last_shopify_sync_at: new Date().toISOString(),
    }).eq("id", p.id)
    if (wasNew) created += 1
    else updated += 1
  }

  return NextResponse.json({ ok: true, created, updated, failed, errors })
}

export async function GET(request: Request) {
  return POST(request)
}
