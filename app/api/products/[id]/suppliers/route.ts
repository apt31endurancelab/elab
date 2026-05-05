import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type LinkPayload = {
  id?: string
  supplier_id?: string
  supplier_sku?: string | null
  cost_price?: number | string
  currency?: string
  lead_time_days?: number | string | null
  min_order_qty?: number | string
  is_primary?: boolean
  notes?: string | null
}

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// POST: create or update a product↔supplier link.
// DELETE: remove a single link by ?link_id=<uuid>.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  const body = await request.json().catch(() => ({})) as LinkPayload
  if (!body.supplier_id) return NextResponse.json({ error: "supplier_id requerido" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const payload = {
    product_id: productId,
    supplier_id: body.supplier_id,
    supplier_sku: body.supplier_sku || null,
    cost_price: num(body.cost_price),
    currency: body.currency || "CLP",
    lead_time_days: body.lead_time_days ? num(body.lead_time_days) : null,
    min_order_qty: Math.max(1, Math.round(num(body.min_order_qty, 1))),
    is_primary: body.is_primary ?? false,
    notes: body.notes || null,
  }

  if (body.id) {
    const { error } = await supabase
      .from("product_suppliers")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // upsert by (product_id, supplier_id) to avoid duplicates
  const { error } = await supabase
    .from("product_suppliers")
    .upsert(payload, { onConflict: "product_id,supplier_id" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  const url = new URL(request.url)
  const linkId = url.searchParams.get("link_id")
  if (!linkId) return NextResponse.json({ error: "link_id requerido" }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from("product_suppliers")
    .delete()
    .eq("id", linkId)
    .eq("product_id", productId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
