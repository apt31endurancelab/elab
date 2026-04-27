"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CalendarDays,
  Send,
  Ban,
  FileDown,
  Building2,
} from "lucide-react"
import { openInvoicePdf } from "./invoice-pdf"

export type CalendarInvoice = {
  id: string
  client_id: string
  client_name: string
  client_rut?: string
  client_address?: string
  client_phone?: string
  client_contact?: string
  client_email?: string
  invoice_number: string
  type: "cotizacion" | "factura"
  status: string
  issue_date: string
  validity_days: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  is_recurring: boolean
  recurring_frequency: string | null
  notes: string | null
  created_at: string
  items: { description: string; quantity: number; unit_price: number; amount: number }[]
}

type CalendarEvent = {
  date: string
  type: "issued" | "due" | "paid" | "overdue" | "recurring_next"
  invoice: CalendarInvoice
  label: string
}

const eventConfig: Record<string, { color: string; bg: string; icon: typeof FileText; label: string }> = {
  issued: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/15 border-blue-500/30", icon: FileText, label: "Emitida" },
  due: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/15 border-orange-500/30", icon: Clock, label: "Vencimiento" },
  paid: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: CheckCircle2, label: "Cobrada" },
  overdue: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/15 border-red-500/30", icon: AlertTriangle, label: "Vencida" },
  recurring_next: { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/15 border-purple-500/30", icon: RefreshCw, label: "Recurrente" },
}

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Cancelada",
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function getNextRecurringDate(issueDate: string, frequency: string | null): string | null {
  if (!frequency) return null
  const d = new Date(issueDate)
  const now = new Date()
  while (d <= now) {
    if (frequency === "monthly") d.setMonth(d.getMonth() + 1)
    else if (frequency === "quarterly") d.setMonth(d.getMonth() + 3)
    else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1)
  }
  return d.toISOString().split("T")[0]
}

function generateEvents(invoices: CalendarInvoice[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const inv of invoices) {
    events.push({ date: inv.issue_date, type: "issued", invoice: inv, label: `Emitida: ${inv.invoice_number}` })

    const dueDate = addDays(inv.issue_date, inv.validity_days)
    if (inv.status !== "paid" && inv.status !== "cancelled") {
      const isOverdue = new Date(dueDate) < new Date()
      events.push({
        date: dueDate,
        type: isOverdue ? "overdue" : "due",
        invoice: inv,
        label: isOverdue ? `Vencida: ${inv.invoice_number}` : `Vence: ${inv.invoice_number}`,
      })
    }

    if (inv.status === "paid") {
      events.push({ date: dueDate, type: "paid", invoice: inv, label: `Cobrada: ${inv.invoice_number}` })
    }

    if (inv.is_recurring && inv.recurring_frequency) {
      const nextDate = getNextRecurringDate(inv.issue_date, inv.recurring_frequency)
      if (nextDate) {
        const freqLabel = inv.recurring_frequency === "monthly" ? "mensual" : inv.recurring_frequency === "quarterly" ? "trimestral" : "anual"
        events.push({ date: nextDate, type: "recurring_next", invoice: inv, label: `Próxima ${freqLabel}: ${inv.invoice_number}` })
      }
    }
  }
  return events
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function InvoiceCalendar({ invoices }: { invoices: CalendarInvoice[] }) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const events = useMemo(() => generateEvents(invoices), [invoices])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const event of events) {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    }
    return map
  }, [events])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  const goToToday = () => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()) }

  const handleDateClick = (dateStr: string) => {
    if (eventsByDate[dateStr]?.length) { setSelectedDate(dateStr); setDetailOpen(true) }
  }

  const todayStr = today.toISOString().split("T")[0]

  // Build grid cells
  const cells: { day: number; dateStr: string; isCurrentMonth: boolean }[] = []
  const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = currentMonth === 0 ? 11 : currentMonth - 1
    const y = currentMonth === 0 ? currentYear - 1 : currentYear
    cells.push({ day: d, dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth === 11 ? 0 : currentMonth + 1
    const y = currentMonth === 11 ? currentYear + 1 : currentYear
    cells.push({ day: d, dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: false })
  }

  const monthEvents = events.filter(e => {
    const d = new Date(e.date)
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth
  })

  const monthSummary = {
    issued: monthEvents.filter(e => e.type === "issued").length,
    due: monthEvents.filter(e => e.type === "due").length,
    paid: monthEvents.filter(e => e.type === "paid").length,
    overdue: monthEvents.filter(e => e.type === "overdue").length,
    recurring: monthEvents.filter(e => e.type === "recurring_next").length,
  }

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : []

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Emitidas", count: monthSummary.issued, type: "issued" as const },
          { label: "Vencimientos", count: monthSummary.due, type: "due" as const },
          { label: "Cobradas", count: monthSummary.paid, type: "paid" as const },
          { label: "Vencidas", count: monthSummary.overdue, type: "overdue" as const },
          { label: "Recurrentes", count: monthSummary.recurring, type: "recurring_next" as const },
        ].map(item => {
          const config = eventConfig[item.type]
          const Icon = config.icon
          return (
            <Card key={item.type}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn("rounded-lg p-2", config.bg)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg font-semibold min-w-[180px] text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </CardTitle>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <CalendarDays className="h-4 w-4 mr-1" />
            Hoy
          </Button>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex gap-4 flex-wrap mb-4 text-xs">
            {Object.entries(eventConfig).map(([key, config]) => {
              const Icon = config.icon
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <Icon className={cn("h-3 w-3", config.color)} />
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              )
            })}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {DAY_NAMES.map(day => (
              <div key={day} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}

            {cells.map((cell, i) => {
              const dayEvents = eventsByDate[cell.dateStr] || []
              const isToday = cell.dateStr === todayStr
              const hasEvents = dayEvents.length > 0

              return (
                <div
                  key={i}
                  onClick={() => handleDateClick(cell.dateStr)}
                  className={cn(
                    "bg-background min-h-[100px] p-1.5 transition-colors",
                    !cell.isCurrentMonth && "bg-muted/50",
                    hasEvents && "cursor-pointer hover:bg-accent/50",
                    isToday && "ring-2 ring-primary ring-inset",
                  )}
                >
                  <div className={cn(
                    "text-sm mb-1 font-medium",
                    !cell.isCurrentMonth && "text-muted-foreground/50",
                    isToday && "text-primary font-bold",
                  )}>
                    {cell.day}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event, j) => {
                      const config = eventConfig[event.type]
                      const Icon = config.icon
                      return (
                        <div key={j} className={cn("flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight border", config.bg)}>
                          <Icon className={cn("h-2.5 w-2.5 shrink-0", config.color)} />
                          <span className={cn("truncate", config.color)}>{event.invoice.invoice_number}</span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming events list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Próximos Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const upcoming = events
              .filter(e => new Date(e.date) >= new Date(todayStr))
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 10)

            if (upcoming.length === 0) {
              return <p className="text-sm text-muted-foreground text-center py-4">No hay eventos próximos</p>
            }

            return (
              <div className="space-y-2">
                {upcoming.map((event, i) => {
                  const config = eventConfig[event.type]
                  const Icon = config.icon
                  const daysUntil = Math.ceil(
                    (new Date(event.date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
                  )

                  return (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg border">
                      <div className={cn("rounded-lg p-2", config.bg)}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{event.label}</p>
                        <Link
                          href={`/dashboard/clients/${event.invoice.client_id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {event.invoice.client_name}
                        </Link>
                        <span className="text-xs text-muted-foreground"> — {formatCLP(event.invoice.total)}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">
                          {new Date(event.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                        </p>
                        <p className={cn("text-xs", daysUntil === 0 ? "text-primary font-medium" : daysUntil <= 3 ? "text-orange-500" : "text-muted-foreground")}>
                          {daysUntil === 0 ? "Hoy" : daysUntil === 1 ? "Mañana" : `En ${daysUntil} días`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Day detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && new Date(selectedDate + "T12:00:00").toLocaleDateString("es-CL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedEvents.map((event, i) => {
              const config = eventConfig[event.type]
              const Icon = config.icon

              return (
                <div key={i} className={cn("p-3 rounded-lg border", config.bg)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => openInvoicePdf(event.invoice as any)}
                      >
                        <FileDown className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="font-mono font-medium">{event.invoice.invoice_number}</span>
                      <Badge variant={event.invoice.status === "paid" ? "default" : event.invoice.status === "overdue" ? "destructive" : "secondary"}>
                        {statusLabels[event.invoice.status] || event.invoice.status}
                      </Badge>
                    </div>
                    <Link
                      href={`/dashboard/clients/${event.invoice.client_id}`}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      onClick={() => setDetailOpen(false)}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {event.invoice.client_name}
                    </Link>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {event.invoice.type === "cotizacion" ? "Cotización" : "Factura"}
                      </span>
                      <span className="font-bold">{formatCLP(event.invoice.total)}</span>
                    </div>
                    {event.invoice.is_recurring && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <RefreshCw className="h-3 w-3" />
                        Recurrente: {event.invoice.recurring_frequency === "monthly" ? "Mensual" : event.invoice.recurring_frequency === "quarterly" ? "Trimestral" : "Anual"}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Emitida: {new Date(event.invoice.issue_date).toLocaleDateString("es-CL")} — Validez: {event.invoice.validity_days} días
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
