import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail, emailIsConfigured } from "@/lib/email"
import { sendSms, smsIsConfigured } from "@/lib/sms"

const FEATURE_DISABLED = () => new NextResponse(null, { status: 404 })

// Cron-friendly notification dispatcher.
// Protect with a shared secret: set NOTIFICATIONS_CRON_SECRET in env, send as
//   Authorization: Bearer <secret>
// or
//   ?secret=<secret>
//
// For now this fires a single email digest to NOTIFICATIONS_TO with all overdue +
// upcoming items. SMS path is wired but disabled by default. Extend per-user when
// the team grows beyond one inbox.

export async function POST(request: Request) {
  if (true) return FEATURE_DISABLED()
  return run(request)
}
export async function GET(request: Request) {
  if (true) return FEATURE_DISABLED()
  return run(request)
}

async function run(request: Request) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET
  if (secret) {
    const url = new URL(request.url)
    const auth = request.headers.get("authorization") || ""
    const provided = auth.startsWith("Bearer ") ? auth.slice(7) : url.searchParams.get("secret") || ""
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const to = process.env.NOTIFICATIONS_TO
  const smsTo = process.env.NOTIFICATIONS_SMS_TO

  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    return NextResponse.json({ error: "Supabase service role no configurado" }, { status: 500 })
  }

  const todayStr = new Date().toISOString().split("T")[0]
  const in3 = new Date()
  in3.setDate(in3.getDate() + 3)
  const in3Str = in3.toISOString().split("T")[0]

  // Overdue invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, type, status, issue_date, validity_days, total, clients(name)")
    .in("status", ["draft", "sent", "overdue"])

  type OverdueLine = { kind: "invoice_overdue" | "invoice_due_soon"; line: string; level: "critical" | "warning" }
  const lines: OverdueLine[] = []
  for (const inv of invoices || []) {
    const due = new Date(inv.issue_date)
    due.setDate(due.getDate() + inv.validity_days)
    const dueStr = due.toISOString().split("T")[0]
    const client = (inv.clients as unknown as { name: string } | null)?.name || ""
    if (dueStr < todayStr) {
      lines.push({ kind: "invoice_overdue", level: "critical", line: `🔴 VENCIDA: ${inv.invoice_number} (${client}) — vencía ${dueStr}` })
    } else if (dueStr <= in3Str) {
      lines.push({ kind: "invoice_due_soon", level: "warning", line: `🟠 VENCE PRONTO: ${inv.invoice_number} (${client}) — vence ${dueStr}` })
    }
  }

  // Overdue / soon tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, due_date, assigned_to")
    .neq("status", "completed")
    .not("due_date", "is", null)

  for (const t of tasks || []) {
    if (!t.due_date) continue
    if (t.due_date < todayStr) {
      lines.push({ kind: "invoice_overdue", level: "critical", line: `🔴 TAREA VENCIDA: ${t.title}${t.assigned_to ? ` — ${t.assigned_to}` : ""}` })
    } else if (t.due_date <= in3Str) {
      lines.push({ kind: "invoice_due_soon", level: "warning", line: `🟠 TAREA PRÓXIMA: ${t.title}${t.assigned_to ? ` — ${t.assigned_to}` : ""} (${t.due_date})` })
    }
  }

  if (lines.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "Nothing to notify" })
  }

  const summary = lines.map(l => l.line).join("\n")
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; line-height:1.6;">
    <h2 style="margin:0 0 12px;">Endurance Lab — Resumen diario</h2>
    <p style="color:#555;">${lines.length} alerta${lines.length === 1 ? "" : "s"} pendientes:</p>
    <pre style="background:#f5f5f5; padding:14px; border-radius:6px; white-space: pre-wrap;">${summary}</pre>
  </div>`

  const results: Record<string, unknown> = {}

  if (to && emailIsConfigured()) {
    results.email = await sendEmail({
      to,
      subject: `Endurance Lab: ${lines.filter(l => l.level === "critical").length} críticas, ${lines.filter(l => l.level === "warning").length} próximas`,
      html,
    })
  } else {
    results.email = { skipped: true, reason: !to ? "NOTIFICATIONS_TO no configurado" : "RESEND_API_KEY no configurado" }
  }

  if (smsTo && smsIsConfigured()) {
    const smsBody = lines.slice(0, 5).map(l => l.line).join("\n").slice(0, 1500)
    results.sms = await sendSms({ to: smsTo, body: smsBody })
  } else {
    results.sms = { skipped: true, reason: !smsTo ? "NOTIFICATIONS_SMS_TO no configurado" : "Twilio no configurado" }
  }

  return NextResponse.json({ ok: true, alerts: lines.length, results })
}
