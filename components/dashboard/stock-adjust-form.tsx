"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Plus, Minus } from "lucide-react"

const REASONS = [
  { value: "purchase", label: "Compra a proveedor (entrada)" },
  { value: "return", label: "Devolución / vuelta a stock" },
  { value: "adjustment", label: "Ajuste de inventario" },
  { value: "manual", label: "Movimiento manual" },
  { value: "shopify_sync", label: "Resync con Shopify" },
]

export function StockAdjustForm({
  productId,
  currentStock,
}: {
  productId: string
  currentStock: number
}) {
  const router = useRouter()
  const [direction, setDirection] = useState<"in" | "out">("in")
  const [qty, setQty] = useState("")
  const [reason, setReason] = useState("purchase")
  const [unitCost, setUnitCost] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const change = (direction === "in" ? 1 : -1) * Math.max(1, Math.round(Number(qty) || 0))
    if (!change) return
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          change,
          reason,
          notes: notes || undefined,
          unit_cost: unitCost ? Number(unitCost) : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFeedback(data.error || `Error ${res.status}`)
      } else {
        setQty("")
        setNotes("")
        setUnitCost("")
        setFeedback("Movimiento registrado")
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ajustar stock</CardTitle>
        <CardDescription>Stock actual: <strong>{currentStock}</strong> unidades</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Tipo</FieldLabel>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={direction === "in" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDirection("in")}
                >
                  <Plus className="h-3 w-3 mr-1" /> Entrada
                </Button>
                <Button
                  type="button"
                  variant={direction === "out" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDirection("out")}
                >
                  <Minus className="h-3 w-3 mr-1" /> Salida
                </Button>
              </div>
            </div>
            <Field>
              <FieldLabel>Cantidad</FieldLabel>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
            </Field>
          </div>
          <Field>
            <FieldLabel>Razón</FieldLabel>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {direction === "in" && (
            <Field>
              <FieldLabel>Coste unitario (opcional, queda en log)</FieldLabel>
              <Input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </Field>
          )}
          <Field>
            <FieldLabel>Notas</FieldLabel>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referencia OC, factura, motivo del ajuste…" />
          </Field>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={saving || !qty}>
              {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Registrar
            </Button>
            {feedback && <span className="text-sm text-muted-foreground">{feedback}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
