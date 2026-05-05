import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type AdjustPayload = {
  product_id?: string
  change?: number | string
  reason?: string
  notes?: string | null
  unit_cost?: number | string | null
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

  return NextResponse.json({ ok: true })
}
