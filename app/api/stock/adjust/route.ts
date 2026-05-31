import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { setShopifyInventory } from "@/lib/shopify/products"

type AdjustPayload = {
  product_id?: string
  change?: number | string
  reason?: string
  notes?: string | null
  unit_cost?: number | string | null
  push_to_shopify?: boolean
}

const ALLOWED = new Set(["adjustment", "manual", "purchase", "return", "shopify_sync"])

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as AdjustPayload
  if (!body.product_id) return NextResponse.json({ error: "product_id requerido" }, { status: 400 })
  const reason = body.reason || "adjustment"
  if (!ALLOWED.has(reason)) return NextResponse.json({ error: "reason inválida" }, { status: 400 })
  const change = Math.round(Number(body.change))
  if (!Number.isFinite(change) || change === 0) return NextResponse.json({ error: "change debe ser un entero distinto de 0" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  // The trigger applies the change atomically and returns resulting_stock.
  const { error } = await supabase.from("stock_movements").insert({
    user_id: user.id,
    product_id: body.product_id,
    change,
    reason,
    notes: body.notes || null,
    unit_cost: body.unit_cost ? Number(body.unit_cost) : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Push the resulting on-hand quantity to Shopify (unless this change itself
  // came FROM a Shopify sync, which would loop). Best-effort: never fails the adjust.
  let shopify: { ok: boolean; error?: string } | null = null
  if (reason !== "shopify_sync" && body.push_to_shopify !== false) {
    try {
      const admin = createAdminClient()
      const { data: product } = await admin
        .from("products")
        .select("stock, shopify_inventory_item_id")
        .eq("id", body.product_id)
        .maybeSingle()

      if (product?.shopify_inventory_item_id) {
        const { data: conn } = await admin
          .from("shopify_connections")
          .select("shop_domain, access_token")
          .in("status", ["connected", "syncing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (conn) {
          shopify = await setShopifyInventory(
            conn.shop_domain,
            conn.access_token,
            product.shopify_inventory_item_id,
            product.stock ?? 0,
          )
          await admin
            .from("products")
            .update(
              shopify.ok
                ? { shopify_sync_error: null, last_shopify_sync_at: new Date().toISOString() }
                : { shopify_sync_error: `Inventario: ${shopify.error}` },
            )
            .eq("id", body.product_id)
        }
      }
    } catch (e) {
      shopify = { ok: false, error: (e as Error).message }
    }
  }

  return NextResponse.json({ ok: true, shopify })
}
