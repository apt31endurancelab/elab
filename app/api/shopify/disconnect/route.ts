import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { connection_id?: string }
  if (!body.connection_id) {
    return NextResponse.json({ error: "connection_id required" }, { status: 400 })
  }
  const admin = createAdminClient()
  await admin
    .from("shopify_connections")
    .update({ status: "disconnected", status_message: "Desconectado por el usuario" })
    .eq("id", body.connection_id)
  return NextResponse.json({ ok: true })
}
