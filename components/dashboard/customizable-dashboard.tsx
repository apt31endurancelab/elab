"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { DollarSign, Users, TrendingUp, CheckSquare, GripVertical, Settings2, RotateCcw, FileText } from "lucide-react"
import Link from "next/link"
import {
  type WidgetId,
  type WidgetConfig,
  WIDGET_META,
  DEFAULT_LAYOUT,
  loadLayout,
  saveLayout,
} from "@/lib/dashboard-layout"
import { cn } from "@/lib/utils"
import { DashboardCharts, type RawSale } from "./charts"
import { UpcomingAgenda, type AgendaInvoice, type AgendaTask } from "./upcoming-agenda"

type Stats = {
  totalSales: number
  activeAffiliates: number
  pendingCommissions: number
  pendingTasks: number
}

type RecentTask = {
  id: string
  title: string
  status: string
  due_date: string | null
  assigned_to: string | null
}

type RecentInvoice = {
  id: string
  invoice_number: string
  client_name: string
  total: number
  status: string
  issue_date: string
}

export function CustomizableDashboard({
  stats,
  rawSales,
  affiliatesData,
  agenda,
  recentTasks,
  recentInvoices,
}: {
  stats: Stats
  rawSales?: RawSale[]
  affiliatesData?: { name: string; total_sales?: number; ventas?: number }[]
  agenda: { invoices: AgendaInvoice[]; tasks: AgendaTask[] }
  recentTasks: RecentTask[]
  recentInvoices: RecentInvoice[]
}) {
  const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_LAYOUT)
  const [hydrated, setHydrated] = useState(false)
  const [draggingId, setDraggingId] = useState<WidgetId | null>(null)
  const [overId, setOverId] = useState<WidgetId | null>(null)

  useEffect(() => {
    setLayout(loadLayout())
    setHydrated(true)
  }, [])

  const updateLayout = (next: WidgetConfig[]) => {
    setLayout(next)
    saveLayout(next)
  }

  const toggleVisible = (id: WidgetId) => {
    updateLayout(layout.map(w => w.id === id ? { ...w, visible: !w.visible } : w))
  }

  const toggleSize = (id: WidgetId) => {
    updateLayout(layout.map(w => w.id === id ? { ...w, size: w.size === "full" ? "half" : "full" } : w))
  }

  const reset = () => updateLayout(DEFAULT_LAYOUT)

  const handleDrop = (targetId: WidgetId) => {
    if (!draggingId || draggingId === targetId) return
    const fromIdx = layout.findIndex(w => w.id === draggingId)
    const toIdx = layout.findIndex(w => w.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...layout]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    updateLayout(next)
    setDraggingId(null)
    setOverId(null)
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="h-24" /></Card>
          ))}
        </div>
      </div>
    )
  }

  const visibleWidgets = layout.filter(w => w.visible)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-1" />
              Personalizar
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Personalizar dashboard</SheetTitle>
              <SheetDescription>
                Activa/desactiva widgets, cambia su tamaño y arrastra desde el icono ≡ para reordenar.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              {layout.map((w) => {
                const meta = WIDGET_META[w.id]
                return (
                  <div key={w.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{meta.title}</p>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                      <Switch checked={w.visible} onCheckedChange={() => toggleVisible(w.id)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Tamaño</Label>
                      <Button
                        variant={w.size === "half" ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleSize(w.id)}
                      >
                        {w.size === "half" ? "Mitad" : "Completo"}
                      </Button>
                    </div>
                  </div>
                )
              })}
              <Button variant="outline" size="sm" className="w-full" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Restaurar layout por defecto
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {visibleWidgets.map((w) => (
          <div
            key={w.id}
            className={cn(
              w.size === "full" ? "lg:col-span-2" : "lg:col-span-1",
              draggingId === w.id && "opacity-40",
              overId === w.id && draggingId && draggingId !== w.id && "ring-2 ring-primary ring-offset-2 rounded-lg",
            )}
            draggable
            onDragStart={() => setDraggingId(w.id)}
            onDragEnd={() => { setDraggingId(null); setOverId(null) }}
            onDragOver={(e) => { e.preventDefault(); setOverId(w.id) }}
            onDragLeave={() => setOverId((c) => (c === w.id ? null : c))}
            onDrop={() => handleDrop(w.id)}
          >
            <WidgetRenderer
              widget={w}
              stats={stats}
              rawSales={rawSales}
              affiliatesData={affiliatesData}
              agenda={agenda}
              recentTasks={recentTasks}
              recentInvoices={recentInvoices}
            />
          </div>
        ))}
      </div>

      {visibleWidgets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay widgets visibles. Abre &quot;Personalizar&quot; para activarlos.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function WidgetRenderer({
  widget,
  stats,
  rawSales,
  affiliatesData,
  agenda,
  recentTasks,
  recentInvoices,
}: {
  widget: WidgetConfig
  stats: Stats
  rawSales?: RawSale[]
  affiliatesData?: { name: string; total_sales?: number; ventas?: number }[]
  agenda: { invoices: AgendaInvoice[]; tasks: AgendaTask[] }
  recentTasks: RecentTask[]
  recentInvoices: RecentInvoice[]
}) {
  switch (widget.id) {
    case "stats":
      return <StatsWidget stats={stats} />
    case "sales_chart":
      return (
        <DragWrap title={WIDGET_META[widget.id].title}>
          <DashboardCharts rawSales={rawSales} affiliatesData={undefined} salesData={undefined} />
        </DragWrap>
      )
    case "top_affiliates":
      return <TopAffiliatesWidget data={affiliatesData} />
    case "upcoming_agenda":
      return (
        <DragWrap title={WIDGET_META[widget.id].title}>
          <UpcomingAgenda
            invoices={agenda.invoices}
            tasks={agenda.tasks}
            limit={8}
            showExport={false}
            title=""
            description=""
          />
        </DragWrap>
      )
    case "recent_tasks":
      return <RecentTasksWidget tasks={recentTasks} />
    case "recent_invoices":
      return <RecentInvoicesWidget invoices={recentInvoices} />
  }
}

function DragWrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {title && <span className="sr-only">{title}</span>}
      {children}
    </div>
  )
}

function StatsWidget({ stats }: { stats: Stats }) {
  const items = [
    { title: "Ventas Totales", value: `$${stats.totalSales.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-emerald-500" },
    { title: "Afiliados Activos", value: stats.activeAffiliates.toString(), icon: Users, color: "text-blue-500" },
    { title: "Comisiones Pendientes", value: `$${stats.pendingCommissions.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-orange-500" },
    { title: "Tareas Pendientes", value: stats.pendingTasks.toString(), icon: CheckSquare, color: "text-violet-500" },
  ]
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 cursor-grab active:cursor-grabbing">
      {items.map((s) => (
        <Card key={s.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
            <s.icon className={cn("h-4 w-4", s.color)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TopAffiliatesWidget({ data }: { data?: { name: string; total_sales?: number; ventas?: number }[] }) {
  const list = (data || []).slice(0, 5)
  return (
    <Card className="cursor-grab active:cursor-grabbing">
      <CardHeader>
        <CardTitle className="text-base font-medium">Top Afiliados</CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin datos todavía</p>
        ) : (
          <div className="space-y-2">
            {list.map((a, i) => {
              const total = a.total_sales || a.ventas || 0
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded-md border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                    <span className="text-sm font-medium">{a.name}</span>
                  </div>
                  <span className="text-sm font-mono">${total.toLocaleString("es-ES")}</span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentTasksWidget({ tasks }: { tasks: RecentTask[] }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing">
      <CardHeader>
        <CardTitle className="text-base font-medium">Tareas recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin tareas todavía</p>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 6).map(t => (
              <Link key={t.id} href="/dashboard/tasks" className="block">
                <div className="flex items-center justify-between p-2 rounded-md border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={cn("text-sm truncate", t.status === "completed" && "text-muted-foreground")}>
                      {t.title}
                    </span>
                  </div>
                  {t.assigned_to && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{t.assigned_to}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentInvoicesWidget({ invoices }: { invoices: RecentInvoice[] }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing">
      <CardHeader>
        <CardTitle className="text-base font-medium">Facturas recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin facturas todavía</p>
        ) : (
          <div className="space-y-2">
            {invoices.slice(0, 6).map(inv => (
              <Link key={inv.id} href="/dashboard/invoices" className="block">
                <div className="flex items-center justify-between p-2 rounded-md border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-mono truncate">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.client_name}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono shrink-0 ml-2">
                    ${Number(inv.total).toLocaleString("es-ES")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
