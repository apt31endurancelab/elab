"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileText, RefreshCw } from "lucide-react"
import { InvoiceActions } from "./invoice-actions"
import { InvoiceDetailDialog, type InvoiceWithClient } from "./invoice-detail-dialog"
import { openInvoicePdf } from "./invoice-pdf"

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Cancelada",
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "default",
  paid: "default",
  overdue: "destructive",
  cancelled: "outline",
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

export function InvoiceListClient({
  invoices,
  isDemo = false,
}: {
  invoices: InvoiceWithClient[]
  isDemo?: boolean
}) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithClient | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const handleView = (invoice: InvoiceWithClient) => {
    setSelectedInvoice(invoice)
    setDetailOpen(true)
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No hay facturas todavía</p>
        <p className="text-sm text-muted-foreground">Crea tu primera factura para empezar</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Recurrente</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow
              key={invoice.id}
              className="cursor-pointer"
              onClick={() => handleView(invoice)}
            >
              <TableCell className="font-mono text-sm font-medium">
                {invoice.invoice_number}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {invoice.type === "cotizacion" ? "Cotización" : "Factura"}
                </Badge>
              </TableCell>
              <TableCell>{invoice.client_name}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(invoice.issue_date).toLocaleDateString("es-CL")}
              </TableCell>
              <TableCell className="font-medium">
                {formatCLP(Number(invoice.total))}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariants[invoice.status] || "secondary"}>
                  {statusLabels[invoice.status] || invoice.status}
                </Badge>
              </TableCell>
              <TableCell>
                {invoice.is_recurring ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3" />
                    {invoice.recurring_frequency === "monthly" ? "Mensual" : invoice.recurring_frequency === "quarterly" ? "Trimestral" : "Anual"}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <InvoiceActions
                  invoice={invoice}
                  isDemo={isDemo}
                  onView={() => handleView(invoice)}
                  onPdf={() => openInvoicePdf(invoice)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <InvoiceDetailDialog
        invoice={selectedInvoice}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
