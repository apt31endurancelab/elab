export type WidgetId =
  | "stats"
  | "sales_chart"
  | "top_affiliates"
  | "upcoming_agenda"
  | "recent_tasks"
  | "recent_invoices"

export type WidgetSize = "full" | "half"

export type WidgetConfig = {
  id: WidgetId
  size: WidgetSize
  visible: boolean
}

export const WIDGET_META: Record<WidgetId, { title: string; description: string; defaultSize: WidgetSize }> = {
  stats: { title: "Resumen", description: "KPIs principales del negocio", defaultSize: "full" },
  sales_chart: { title: "Ventas", description: "Evolución con granularidad ajustable", defaultSize: "half" },
  top_affiliates: { title: "Top Afiliados", description: "Mayores generadores de ventas", defaultSize: "half" },
  upcoming_agenda: { title: "Próximamente", description: "Vencimientos y tareas próximas", defaultSize: "half" },
  recent_tasks: { title: "Tareas recientes", description: "Últimas tareas creadas", defaultSize: "half" },
  recent_invoices: { title: "Facturas recientes", description: "Últimas facturas emitidas", defaultSize: "half" },
}

export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: "stats", size: "full", visible: true },
  { id: "sales_chart", size: "half", visible: true },
  { id: "top_affiliates", size: "half", visible: true },
  { id: "upcoming_agenda", size: "half", visible: true },
  { id: "recent_tasks", size: "half", visible: true },
  { id: "recent_invoices", size: "full", visible: true },
]

const STORAGE_KEY = "endurancelab_dashboard_layout"

export function loadLayout(): WidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_LAYOUT
    const parsed = JSON.parse(raw) as WidgetConfig[]
    // Merge so new widgets added later still appear (default to visible)
    const known = new Set(parsed.map(w => w.id))
    const missing = DEFAULT_LAYOUT.filter(w => !known.has(w.id))
    return [...parsed.filter(w => w.id in WIDGET_META), ...missing]
  } catch {
    return DEFAULT_LAYOUT
  }
}

export function saveLayout(layout: WidgetConfig[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {}
}
