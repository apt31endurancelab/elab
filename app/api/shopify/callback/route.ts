import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  exchangeCodeForToken,
  getShopifyConfig,
  registerWebhook,
  SHOPIFY_WEBHOOK_TOPICS,
  verifyOAuthHmac,
} from "@/lib/shopify/oauth"
import { syncShopifyOrders } from "@/lib/shopify/sync"

function failureRedirect(reason: string) {
  const u = new URL("/dashboard/settings", process.env.SHOPIFY_APP_URL || "http://localhost:3000")
  u.searchParams.set("shopify", "error")
  u.searchParams.set("reason", reason)
  return NextResponse.redirect(u)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = url.searchParams

  if (!verifyOAuthHmac(params)) {
    return failureRedirect("hmac_invalid")
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get("shopify_oauth_state")?.value
  const expectedShop = cookieStore.get("shopify_oauth_shop")?.value
  const state = params.get("state")
  const shop = params.get("shop")
  const code = params.get("code")

  if (!shop || !code) return failureRedirect("missing_params")
  if (expectedState && state !== expectedState) return failureRedirect("state_mismatch")
  if (expectedShop && shop !== expectedShop) return failureRedirect("shop_mismatch")

  const tokenRes = await exchangeCodeForToken(shop, code)
  if (!tokenRes) return failureRedirect("token_exchange_failed")

  let userId: string | null = null
  try {
    const supa = await createClient()
    const { data: { user } } = await supa.auth.getUser()
    userId = user?.id ?? null
  } catch { /* ignore — admin client below still works */ }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("shopify_connections")
    .select("id")
    .eq("shop_domain", shop)
    .maybeSingle()

  let connectionId: string
  if (existing?.id) {
    await admin
      .from("shopify_connections")
      .update({
        access_token: tokenRes.access_token,
        scopes: tokenRes.scope,
        status: "connecting",
        status_message: null,
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
    connectionId = existing.id
  } else {
    const { data: created, error } = await admin
      .from("shopify_connections")
      .insert({
        shop_domain: shop,
        access_token: tokenRes.access_token,
        scopes: tokenRes.scope,
        status: "connecting",
        user_id: userId,
      })
      .select("id")
      .single()
    if (error || !created) return failureRedirect("db_insert_failed")
    connectionId = created.id
  }

  // Register webhooks (best-effort)
  const cfg = getShopifyConfig()
  const webhookIds: Record<string, string> = {}
  for (const topic of SHOPIFY_WEBHOOK_TOPICS) {
    const id = await registerWebhook(
      shop,
      tokenRes.access_token,
      topic,
      `${cfg.appUrl}/api/shopify/webhooks/${topic.toLowerCase().replace(/_/g, "-")}`,
    )
    if (id) webhookIds[topic] = id
  }
  if (Object.keys(webhookIds).length) {
    await admin
      .from("shopify_connections")
      .update({ webhook_ids: webhookIds })
      .eq("id", connectionId)
  }

  // Kick off initial sync (don't await — redirect immediately, sync runs server-side)
  syncShopifyOrders(connectionId, { trigger: "install" }).catch(err => {
    console.error("Initial sync error:", err)
  })

  // Clear oauth cookies
  cookieStore.set("shopify_oauth_state", "", { maxAge: 0, path: "/" })
  cookieStore.set("shopify_oauth_shop", "", { maxAge: 0, path: "/" })

  const successUrl = new URL("/dashboard/settings", process.env.SHOPIFY_APP_URL || "http://localhost:3000")
  successUrl.searchParams.set("shopify", "connected")
  successUrl.searchParams.set("shop", shop)
  return NextResponse.redirect(successUrl)
}
