"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FileDown, Building2 } from "lucide-react"
import Link from "next/link"
import { openInvoicePdf } from "./invoice-pdf"
import { invoiceStatusBadgeClass, invoiceStatusLabel, invoiceTypeLabel } from "@/lib/invoice-status"

export type InvoiceItem = {
  id?: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export type InvoiceWithClient = {
  id: string
  client_id: string
  client_name: string
  client_rut?: string
  client_address?: string
  client_phone?: string
  client_contact?: string
  client_email?: string
  invoice_number: string
  type: "cotizacion" | "proforma" | "factura"
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
  items: InvoiceItem[]
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: InvoiceWithClient | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {invoiceTypeLabel(invoice.type)} {invoice.invoice_number}
              <Badge variant="outline" className={invoiceStatusBadgeClass(invoice.status)}>
                {invoiceStatusLabel(invoice.status)}
              </Badge>
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openInvoicePdf(invoice)}
              className="shrink-0"
            >
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Link
                href={`/dashboard/clients/${invoice.client_id}`}
                className="font-medium hover:underline inline-flex items-center gap-1.5 text-primary"
                onClick={() => onOpenChange(false)}
              >
                <Building2 className="h-3.5 w-3.5" />
                {invoice.client_name}
              </Link>
              {invoice.client_rut && <p className="text-muted-foreground">{invoice.client_rut}</p>}
              {invoice.client_address && <p className="text-muted-foreground">{invoice.client_address}</p>}
              {invoice.client_email && <p className="text-muted-foreground">{invoice.client_email}</p>}
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">
                Fecha: {new Date(invoice.issue_date).toLocaleDateString("es-CL")}
              </p>
              <p className="text-muted-foreground">Validez: {invoice.validity_days} días</p>
              {invoice.is_recurring && (
                <p className="text-muted-foreground">
                  Recurrente: {invoice.recurring_frequency === "monthly" ? "Mensual" : invoice.recurring_frequency === "quarterly" ? "Trimestral" : "Anual"}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Descripción</th>
                  <th className="text-right py-2 font-medium">Cant.</th>
                  <th className="text-right py-2 font-medium">Precio</th>
                  <th className="text-right py-2 font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} className="border-b border-muted">
                    <td className="py-2">{item.description}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">{formatCLP(item.unit_price)}</td>
                    <td className="text-right py-2">{formatCLP(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex justify-between w-48">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCLP(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between w-48">
              <span className="text-muted-foreground">IVA {invoice.tax_rate}%</span>
              <span>{formatCLP(invoice.tax_amount)}</span>
            </div>
            <Separator className="w-48" />
            <div className="flex justify-between w-48 font-bold">
              <span>Total</span>
              <span>{formatCLP(invoice.total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
