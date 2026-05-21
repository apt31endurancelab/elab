import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    id?: string
    question?: string
    answer?: string
    category?: string
    tags?: string[]
    source?: string
    is_published?: boolean
  }
  if (!body.question || !body.answer) {
    return NextResponse.json({ error: "question y answer son requeridos" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  if (body.id) {
    const { error } = await supabase.from("faq_entries").update({
      question: body.question,
      answer: body.answer,
      category: body.category || null,
      tags: body.tags || [],
      source: body.source || null,
      is_published: body.is_published ?? true,
      updated_at: new Date().toISOString(),
    }).eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase.from("faq_entries").insert({
    user_id: user.id,
    question: body.question,
    answer: body.answer,
    category: body.category || null,
    tags: body.tags || [],
    source: body.source || null,
    is_published: body.is_published ?? true,
  })
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
  await supabase.from("faq_entries").delete().eq("id", id)
  return NextResponse.json({ ok: true })
}
