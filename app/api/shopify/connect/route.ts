import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  buildAuthorizeUrl,
  generateNonce,
  normalizeShopDomain,
  shopifyOAuthIsConfigured,
} from "@/lib/shopify/oauth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const shop = normalizeShopDomain(url.searchParams.get("shop") || "")
  if (!shop) {
    return NextResponse.json({ error: "Indica una tienda Shopify válida (e.g. mistore.myshopify.com)" }, { status: 400 })
  }

  const cfg = shopifyOAuthIsConfigured()
  if (!cfg.ok) {
    return NextResponse.json({
      error: "Shopify OAuth no está configurado",
      missing: cfg.missing,
    }, { status: 503 })
  }

  const state = generateNonce()
  const cookieStore = await cookies()
  cookieStore.set("shopify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  })
  cookieStore.set("shopify_oauth_shop", shop, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  })

  return NextResponse.redirect(buildAuthorizeUrl(shop, state))
}
