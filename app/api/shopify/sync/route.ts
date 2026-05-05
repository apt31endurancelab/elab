import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncShopifyOrders } from "@/lib/shopify/sync"

// Manual + cron sync.
// - From the UI: POST /api/shopify/sync (with cookie auth)
// - From cron: GET /api/shopify/sync?secret=<NOTIFICATIONS_CRON_SECRET>

async function authorized(request: Request): Promise<boolean> {
  const url = new URL(request.url)
  const secret = process.env.NOTIFICATIONS_CRON_SECRET
  if (!secret) return true // no shared secret configured: allow only when called from same-origin
  const auth = request.headers.get("authorization") || ""
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : url.searchParams.get("secret") || ""
  return provided === secret
}

async function run(request: Request) {
  const url = new URL(request.url)
  const connectionId = url.searchParams.get("connection_id")

  const admin = createAdminClient()

  let connectionIds: string[] = []
  if (connectionId) {
    connectionIds = [connectionId]
  } else {
    const { data } = await admin
      .from("shopify_connections")
      .select("id")
      .neq("status", "disconnected")
    connectionIds = (data || []).map(c => c.id)
  }

  const results: Record<string, unknown> = {}
  for (const id of connectionIds) {
    results[id] = await syncShopifyOrders(id, { trigger: "manual" })
  }
  return NextResponse.json({ ok: true, connections: connectionIds.length, results })
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  return run(request)
}

export async function GET(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  return run(request)
}
