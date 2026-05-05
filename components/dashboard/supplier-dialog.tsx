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
import { TAX_ID_TYPES } from "@/lib/tax-id"
import { SUPPORTED_CURRENCIES, type Supplier } from "@/lib/inventory"

const NONE = "__none__"

export function SupplierDialog({
  supplier,
  open,
  onOpenChange,
}: {
  supplier: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    country_code: "",
    tax_id: "",
    tax_id_type: NONE,
    payment_terms: "",
    default_currency: "CLP",
    default_lead_time_days: "",
    notes: "",
    is_active: true,
  })

  useEffect(() => {
    if (!open) return
    setError(null)
    if (supplier) {
      setDraft({
        name: supplier.name,
        contact_person: supplier.contact_person || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        website: supplier.website || "",
        address: supplier.address || "",
        country_code: supplier.country_code || "",
        tax_id: supplier.tax_id || "",
        tax_id_type: supplier.tax_id_type || NONE,
        payment_terms: supplier.payment_terms || "",
        default_currency: supplier.default_currency || "CLP",
        default_lead_time_days: supplier.default_lead_time_days?.toString() || "",
        notes: supplier.notes || "",
        is_active: supplier.is_active,
      })
    } else {
      setDraft({
        name: "", contact_person: "", email: "", phone: "", website: "", address: "",
        country_code: "", tax_id: "", tax_id_type: NONE, payment_terms: "",
        default_currency: "CLP", default_lead_time_days: "", notes: "", is_active: true,
      })
    }
  }, [open, supplier])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: supplier?.id,
          ...draft,
          tax_id_type: draft.tax_id_type !== NONE ? draft.tax_id_type : null,
          default_lead_time_days: draft.default_lead_time_days ? Number(draft.default_lead_time_days) : null,
        }),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          <DialogDescription>
            Información del proveedor. Después podrás asignarle productos con su coste específico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field className="col-span-2">
              <FieldLabel>Nombre / Razón social *</FieldLabel>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
            </Field>
            <Field>
              <FieldLabel>Persona de contacto</FieldLabel>
              <Input value={draft.contact_person} onChange={(e) => setDraft({ ...draft, contact_person: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Teléfono</FieldLabel>
              <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Web</FieldLabel>
              <Input value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} placeholder="https://" />
            </Field>
          </div>

          <Field>
            <FieldLabel>Dirección</FieldLabel>
            <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel>País (código)</FieldLabel>
              <Input value={draft.country_code} onChange={(e) => setDraft({ ...draft, country_code: e.target.value.toUpperCase() })} placeholder="ES, CL, US…" maxLength={3} />
            </Field>
            <Field>
              <FieldLabel>Tipo doc. fiscal</FieldLabel>
              <Select value={draft.tax_id_type} onValueChange={(v) => setDraft({ ...draft, tax_id_type: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {TAX_ID_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Documento fiscal</FieldLabel>
              <Input value={draft.tax_id} onChange={(e) => setDraft({ ...draft, tax_id: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field>
              <FieldLabel>Moneda por defecto</FieldLabel>
              <Select value={draft.default_currency} onValueChange={(v) => setDraft({ ...draft, default_currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Lead time (días)</FieldLabel>
              <Input type="number" min="0" value={draft.default_lead_time_days} onChange={(e) => setDraft({ ...draft, default_lead_time_days: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Términos de pago</FieldLabel>
              <Input value={draft.payment_terms} onChange={(e) => setDraft({ ...draft, payment_terms: e.target.value })} placeholder="30 días, contado, etc." />
            </Field>
          </div>

          <Field>
            <FieldLabel>Notas</FieldLabel>
            <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>

          <div className="flex items-center gap-2">
            <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            <Label>Proveedor activo</Label>
          </div>

          {error && (
            <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !draft.name}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {supplier ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
