"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Building2,
  Download,
  type LucideIcon,
} from "lucide-react"
import { buildIcs, downloadIcs } from "@/lib/calendar-export"
import { invoiceTypeLabel } from "@/lib/invoice-status"

export type AgendaInvoice = {
  id: string
  client_id: string
  client_name: string
  invoice_number: string
  type: string
  status: string
  issue_date: string
  validity_days: number
  total: number
  is_recurring: boolean
  recurring_frequency: string | null
}

export type AgendaTask = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string
  assigned_to: string | null
}

type AgendaItem = {
  date: string
  type: "invoice_due" | "invoice_overdue" | "invoice_recurring" | "task" | "task_overdue"
  label: string
  invoice?: AgendaInvoice
  task?: AgendaTask
}

const itemConfig: Record<AgendaItem["type"], { icon: LucideIcon; color: string; bg: string; label: string }> = {
  invoice_due: { icon: Clock, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/15 border-orange-500/30", label: "Vencimiento factura" },
  invoice_overdue: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/15 border-red-500/30", label: "Factura vencida" },
  invoice_recurring: { icon: RefreshCw, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/15 border-purple-500/30", label: "Recurrente" },
  task: { icon: CheckSquare, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/15 border-cyan-500/30", label: "Tarea" },
  task_overdue: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/15 border-red-500/30", label: "Tarea vencida" },
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function nextRecurringDate(issueDate: string, frequency: string | null): string | null {
  if (!frequency) return null
  const d = new Date(issueDate)
  const now = new Date()
  while (d <= now) {
    if (frequency === "monthly") d.setMonth(d.getMonth() + 1)
    else if (frequency === "quarterly") d.setMonth(d.getMonth() + 3)
    else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1)
    else break
  }
  return d.toISOString().split("T")[0]
}

function buildAgenda(invoices: AgendaInvoice[], tasks: AgendaTask[]): AgendaItem[] {
  const todayStr = new Date().toISOString().split("T")[0]
  const items: AgendaItem[] = []
  for (const inv of invoices) {
    if (inv.status !== "paid" && inv.status !== "cancelled") {
      const due = addDays(inv.issue_date, inv.validity_days)
      const overdue = due < todayStr
      items.push({
        date: due,
        type: overdue ? "invoice_overdue" : "invoice_due",
        label: `${invoiceTypeLabel(inv.type)} ${inv.invoice_number}`,
        invoice: inv,
      })
    }
    if (inv.is_recurring && inv.recurring_frequency) {
      const next = nextRecurringDate(inv.issue_date, inv.recurring_frequency)
      if (next) items.push({
        date: next,
        type: "invoice_recurring",
        label: `Próxima recurrente: ${inv.invoice_number}`,
        invoice: inv,
      })
    }
  }
  for (const t of tasks) {
    if (t.status === "completed") continue
    const overdue = t.due_date < todayStr
    items.push({
      date: t.due_date,
      type: overdue ? "task_overdue" : "task",
      label: t.title,
      task: t,
    })
  }
  return items.filter((i) => i.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))
}

const priorityLabels: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" }

export function UpcomingAgenda({
  invoices,
  tasks,
  limit = 30,
  showExport = true,
  title = "Próximamente",
  description = "Lo que viene en los próximos días",
}: {
  invoices: AgendaInvoice[]
  tasks: AgendaTask[]
  limit?: number
  showExport?: boolean
  title?: string
  description?: string
}) {
  const items = useMemo(() => buildAgenda(invoices, tasks).slice(0, limit), [invoices, tasks, limit])
  const todayStr = new Date().toISOString().split("T")[0]

  const exportIcs = () => {
    const ics = buildIcs(items.map((i, idx) => ({
      uid: `${(i.invoice?.id || i.task?.id || idx)}-${i.type}@endurancelab`,
      date: i.date,
      summary: i.label,
      description: i.invoice
        ? `${invoiceTypeLabel(i.invoice.type)} ${i.invoice.invoice_number} — ${i.invoice.client_name} — ${formatCLP(i.invoice.total)}`
        : i.task?.description ?? undefined,
    })), "Endurance Lab — Agenda")
    downloadIcs(ics, `endurance-lab-agenda-${todayStr}.ics`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {showExport && items.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportIcs}>
            <Download className="h-4 w-4 mr-1" />
            Exportar .ics
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay nada agendado en el horizonte. Tiempo libre.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => {
              const cfg = itemConfig[item.type]
              const Icon = cfg.icon
              const daysUntil = Math.ceil((new Date(item.date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg border">
                  <div className={cn("rounded-lg p-2", cfg.bg)}>
                    <Icon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    {item.invoice && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link
                          href={`/dashboard/clients/${item.invoice.client_id}`}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Building2 className="h-3 w-3" />
                          {item.invoice.client_name}
                        </Link>
                        <span>— {formatCLP(item.invoice.total)}</span>
                      </div>
                    )}
                    {item.task && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.task.assigned_to && <span>{item.task.assigned_to}</span>}
                        <Badge
                          variant={item.task.priority === "high" ? "destructive" : item.task.priority === "medium" ? "secondary" : "outline"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {priorityLabels[item.task.priority] || item.task.priority}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">
                      {new Date(item.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                    </p>
                    <p className={cn("text-xs", daysUntil === 0 ? "text-primary font-medium" : daysUntil <= 3 ? "text-orange-500" : "text-muted-foreground")}>
                      {daysUntil < 0 ? `Hace ${Math.abs(daysUntil)} días` : daysUntil === 0 ? "Hoy" : daysUntil === 1 ? "Mañana" : `En ${daysUntil} días`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
