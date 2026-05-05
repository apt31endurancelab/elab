import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type ProductPayload = {
  id?: string
  name?: string
  description?: string | null
  sku?: string | null
  category?: string | null
  barcode?: string | null
  price?: number | string
  cost_price?: number | string
  currency?: string
  stock?: number | string
  low_stock_threshold?: number | string
  weight?: number | string
  weight_unit?: string
  image_url?: string | null
  is_active?: boolean
}

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as ProductPayload
  if (!body.name) return NextResponse.json({ error: "name requerido" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const payload = {
    user_id: user.id,
    name: String(body.name),
    description: body.description ?? null,
    sku: body.sku || null,
    category: body.category || null,
    barcode: body.barcode || null,
    price: num(body.price),
    cost_price: num(body.cost_price),
    currency: body.currency || "CLP",
    stock: Math.max(0, Math.round(num(body.stock))),
    low_stock_threshold: Math.max(0, Math.round(num(body.low_stock_threshold))),
    weight: body.weight ? num(body.weight) : null,
    weight_unit: body.weight_unit || "kg",
    image_url: body.image_url || null,
    is_active: body.is_active ?? true,
  }

  if (body.id) {
    const { error } = await supabase
      .from("products")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await supabase.from("products").insert(payload).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data?.id })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
