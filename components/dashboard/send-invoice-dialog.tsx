"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Send } from "lucide-react"
import { invoiceTypeLabel } from "@/lib/invoice-status"
import type { InvoiceWithClient } from "./invoice-detail-dialog"

export function SendInvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: InvoiceWithClient | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open && invoice) {
      setTo(invoice.client_email || "")
      setCc("")
      setSubject(`${invoiceTypeLabel(invoice.type)} ${invoice.invoice_number} — Endurance Lab`)
      setMessage(`Hola${invoice.client_contact ? ` ${invoice.client_contact}` : ""},\n\nAdjunto la ${invoiceTypeLabel(invoice.type).toLowerCase()} ${invoice.invoice_number}. Cualquier duda, respóndeme a este correo.\n\nSaludos,`)
      setError(null)
      setSuccess(false)
    }
  }, [open, invoice])

  if (!invoice) return null

  const handleSend = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, cc: cc || undefined, subject, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || `Error ${res.status}`)
      } else {
        setSuccess(true)
        router.refresh()
        setTimeout(() => onOpenChange(false), 1200)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar al cliente</DialogTitle>
          <DialogDescription>
            {invoiceTypeLabel(invoice.type)} {invoice.invoice_number} · {invoice.client_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor="send-to">Destinatario</FieldLabel>
            <Input
              id="send-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="cliente@empresa.com"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="send-cc">CC (opcional)</FieldLabel>
            <Input
              id="send-cc"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="otro@empresa.com"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="send-subject">Asunto</FieldLabel>
            <Input
              id="send-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="send-message">Mensaje</FieldLabel>
            <Textarea
              id="send-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No se pudo enviar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-emerald-500/50 bg-emerald-500/10">
              <Send className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-600 dark:text-emerald-400">Enviado</AlertTitle>
              <AlertDescription>La factura se marcó como enviada y se registró en el timeline.</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || !to}>
            {sending ? <Spinner className="mr-2 h-4 w-4" /> : <Send className="h-4 w-4 mr-1" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
