import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyWebhookHmac } from "@/lib/shopify/oauth"
import { upsertOrderFromWebhook } from "@/lib/shopify/sync"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ topic: string }> }
) {
  const { topic } = await params
  const rawBody = await request.text()
  const hmac = request.headers.get("x-shopify-hmac-sha256")

  if (!verifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 401 })
  }

  const shop = request.headers.get("x-shopify-shop-domain")
  if (!shop) {
    return NextResponse.json({ error: "missing shop header" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, status")
    .eq("shop_domain", shop)
    .single()

  if (!connection) {
    return NextResponse.json({ error: "no connection for shop" }, { status: 404 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  switch (topic) {
    case "orders-create":
    case "orders-paid":
    case "orders-updated":
      await upsertOrderFromWebhook(connection.id, payload)
      break
    case "orders-cancelled":
      await upsertOrderFromWebhook(connection.id, payload)
      break
    case "app-uninstalled":
      await admin
        .from("shopify_connections")
        .update({ status: "disconnected", status_message: "App desinstalada en Shopify" })
        .eq("id", connection.id)
      break
    default:
      // unknown topic — accept to avoid Shopify retries
      break
  }

  return NextResponse.json({ ok: true })
}
