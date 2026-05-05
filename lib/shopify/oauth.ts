import crypto from "crypto"

// Required env:
//   SHOPIFY_API_KEY        - from your Shopify Partners app
//   SHOPIFY_API_SECRET     - from your Shopify Partners app
//   SHOPIFY_APP_URL        - public base URL of this app (e.g. https://app.endurancelab.cc)
//   SHOPIFY_API_SCOPES     - comma-separated, e.g. read_orders,read_products,read_customers,read_analytics

export const SHOPIFY_API_VERSION = "2024-10"

export const SHOPIFY_DEFAULT_SCOPES = [
  "read_orders",
  "read_products",
  "read_customers",
  "read_analytics",
]

export function getShopifyConfig() {
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    apiSecret: process.env.SHOPIFY_API_SECRET || "",
    appUrl: process.env.SHOPIFY_APP_URL || "",
    scopes: (process.env.SHOPIFY_API_SCOPES || SHOPIFY_DEFAULT_SCOPES.join(",")).split(",").map(s => s.trim()).filter(Boolean),
  }
}

export function shopifyOAuthIsConfigured(): { ok: boolean; missing: string[] } {
  const cfg = getShopifyConfig()
  const missing: string[] = []
  if (!cfg.apiKey) missing.push("SHOPIFY_API_KEY")
  if (!cfg.apiSecret) missing.push("SHOPIFY_API_SECRET")
  if (!cfg.appUrl) missing.push("SHOPIFY_APP_URL")
  return { ok: missing.length === 0, missing }
}

export function normalizeShopDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  // Accept "shop.myshopify.com" or just "shop"
  if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(trimmed)) return trimmed
  if (/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) return `${trimmed}.myshopify.com`
  return null
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex")
}

// Build the Shopify install/authorize URL the user is redirected to.
export function buildAuthorizeUrl(shop: string, state: string): string {
  const cfg = getShopifyConfig()
  const params = new URLSearchParams({
    client_id: cfg.apiKey,
    scope: cfg.scopes.join(","),
    redirect_uri: `${cfg.appUrl}/api/shopify/callback`,
    state,
    "grant_options[]": "per-user",
  })
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

// Validate the HMAC signature on a callback URL (Shopify signs all OAuth callbacks).
export function verifyOAuthHmac(searchParams: URLSearchParams): boolean {
  const cfg = getShopifyConfig()
  if (!cfg.apiSecret) return false
  const provided = searchParams.get("hmac")
  if (!provided) return false

  const params = new URLSearchParams(searchParams)
  params.delete("hmac")
  params.delete("signature")
  const sorted = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b))
  const message = sorted.map(([k, v]) => `${k}=${v}`).join("&")
  const digest = crypto.createHmac("sha256", cfg.apiSecret).update(message).digest("hex")

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(provided, "hex"))
  } catch {
    return false
  }
}

// Validate the HMAC on an incoming webhook request body.
export function verifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  const cfg = getShopifyConfig()
  if (!cfg.apiSecret || !hmacHeader) return false
  const digest = crypto.createHmac("sha256", cfg.apiSecret).update(rawBody, "utf8").digest("base64")
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader))
  } catch {
    return false
  }
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<{ access_token: string; scope: string } | null> {
  const cfg = getShopifyConfig()
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: cfg.apiKey,
      client_secret: cfg.apiSecret,
      code,
    }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function adminFetch<T>(shop: string, accessToken: string, query: string, variables?: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) return null
  const json = await res.json() as { data?: T; errors?: unknown }
  if (json.errors) {
    console.error("Shopify error:", json.errors)
    return null
  }
  return (json.data as T) ?? null
}

// Register a webhook with Shopify
export async function registerWebhook(shop: string, accessToken: string, topic: string, callbackUrl: string): Promise<string | null> {
  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id }
        userErrors { field message }
      }
    }
  `
  const data = await adminFetch<{
    webhookSubscriptionCreate: { webhookSubscription: { id: string } | null; userErrors: { field: string[]; message: string }[] }
  }>(shop, accessToken, mutation, {
    topic,
    webhookSubscription: { callbackUrl, format: "JSON" },
  })
  if (!data) return null
  if (data.webhookSubscriptionCreate.userErrors.length) {
    console.warn("webhook userErrors:", data.webhookSubscriptionCreate.userErrors)
  }
  return data.webhookSubscriptionCreate.webhookSubscription?.id ?? null
}

export const SHOPIFY_WEBHOOK_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_PAID",
  "ORDERS_UPDATED",
  "ORDERS_CANCELLED",
  "APP_UNINSTALLED",
] as const
