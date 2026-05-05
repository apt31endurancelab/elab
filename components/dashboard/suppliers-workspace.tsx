"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Truck, Pencil, Trash2, Mail, Phone, Globe } from "lucide-react"
import { SupplierDialog } from "./supplier-dialog"
import type { Supplier } from "@/lib/inventory"

export type SupplierWithStats = Supplier & {
  product_count: number
  total_purchase_estimate: number
}

export function SuppliersWorkspace({ suppliers }: { suppliers: SupplierWithStats[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.contact_person || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.country_code || "").toLowerCase().includes(q),
    )
  }, [suppliers, search])

  const openNew = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (s: Supplier) => { setEditing(s); setDialogOpen(true) }
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar proveedor? Esto desvincula sus productos pero no los borra.")) return
    await fetch(`/api/suppliers?id=${id}`, { method: "DELETE" })
    router.refresh()
  }

  const totalActive = suppliers.filter(s => s.is_active).length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-medium">Proveedores</CardTitle>
          <CardDescription>{totalActive} activos · {suppliers.length} en total</CardDescription>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo proveedor
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, contacto, email, país…" className="pl-8" />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Truck className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm">No hay proveedores</p>
            <p className="text-xs">Empieza añadiendo tu primer proveedor</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Lead time</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/dashboard/suppliers/${s.id}`} className="font-medium hover:underline">
                      {s.name}
                    </Link>
                    {s.contact_person && (
                      <p className="text-xs text-muted-foreground">{s.contact_person}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {s.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                      {s.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                      {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={(e) => e.stopPropagation()}><Globe className="h-3 w-3" />web</a>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{s.country_code || "—"}</TableCell>
                  <TableCell>{s.product_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.default_lead_time_days ? `${s.default_lead_time_days}d` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={s.is_active ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600"}>
                      {s.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => remove(s.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <SupplierDialog supplier={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  )
}
