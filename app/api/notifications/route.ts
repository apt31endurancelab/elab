import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const FEATURE_DISABLED = () => new NextResponse(null, { status: 404 })

type AlertItem = {
  id: string
  level: "critical" | "warning" | "info"
  type: "invoice_overdue" | "invoice_due_soon" | "task_overdue" | "task_due_soon"
  title: string
  description?: string
  href?: string
  date: string
}

export async function GET() {
  if (true) return FEATURE_DISABLED()
  let supabase
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ alerts: [], configured: false })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ alerts: [] })

  const todayStr = new Date().toISOString().split("T")[0]
  const in7 = new Date()
  in7.setDate(in7.getDate() + 7)
  const in7Str = in7.toISOString().split("T")[0]

  const alerts: AlertItem[] = []

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, type, status, issue_date, validity_days, total, clients(name)")
    .in("status", ["draft", "sent", "overdue"])

  for (const inv of invoices || []) {
    const due = new Date(inv.issue_date)
    due.setDate(due.getDate() + inv.validity_days)
    const dueStr = due.toISOString().split("T")[0]
    if (dueStr < todayStr) {
      const client = (inv.clients as unknown as { name: string } | null)?.name || ""
      alerts.push({
        id: `inv-${inv.id}`,
        level: "critical",
        type: "invoice_overdue",
        title: `Factura vencida: ${inv.invoice_number}`,
        description: `${client} — Vencida desde ${dueStr}`,
        href: `/dashboard/invoices`,
        date: dueStr,
      })
    } else if (dueStr <= in7Str) {
      const client = (inv.clients as unknown as { name: string } | null)?.name || ""
      alerts.push({
        id: `inv-${inv.id}`,
        level: "warning",
        type: "invoice_due_soon",
        title: `Vence pronto: ${inv.invoice_number}`,
        description: `${client} — Vence ${dueStr}`,
        href: `/dashboard/invoices`,
        date: dueStr,
      })
    }
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, due_date, assigned_to")
    .neq("status", "completed")
    .not("due_date", "is", null)

  for (const t of tasks || []) {
    if (!t.due_date) continue
    if (t.due_date < todayStr) {
      alerts.push({
        id: `task-${t.id}`,
        level: "critical",
        type: "task_overdue",
        title: `Tarea vencida: ${t.title}`,
        description: t.assigned_to ? `Asignada a ${t.assigned_to}` : undefined,
        href: `/dashboard/tasks`,
        date: t.due_date,
      })
    } else if (t.due_date <= in7Str) {
      alerts.push({
        id: `task-${t.id}`,
        level: "warning",
        type: "task_due_soon",
        title: `Tarea próxima: ${t.title}`,
        description: t.assigned_to ? `Asignada a ${t.assigned_to} — ${t.due_date}` : t.due_date,
        href: `/dashboard/tasks`,
        date: t.due_date,
      })
    }
  }

  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 } as const
    if (order[a.level] !== order[b.level]) return order[a.level] - order[b.level]
    return a.date.localeCompare(b.date)
  })

  return NextResponse.json({ alerts })
}
