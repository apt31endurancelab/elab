import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    email?: string
    full_name?: string
    segments?: string[]
    source?: string
    client_id?: string
  }
  if (!body.email) return NextResponse.json({ error: "email requerido" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { error } = await supabase.from("newsletter_subscribers").upsert({
    email: body.email.trim().toLowerCase(),
    full_name: body.full_name || null,
    segments: body.segments || [],
    source: body.source || "manual",
    client_id: body.client_id || null,
    status: "active",
  }, { onConflict: "email" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  await supabase.from("newsletter_subscribers").update({ status: "unsubscribed" }).eq("id", id)
  return NextResponse.json({ ok: true })
}
