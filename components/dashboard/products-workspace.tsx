"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Cloud, Package, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProductDialog } from "./product-dialog"
import { type Product, formatCurrency, marginPercent, isLowStock } from "@/lib/inventory"

const ALL = "__all__"
type SyncFilter = "all" | "synced" | "unsynced" | "error"

export function ProductsWorkspace({
  products,
  shopifyConnected,
}: {
  products: Product[]
  shopifyConnected: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>(ALL)
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "ok">("all")
  const [syncFilter, setSyncFilter] = useState<SyncFilter>("all")
  const [editing, setEditing] = useState<Product | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [bulkSyncing, setBulkSyncing] = useState(false)

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[])).sort()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku || "").toLowerCase().includes(q) && !(p.barcode || "").toLowerCase().includes(q)) return false
      if (category !== ALL && p.category !== category) return false
      if (stockFilter === "low" && !isLowStock(p)) return false
      if (stockFilter === "out" && p.stock > 0) return false
      if (stockFilter === "ok" && isLowStock(p)) return false
      if (syncFilter === "synced" && !p.shopify_product_id) return false
      if (syncFilter === "unsynced" && p.shopify_product_id) return false
      if (syncFilter === "error" && !p.shopify_sync_error) return false
      return true
    })
  }, [products, search, category, stockFilter, syncFilter])

  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    low: products.filter(p => isLowStock(p) && p.is_active).length,
    syncedShopify: products.filter(p => p.shopify_product_id).length,
    inventoryValue: products.reduce((sum, p) => sum + Number(p.cost_price) * Number(p.stock), 0),
    salesValue: products.reduce((sum, p) => sum + Number(p.price) * Number(p.stock), 0),
  }

  const openNew = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (p: Product) => { setEditing(p); setDialogOpen(true) }

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar producto? Si está sincronizado en Shopify, allí se mantiene.")) return
    await fetch(`/api/products?id=${id}`, { method: "DELETE" })
    router.refresh()
  }

  const syncOne = async (id: string) => {
    setSyncing(id)
    try {
      const res = await fetch(`/api/products/${id}/sync-shopify`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) alert(`Error sync: ${data.error || res.status}`)
      else router.refresh()
    } finally {
      setSyncing(null)
    }
  }

  const syncAll = async () => {
    if (!confirm("¿Sincronizar todos los productos activos a Shopify? Crea los nuevos y actualiza los existentes.")) return
    setBulkSyncing(true)
    try {
      const res = await fetch("/api/products/sync-shopify", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(`Error sync: ${data.error || res.status}`)
      } else {
        alert(`OK: ${data.created || 0} creados, ${data.updated || 0} actualizados, ${data.failed || 0} fallidos`)
        router.refresh()
      }
    } finally {
      setBulkSyncing(false)
    }
  }

  const pullFromShopify = async () => {
    setBulkSyncing(true)
    try {
      const res = await fetch("/api/products/pull-shopify", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) alert(`Error: ${data.error || res.status}`)
      else { alert(`OK: ${data.updated || 0} productos actualizados con stock de Shopify`); router.refresh() }
    } finally {
      setBulkSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Productos activos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.active}<span className="text-sm font-normal text-muted-foreground"> / {stats.total}</span></div></CardContent>
        </Card>
        <Card className={stats.low > 0 ? "border-orange-500/50" : undefined}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Bajo stock</CardTitle>
            {stats.low > 0 && <AlertTriangle className="h-4 w-4 text-orange-500" />}
          </CardHeader>
          <CardContent><div className={cn("text-2xl font-bold", stats.low > 0 && "text-orange-500")}>{stats.low}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Valor inventario (coste)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(stats.inventoryValue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sincronizados Shopify</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.syncedShopify}</div>
            <p className="text-xs text-muted-foreground">de {stats.total} productos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Catálogo de productos</CardTitle>
            <CardDescription>Source of truth — desde aquí se sube a Shopify</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {shopifyConnected && (
              <>
                <Button variant="outline" size="sm" onClick={pullFromShopify} disabled={bulkSyncing}>
                  <Cloud className="h-4 w-4 mr-1" />
                  Importar stock Shopify
                </Button>
                <Button size="sm" onClick={syncAll} disabled={bulkSyncing}>
                  <Cloud className="h-4 w-4 mr-1" />
                  Sync todo a Shopify
                </Button>
              </>
            )}
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo producto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU, barcode…" className="pl-8" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={(v: typeof stockFilter) => setStockFilter(v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el stock</SelectItem>
                <SelectItem value="low">Bajo stock</SelectItem>
                <SelectItem value="out">Sin stock</SelectItem>
                <SelectItem value="ok">Con stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={syncFilter} onValueChange={(v: SyncFilter) => setSyncFilter(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="synced">Sincronizados</SelectItem>
                <SelectItem value="unsynced">Sin sincronizar</SelectItem>
                <SelectItem value="error">Con error</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto self-center">
              {filtered.length} de {products.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm">No hay productos en este filtro</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU / Cat</TableHead>
                  <TableHead>Coste</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Margen</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Shopify</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const margin = marginPercent(Number(p.price), Number(p.cost_price))
                  const lowStock = isLowStock(p)
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                          <div>
                            <Link href={`/dashboard/products/${p.id}`} className="font-medium hover:underline">
                              {p.name}
                            </Link>
                            {!p.is_active && <Badge variant="outline" className="ml-2 text-[10px]">Inactivo</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs">{p.sku || "—"}</p>
                        {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(p.cost_price), p.currency)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(p.price), p.currency)}</TableCell>
                      <TableCell>
                        <span className={margin > 30 ? "text-emerald-600 dark:text-emerald-400" : margin > 0 ? "text-orange-500" : "text-destructive"}>
                          {margin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={lowStock ? "text-orange-500 font-medium" : ""}>
                          {p.stock}
                          {lowStock && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.shopify_product_id ? (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                            Sync
                          </Badge>
                        ) : p.shopify_sync_error ? (
                          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 text-[10px]" title={p.shopify_sync_error}>
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">—</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={syncing === p.id}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/products/${p.id}`}>
                                Ver detalle
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {shopifyConnected && (
                              <DropdownMenuItem onClick={() => syncOne(p.id)}>
                                <Cloud className="h-4 w-4 mr-2" />
                                {p.shopify_product_id ? "Actualizar en Shopify" : "Subir a Shopify"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => remove(p.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductDialog product={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
