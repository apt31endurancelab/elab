"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { Plus, Star, Trash2, Pencil } from "lucide-react"
import { type Product, type ProductSupplier, type Supplier, formatCurrency, marginPercent, SUPPORTED_CURRENCIES } from "@/lib/inventory"

type Link = ProductSupplier & { supplier?: Supplier }

export function ProductSuppliersEditor({
  product,
  links,
  suppliers,
}: {
  product: Product
  links: Link[]
  suppliers: Supplier[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Link | null>(null)
  const [draft, setDraft] = useState({
    supplier_id: "", supplier_sku: "", cost_price: "", currency: product.currency || "CLP",
    lead_time_days: "", min_order_qty: "1", is_primary: false, notes: "",
  })

  const openNew = () => {
    setEditing(null)
    setDraft({ supplier_id: "", supplier_sku: "", cost_price: "", currency: product.currency || "CLP", lead_time_days: "", min_order_qty: "1", is_primary: links.length === 0, notes: "" })
    setOpen(true)
  }

  const openEdit = (l: Link) => {
    setEditing(l)
    setDraft({
      supplier_id: l.supplier_id,
      supplier_sku: l.supplier_sku || "",
      cost_price: String(l.cost_price),
      currency: l.currency,
      lead_time_days: l.lead_time_days?.toString() || "",
      min_order_qty: String(l.min_order_qty),
      is_primary: l.is_primary,
      notes: l.notes || "",
    })
    setOpen(true)
  }

  const save = async () => {
    if (!draft.supplier_id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${product.id}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing?.id, ...draft }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(`Error: ${data.error || res.status}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async (linkId: string) => {
    if (!confirm("¿Quitar este proveedor del producto?")) return
    await fetch(`/api/products/${product.id}/suppliers?link_id=${linkId}`, { method: "DELETE" })
    router.refresh()
  }

  const setPrimary = async (l: Link) => {
    await fetch(`/api/products/${product.id}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: l.id,
        supplier_id: l.supplier_id,
        supplier_sku: l.supplier_sku,
        cost_price: l.cost_price,
        currency: l.currency,
        lead_time_days: l.lead_time_days,
        min_order_qty: l.min_order_qty,
        notes: l.notes,
        is_primary: true,
      }),
    })
    router.refresh()
  }

  // Suppliers not yet linked to this product (when creating new)
  const linkedIds = new Set(links.map(l => l.supplier_id))
  const availableSuppliers = editing ? suppliers : suppliers.filter(s => !linkedIds.has(s.id))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Proveedores</CardTitle>
          <CardDescription>El proveedor marcado como principal define el coste base del producto.</CardDescription>
        </div>
        <Button size="sm" onClick={openNew} disabled={availableSuppliers.length === 0 && !editing}>
          <Plus className="h-4 w-4 mr-1" />
          Vincular proveedor
        </Button>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay proveedores vinculados todavía.
            {suppliers.length === 0 && (
              <p className="mt-1">
                <Link href="/dashboard/suppliers" className="text-primary hover:underline">Crea un proveedor</Link> primero.
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>SKU prov.</TableHead>
                <TableHead>Coste</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead>MOQ</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map(l => {
                const margin = marginPercent(Number(product.price), Number(l.cost_price))
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link href={`/dashboard/suppliers/${l.supplier_id}`} className="font-medium hover:underline">
                        {l.supplier?.name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.supplier_sku || "—"}</TableCell>
                    <TableCell>{formatCurrency(Number(l.cost_price), l.currency)}</TableCell>
                    <TableCell>
                      <span className={margin > 30 ? "text-emerald-600 dark:text-emerald-400" : margin > 0 ? "text-orange-500" : "text-destructive"}>
                        {margin.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{l.min_order_qty}</TableCell>
                    <TableCell>{l.lead_time_days ? `${l.lead_time_days}d` : "—"}</TableCell>
                    <TableCell>
                      {l.is_primary ? (
                        <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                          <Star className="h-3 w-3 mr-1" />
                          Principal
                        </Badge>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPrimary(l)}>
                          Marcar principal
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar vínculo" : "Vincular proveedor"}</DialogTitle>
            <DialogDescription>{product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>Proveedor</FieldLabel>
              <Select value={draft.supplier_id} onValueChange={(v) => setDraft({ ...draft, supplier_id: v })} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Selecciona un proveedor…" /></SelectTrigger>
                <SelectContent>
                  {availableSuppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>SKU del proveedor</FieldLabel>
                <Input value={draft.supplier_sku} onChange={(e) => setDraft({ ...draft, supplier_sku: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>MOQ</FieldLabel>
                <Input type="number" min="1" value={draft.min_order_qty} onChange={(e) => setDraft({ ...draft, min_order_qty: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>Coste *</FieldLabel>
                <Input type="number" min="0" step="0.01" value={draft.cost_price} onChange={(e) => setDraft({ ...draft, cost_price: e.target.value })} required />
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
              <Field>
                <FieldLabel>Lead (días)</FieldLabel>
                <Input type="number" min="0" value={draft.lead_time_days} onChange={(e) => setDraft({ ...draft, lead_time_days: e.target.value })} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Notas</FieldLabel>
              <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is-primary" checked={draft.is_primary} onChange={(e) => setDraft({ ...draft, is_primary: e.target.checked })} />
              <label htmlFor="is-primary" className="text-sm">Marcar como proveedor principal (define el coste base)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !draft.supplier_id || !draft.cost_price}>
              {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
