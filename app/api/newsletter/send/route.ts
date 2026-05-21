import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email"

const FEATURE_DISABLED = () => new NextResponse(null, { status: 404 })

// POST /api/newsletter/send
// Body: { subject: string; body: string; segments?: string[]; test_email?: string }
// If test_email is provided, sends a single test message and does not record a campaign.

export async function POST(request: Request) {
  if (true) return FEATURE_DISABLED()
  const body = await request.json().catch(() => ({})) as {
    subject?: string
    body?: string
    segments?: string[]
    test_email?: string
  }
  if (!body.subject || !body.body) {
    return NextResponse.json({ error: "subject y body son requeridos" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  // Test send path
  if (body.test_email) {
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; line-height:1.6; max-width:600px;">${body.body.replace(/\n/g, "<br>")}</div>`
    const result = await sendEmail({ to: body.test_email, subject: body.subject, html, replyTo: user.email || undefined })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
    return NextResponse.json({ ok: true, test: true })
  }

  // Build recipient list
  let query = supabase
    .from("newsletter_subscribers")
    .select("id, email, full_name")
    .eq("status", "active")

  if (body.segments && body.segments.length > 0) {
    query = query.contains("segments", body.segments)
  }

  const { data: subscribers, error: subsError } = await query
  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 })
  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ error: "No hay suscriptores activos para los segmentos elegidos" }, { status: 400 })
  }

  // Create campaign record
  const { data: campaign, error: campaignError } = await supabase
    .from("newsletter_campaigns")
    .insert({
      user_id: user.id,
      subject: body.subject,
      body: body.body,
      segments: body.segments || [],
      recipient_count: subscribers.length,
      status: "sending",
    })
    .select("id")
    .single()
  if (campaignError || !campaign) return NextResponse.json({ error: campaignError?.message || "DB error" }, { status: 500 })

  let sent = 0
  let failed = 0
  for (const sub of subscribers) {
    const personalized = body.body!.replace(/\{name\}/g, sub.full_name || "amigo")
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; line-height:1.6; max-width:600px;">
      ${personalized.replace(/\n/g, "<br>")}
      <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />
      <p style="font-size:11px; color:#888;">
        Recibes este email porque estás suscrito a las novedades de Endurance Lab.
      </p>
    </div>`
    const r = await sendEmail({ to: sub.email, subject: body.subject!, html, replyTo: user.email || undefined })
    if (r.ok) sent += 1; else failed += 1
  }

  await supabase
    .from("newsletter_campaigns")
    .update({
      sent_count: sent,
      failed_count: failed,
      status: failed === 0 ? "sent" : sent === 0 ? "failed" : "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaign.id)

  return NextResponse.json({ ok: true, campaign_id: campaign.id, sent, failed })
}
