import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { pushProductToShopify } from "@/lib/shopify/products"
import type { Product } from "@/lib/inventory"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: product }, { data: connection }] = await Promise.all([
    admin.from("products").select("*").eq("id", id).single(),
    admin
      .from("shopify_connections")
      .select("shop_domain, access_token")
      .in("status", ["connected", "syncing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
  if (!connection) {
    return NextResponse.json({ error: "Sin conexión activa a Shopify. Conecta primero en Ajustes." }, { status: 400 })
  }

  const result = await pushProductToShopify(connection.shop_domain, connection.access_token, product as Product)

  if (!result.ok) {
    await admin
      .from("products")
      .update({
        shopify_sync_error: result.error,
        last_shopify_sync_at: new Date().toISOString(),
      })
      .eq("id", id)
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  await admin
    .from("products")
    .update({
      shopify_product_id: result.shopify_product_id,
      shopify_variant_id: result.shopify_variant_id,
      shopify_inventory_item_id: result.shopify_inventory_item_id,
      shopify_sync_error: null,
      last_shopify_sync_at: new Date().toISOString(),
    })
    .eq("id", id)

  return NextResponse.json(result)
}
