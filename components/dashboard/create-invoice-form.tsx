"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { logActivityClient } from "@/lib/activity-log-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Save } from "lucide-react"

type ClientOption = {
  id: string
  name: string
  rut: string | null
  address: string | null
  phone: string | null
  contact_person: string | null
  email: string | null
}

type ProductOption = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  sku: string | null
}

type InvoiceLine = {
  product_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

const INVOICES_STORAGE_KEY = "endurancelab_invoices"

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

export function CreateInvoiceForm({
  clients,
  products,
  isDemo = false,
}: {
  clients: ClientOption[]
  products: ProductOption[]
  isDemo?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Invoice header
  const [clientId, setClientId] = useState("")
  const [type, setType] = useState<"cotizacion" | "factura">("cotizacion")
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
  const [validityDays, setValidityDays] = useState("30")
  const [taxRate, setTaxRate] = useState("19")
  const [notes, setNotes] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<string>("monthly")

  // Invoice lines
  const [lines, setLines] = useState<InvoiceLine[]>([
    { product_id: "", description: "", quantity: 1, unit_price: 0, amount: 0 },
  ])

  const selectedClient = clients.find(c => c.id === clientId)

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.amount, 0), [lines])
  const taxAmount = useMemo(() => Math.round(subtotal * (Number(taxRate) / 100)), [subtotal, taxRate])
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount])

  const addLine = () => {
    setLines([...lines, { product_id: "", description: "", quantity: 1, unit_price: 0, amount: 0 }])
  }

  const removeLine = (index: number) => {
    if (lines.length === 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof InvoiceLine, value: string | number) => {
    setLines(prev => {
      const updated = [...prev]
      const line = { ...updated[index] }

      if (field === "product_id") {
        const product = products.find(p => p.id === value)
        if (product) {
          line.product_id = product.id
          line.description = product.name
          line.unit_price = Number(product.price)
          line.amount = line.quantity * Number(product.price)
        }
      } else if (field === "description") {
        line.description = value as string
      } else if (field === "quantity") {
        line.quantity = Number(value) || 0
        line.amount = line.quantity * line.unit_price
      } else if (field === "unit_price") {
        line.unit_price = Number(value) || 0
        line.amount = line.quantity * line.unit_price
      }

      updated[index] = line
      return updated
    })
  }

  const generateInvoiceNumber = () => {
    const prefix = type === "cotizacion" ? "COT" : "FAC"
    const year = new Date().getFullYear()
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")
    return `${prefix}-${year}-${seq}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || lines.length === 0) return

    setLoading(true)
    const invoiceNumber = generateInvoiceNumber()

    if (isDemo) {
      const client = clients.find(c => c.id === clientId)
      const newInvoice = {
        id: `inv-${Date.now()}`,
        client_id: clientId,
        client_name: client?.name || "",
        client_rut: client?.rut,
        client_address: client?.address,
        client_phone: client?.phone,
        client_contact: client?.contact_person,
        client_email: client?.email,
        invoice_number: invoiceNumber,
        type,
        status: "draft",
        issue_date: issueDate,
        validity_days: Number(validityDays),
        subtotal,
        tax_rate: Number(taxRate),
        tax_amount: taxAmount,
        total,
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : null,
        notes: notes || null,
        created_at: new Date().toISOString(),
        items: lines.map(l => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.amount,
        })),
      }

      try {
        const stored = localStorage.getItem(INVOICES_STORAGE_KEY)
        const existing = stored ? JSON.parse(stored) : []
        localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify([newInvoice, ...existing]))
      } catch {}

      // Log activity in demo mode
      try {
        const typeLabel = type === "cotizacion" ? "Cotización" : "Factura"
        const actStored = localStorage.getItem("endurancelab_activities")
        const acts = actStored ? JSON.parse(actStored) : []
        acts.unshift({
          id: `act-${Date.now()}`,
          client_id: clientId,
          invoice_id: newInvoice.id,
          type: "invoice_created",
          title: `${typeLabel} ${invoiceNumber} creada`,
          description: `${typeLabel} por ${formatCLP(total)}`,
          is_reminder: false,
          reminder_date: null,
          reminder_completed: false,
          created_at: new Date().toISOString(),
        })
        localStorage.setItem("endurancelab_activities", JSON.stringify(acts))
      } catch {}

      setLoading(false)
      router.push("/dashboard/invoices")
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        client_id: clientId,
        invoice_number: invoiceNumber,
        type,
        status: "draft",
        issue_date: issueDate,
        validity_days: Number(validityDays),
        subtotal,
        tax_rate: Number(taxRate),
        tax_amount: taxAmount,
        total,
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : null,
        notes: notes || null,
      })
      .select("id")
      .single()

    if (invoiceError || !invoice) {
      console.error("Error creating invoice:", invoiceError)
      setLoading(false)
      return
    }

    // Create invoice items
    const items = lines.map(line => ({
      invoice_id: invoice.id,
      product_id: line.product_id || null,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      amount: line.amount,
    }))

    const { error: itemsError } = await supabase.from("invoice_items").insert(items)
    if (itemsError) {
      console.error("Error creating invoice items:", itemsError)
    }

    // Deduct stock for products
    for (const line of lines) {
      if (line.product_id && line.quantity > 0) {
        const product = products.find(p => p.id === line.product_id)
        if (product) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, product.stock - line.quantity) })
            .eq("id", line.product_id)
        }
      }
    }

    // Log activity
    const typeLabel = type === "cotizacion" ? "Cotización" : "Factura"
    await supabase.from("client_activities").insert({
      user_id: user.id,
      client_id: clientId,
      invoice_id: invoice.id,
      type: "invoice_created",
      title: `${typeLabel} ${invoiceNumber} creada`,
      description: `${typeLabel} por ${formatCLP(total)}`,
    })

    const selectedClient = clients.find(c => c.id === clientId)
    logActivityClient({ action: "invoice.created", entityType: "invoice", entityId: invoice.id, entityName: `${typeLabel} ${invoiceNumber}`, metadata: { client_name: selectedClient?.name || null, total } })

    setLoading(false)
    router.push("/dashboard/invoices")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel>Seleccionar Cliente</FieldLabel>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {selectedClient && (
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">{selectedClient.name}</p>
                {selectedClient.rut && <p className="text-muted-foreground">RUT: {selectedClient.rut}</p>}
                {selectedClient.contact_person && <p className="text-muted-foreground">Contacto: {selectedClient.contact_person}</p>}
                {selectedClient.email && <p className="text-muted-foreground">Email: {selectedClient.email}</p>}
                {selectedClient.phone && <p className="text-muted-foreground">Tel: {selectedClient.phone}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select value={type} onValueChange={(v: "cotizacion" | "factura") => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cotizacion">Cotización</SelectItem>
                    <SelectItem value="factura">Factura</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Fecha de Emisión</FieldLabel>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Validez (días)</FieldLabel>
                <Input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  min="1"
                />
              </Field>
              <Field>
                <FieldLabel>Impuesto (%)</FieldLabel>
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  min="0"
                  max="100"
                />
              </Field>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="recurring">Factura recurrente</Label>
            </div>

            {isRecurring && (
              <Field>
                <FieldLabel>Frecuencia</FieldLabel>
                <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Líneas de Factura</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir Línea
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <div className="col-span-4">Producto</div>
              <div className="col-span-3">Descripción</div>
              <div className="col-span-1">Cant.</div>
              <div className="col-span-2">Precio Unit.</div>
              <div className="col-span-1 text-right">Importe</div>
              <div className="col-span-1"></div>
            </div>

            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <Select
                    value={line.product_id || "custom"}
                    onValueChange={(v) => {
                      if (v === "custom") {
                        setLines(prev => {
                          const updated = [...prev]
                          updated[index] = { ...updated[index], product_id: "", description: "", unit_price: 0, amount: 0 }
                          return updated
                        })
                      } else {
                        updateLine(index, "product_id", v)
                      }
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Personalizado</SelectItem>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({formatCLP(Number(p.price))}) — Stock: {p.stock}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(index, "description", e.target.value)}
                    placeholder="Descripción"
                    className="text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    type="number"
                    value={line.quantity || ""}
                    onChange={(e) => updateLine(index, "quantity", e.target.value)}
                    min="0"
                    className="text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={line.unit_price || ""}
                    onChange={(e) => updateLine(index, "unit_price", e.target.value)}
                    min="0"
                    className="text-sm"
                  />
                </div>
                <div className="col-span-1 text-right text-sm font-medium">
                  {formatCLP(line.amount)}
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCLP(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA {taxRate}%</span>
                <span>{formatCLP(taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCLP(total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones adicionales..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !clientId || lines.every(l => !l.description)}>
          {loading ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar {type === "cotizacion" ? "Cotización" : "Factura"}
        </Button>
      </div>
    </form>
  )
}
