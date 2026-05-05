import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  if (!body.name) return NextResponse.json({ error: "name requerido" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const payload = {
    user_id: user.id,
    name: String(body.name),
    contact_person: body.contact_person || null,
    email: body.email || null,
    phone: body.phone || null,
    website: body.website || null,
    address: body.address || null,
    country_code: body.country_code || null,
    tax_id: body.tax_id || null,
    tax_id_type: body.tax_id_type || null,
    payment_terms: body.payment_terms || null,
    default_currency: body.default_currency || "CLP",
    default_lead_time_days: body.default_lead_time_days || null,
    notes: body.notes || null,
    is_active: body.is_active ?? true,
  }

  if (body.id) {
    const { error } = await supabase
      .from("suppliers")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", String(body.id))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await supabase.from("suppliers").insert(payload).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data?.id })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.from("suppliers").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
