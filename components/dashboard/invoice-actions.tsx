"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logActivityClient } from "@/lib/activity-log-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontal,
  Trash2,
  Eye,
  FileDown,
  CheckCircle2,
  Send,
  Clock,
  XCircle,
} from "lucide-react"
import { type InvoiceWithClient } from "./invoice-detail-dialog"

const INVOICES_STORAGE_KEY = "endurancelab_invoices"

function loadInvoicesFromStorage(): InvoiceWithClient[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(INVOICES_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

function saveInvoicesToStorage(invoices: InvoiceWithClient[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices))
}

export function InvoiceActions({
  invoice,
  isDemo = false,
  onView,
  onPdf,
}: {
  invoice: InvoiceWithClient
  isDemo?: boolean
  onView?: () => void
  onPdf?: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const statusActivityMap: Record<string, { type: string; verb: string }> = {
    sent: { type: "invoice_sent", verb: "enviada" },
    paid: { type: "invoice_paid", verb: "pagada" },
    overdue: { type: "invoice_overdue", verb: "marcada como vencida" },
    cancelled: { type: "invoice_sent", verb: "cancelada" },
  }

  const updateStatus = async (status: string) => {
    const activityInfo = statusActivityMap[status]
    const typeLabel = invoice.type === "cotizacion" ? "Cotización" : "Factura"

    if (isDemo) {
      const invoices = loadInvoicesFromStorage()
      saveInvoicesToStorage(invoices.map(inv =>
        inv.id === invoice.id ? { ...inv, status } : inv
      ))

      // Log activity in demo
      if (activityInfo) {
        try {
          const stored = localStorage.getItem("endurancelab_activities")
          const acts = stored ? JSON.parse(stored) : []
          acts.unshift({
            id: `act-${Date.now()}`,
            client_id: invoice.client_id,
            invoice_id: invoice.id,
            type: activityInfo.type,
            title: `${typeLabel} ${invoice.invoice_number} ${activityInfo.verb}`,
            description: null,
            is_reminder: false,
            reminder_date: null,
            reminder_completed: false,
            created_at: new Date().toISOString(),
          })
          localStorage.setItem("endurancelab_activities", JSON.stringify(acts))
        } catch {}
      }

      window.dispatchEvent(new Event("invoices-updated"))
      router.refresh()
      return
    }

    setLoading(true)
    const supabase = createClient()
    await supabase.from("invoices").update({ status }).eq("id", invoice.id)

    // Log activity in Supabase
    if (activityInfo) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("client_activities").insert({
          user_id: user.id,
          client_id: invoice.client_id,
          invoice_id: invoice.id,
          type: activityInfo.type,
          title: `${typeLabel} ${invoice.invoice_number} ${activityInfo.verb}`,
        })
      }
    }

    const actionMap: Record<string, "invoice.sent" | "invoice.paid"> = { sent: "invoice.sent", paid: "invoice.paid" }
    const logAction = actionMap[status]
    if (logAction) {
      logActivityClient({ action: logAction, entityType: "invoice", entityId: invoice.id, entityName: `${typeLabel} ${invoice.invoice_number}`, metadata: { client_name: invoice.client_name || null } })
    }

    setLoading(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar esta factura?")) return

    if (isDemo) {
      const invoices = loadInvoicesFromStorage()
      saveInvoicesToStorage(invoices.filter(inv => inv.id !== invoice.id))
      window.dispatchEvent(new Event("invoices-updated"))
      router.refresh()
      return
    }

    setLoading(true)
    const supabase = createClient()
    await supabase.from("invoices").delete().eq("id", invoice.id)
    setLoading(false)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalle
          </DropdownMenuItem>
        )}
        {onPdf && (
          <DropdownMenuItem onClick={onPdf}>
            <FileDown className="h-4 w-4 mr-2" />
            Generar PDF
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {invoice.status !== "draft" && (
          <DropdownMenuItem onClick={() => updateStatus("draft")}>
            <Clock className="h-4 w-4 mr-2" />
            Marcar Borrador
          </DropdownMenuItem>
        )}
        {invoice.status !== "sent" && (
          <DropdownMenuItem onClick={() => updateStatus("sent")}>
            <Send className="h-4 w-4 mr-2" />
            Marcar Enviada
          </DropdownMenuItem>
        )}
        {invoice.status !== "paid" && (
          <DropdownMenuItem onClick={() => updateStatus("paid")}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Marcar Pagada
          </DropdownMenuItem>
        )}
        {invoice.status !== "cancelled" && (
          <DropdownMenuItem onClick={() => updateStatus("cancelled")}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
