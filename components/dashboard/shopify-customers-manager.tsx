"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Users, Pencil, Plus } from "lucide-react"

export type ShopifyCustomer = {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string
  phone: string
  note: string
  ordersCount: number
  totalSpent: number
  aov: number
  location: string
  marketing: boolean
  lastOrderAt: string | null
  tags: string[]
}

type FormState = {
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  note: string
  tags: string
  marketing: boolean
}

const empty: FormState = { firstName: "", lastName: "", email: "", phone: "", note: "", tags: "", marketing: false }

export function ShopifyCustomersManager({ customers, currency }: { customers: ShopifyCustomer[]; currency: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)

  const fmtMoney = (n: number) => {
    try { return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(n) }
    catch { return `$${Math.round(n).toLocaleString("es-CL")}` }
  }

  const openNew = () => { setForm(empty); setOpen(true) }
  const openEdit = (c: ShopifyCustomer) => {
    setForm({
      id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email === "—" ? "" : c.email,
      phone: c.phone, note: c.note, tags: c.tags.join(", "), marketing: c.marketing,
    })
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    const payload = {
      id: form.id,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      note: form.note,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      marketing: form.marketing,
    }
    try {
      const res = await fetch("/api/shopify/customers", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(`Error: ${data.error || res.status}`)
      } else {
        toast.success(form.id ? "Cliente actualizado en Shopify" : "Cliente creado en Shopify")
        setOpen(false)
        router.refresh()
      }
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <h3 className="text-base font-medium">Clientes de Shopify</h3>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      {customers.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Total gastado</TableHead>
                <TableHead>Marketing</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Editar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>{c.location}</TableCell>
                  <TableCell className="text-right">{c.ordersCount.toLocaleString("es-CL")}</TableCell>
                  <TableCell className="text-right">{fmtMoney(c.totalSpent)}</TableCell>
                  <TableCell>
                    <Badge variant={c.marketing ? "default" : "outline"}>{c.marketing ? "Suscrito" : "No"}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    {c.tags.length ? c.tags.join(", ") : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border py-12 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No hay clientes todavía</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
            <DialogDescription>
              {form.id ? "Los cambios se guardan directamente en Shopify." : "Se creará en tu tienda Shopify."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fn">Nombre</Label>
                <Input id="fn" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ln">Apellido</Label>
                <Input id="ln" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ph">Teléfono</Label>
              <Input id="ph" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+56 9 ..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tg">Tags (separados por coma)</Label>
              <Input id="tg" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vip, mayorista" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nt">Nota</Label>
              <Textarea id="nt" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="mk">Suscrito a email marketing</Label>
              <Switch id="mk" checked={form.marketing} onCheckedChange={(v) => setForm({ ...form, marketing: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving || (!form.id && !form.email && !form.phone)}>
              {saving ? "Guardando..." : form.id ? "Guardar en Shopify" : "Crear en Shopify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
