import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email"

// POST /api/clients/revive
// Body: { client_ids: string[]; subject: string; body: string }
// Sends a templated outreach email to the given clients (only those with an email).
// Logs a "client_activity" entry per send.

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    client_ids?: string[]
    subject?: string
    body?: string
  }

  if (!body.client_ids?.length || !body.subject || !body.body) {
    return NextResponse.json({ error: "client_ids, subject y body son requeridos" }, { status: 400 })
  }

  let supabase
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: "Supabase no está configurado" }, { status: 500 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, contact_person")
    .in("id", body.client_ids)

  const recipients = (clients || []).filter(c => c.email)
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Ninguno de los clientes seleccionados tiene email" }, { status: 400 })
  }

  let sent = 0
  const errors: { client_id: string; error: string }[] = []

  for (const client of recipients) {
    const personalizedBody = body.body!
      .replace(/\{name\}/g, client.contact_person || client.name)
      .replace(/\{client_name\}/g, client.name)
    const personalizedSubject = body.subject!
      .replace(/\{name\}/g, client.contact_person || client.name)
      .replace(/\{client_name\}/g, client.name)

    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; line-height:1.6; max-width:600px;">
      ${personalizedBody.replace(/\n/g, "<br>")}
    </div>`

    const result = await sendEmail({
      to: client.email!,
      subject: personalizedSubject,
      html,
      replyTo: user.email || undefined,
    })

    if (result.ok) {
      sent += 1
      await supabase.from("client_activities").insert({
        user_id: user.id,
        client_id: client.id,
        type: "email_sent",
        title: `Outreach: ${personalizedSubject}`,
        description: personalizedBody.slice(0, 280),
      })
    } else {
      errors.push({ client_id: client.id, error: result.error })
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    sent,
    skipped: (body.client_ids?.length || 0) - recipients.length,
    errors,
  })
}
