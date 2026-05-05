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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SUPPORTED_CURRENCIES, marginPercent, type Product } from "@/lib/inventory"

export function ProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    name: "", description: "", sku: "", category: "", barcode: "",
    price: "", cost_price: "", currency: "CLP", stock: "0", low_stock_threshold: "0",
    weight: "", weight_unit: "kg", image_url: "", is_active: true,
  })

  useEffect(() => {
    if (!open) return
    setError(null)
    if (product) {
      setDraft({
        name: product.name, description: product.description || "", sku: product.sku || "",
        category: product.category || "", barcode: product.barcode || "",
        price: String(product.price), cost_price: String(product.cost_price ?? 0),
        currency: product.currency || "CLP", stock: String(product.stock),
        low_stock_threshold: String(product.low_stock_threshold ?? 0),
        weight: product.weight?.toString() || "", weight_unit: product.weight_unit || "kg",
        image_url: product.image_url || "", is_active: product.is_active,
      })
    } else {
      setDraft({
        name: "", description: "", sku: "", category: "", barcode: "",
        price: "", cost_price: "", currency: "CLP", stock: "0", low_stock_threshold: "0",
        weight: "", weight_unit: "kg", image_url: "", is_active: true,
      })
    }
  }, [open, product])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product?.id, ...draft }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
      } else {
        onOpenChange(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const margin = marginPercent(Number(draft.price) || 0, Number(draft.cost_price) || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Catálogo maestro. Coste y precio aquí definen el margen base. El proveedor primario actualizará el coste si lo cambias en su ficha.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Nombre *</FieldLabel>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          </Field>

          <Field>
            <FieldLabel>Descripción</FieldLabel>
            <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel>SKU</FieldLabel>
              <Input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} placeholder="ELAB-001" />
            </Field>
            <Field>
              <FieldLabel>Categoría</FieldLabel>
              <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Cintas, recambios…" />
            </Field>
            <Field>
              <FieldLabel>Código de barras</FieldLabel>
              <Input value={draft.barcode} onChange={(e) => setDraft({ ...draft, barcode: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel>Coste base</FieldLabel>
              <Input type="number" min="0" step="0.01" value={draft.cost_price} onChange={(e) => setDraft({ ...draft, cost_price: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Precio venta</FieldLabel>
              <Input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Moneda</FieldLabel>
              <Select value={draft.currency} onValueChange={(v) => setDraft({ ...draft, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {Number(draft.price) > 0 && Number(draft.cost_price) > 0 && (
            <div className="text-sm">
              Margen: <strong className={margin > 30 ? "text-emerald-600 dark:text-emerald-400" : margin > 0 ? "text-orange-500" : "text-destructive"}>{margin.toFixed(1)}%</strong>
              <span className="text-muted-foreground ml-2">
                ({(Number(draft.price) - Number(draft.cost_price)).toLocaleString("es-CL")} {draft.currency})
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel>Stock actual</FieldLabel>
              <Input type="number" min="0" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} disabled={!!product} />
              {product && <span className="text-xs text-muted-foreground">Usa la sección Stock para ajustar.</span>}
            </Field>
            <Field>
              <FieldLabel>Aviso bajo stock</FieldLabel>
              <Input type="number" min="0" value={draft.low_stock_threshold} onChange={(e) => setDraft({ ...draft, low_stock_threshold: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Imagen URL</FieldLabel>
              <Input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} placeholder="https://" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Peso</FieldLabel>
              <div className="flex gap-2">
                <Input type="number" min="0" step="0.001" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} className="flex-1" />
                <Select value={draft.weight_unit} onValueChange={(v) => setDraft({ ...draft, weight_unit: v })}>
                  <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Field>
            <div className="flex items-end pb-2 gap-2">
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              <Label>Activo (visible en catálogo)</Label>
            </div>
          </div>

          {error && (
            <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !draft.name}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {product ? "Guardar cambios" : "Crear producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
