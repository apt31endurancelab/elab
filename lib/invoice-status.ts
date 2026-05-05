export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | string
export type InvoiceType = "cotizacion" | "proforma" | "factura" | string

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  cotizacion: "Cotización",
  proforma: "Proforma",
  factura: "Factura",
}

export function invoiceTypeLabel(type: InvoiceType): string {
  return INVOICE_TYPE_LABELS[type] || type
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Cancelada",
}

// Returns Tailwind classes intended to be passed to <Badge variant="outline" className={...}>
// so each status reads at a glance.
export function invoiceStatusBadgeClass(status: InvoiceStatus): string {
  switch (status) {
    case "draft":
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
    case "sent":
      return "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
    case "paid":
      return "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    case "overdue":
      return "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
    case "cancelled":
      return "border-zinc-300 bg-zinc-100 text-zinc-500 line-through dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500"
    default:
      return "border-muted bg-muted text-muted-foreground"
  }
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUS_LABELS[status] || status
}
