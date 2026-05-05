import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertCircle, AlertTriangle, Boxes, DollarSign, Package } from "lucide-react"
import { formatCurrency, isLowStock, marginPercent, STOCK_REASON_LABELS, type Product, type StockMovement } from "@/lib/inventory"
import { cn } from "@/lib/utils"

async function getData() {
  try {
    const supabase = await createClient()
    const [{ data: products }, { data: movements }] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true).order("stock", { ascending: true }),
      supabase.from("stock_movements").select("*, product:products(name, sku)").order("created_at", { ascending: false }).limit(40),
    ])
    return {
      products: (products || []) as Product[],
      movements: (movements || []) as (StockMovement & { product?: { name: string; sku: string | null } })[],
      hasMigration: true,
    }
  } catch {
    return {
      products: [] as Product[],
      movements: [] as (StockMovement & { product?: { name: string; sku: string | null } })[],
      hasMigration: false,
    }
  }
}

export default async function StockPage() {
  const { products, movements, hasMigration } = await getData()

  const lowStock = products.filter(p => isLowStock(p))
  const outOfStock = products.filter(p => p.stock <= 0)
  const totalUnits = products.reduce((sum, p) => sum + Number(p.stock), 0)
  const inventoryCost = products.reduce((sum, p) => sum + Number(p.cost_price) * Number(p.stock), 0)
  const inventoryRetail = products.reduce((sum, p) => sum + Number(p.price) * Number(p.stock), 0)
  const potentialMargin = inventoryRetail - inventoryCost

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
        <p className="text-muted-foreground">
          Estado del inventario, alertas de bajo stock y movimientos recientes
        </p>
      </div>

      {!hasMigration && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Migración pendiente</AlertTitle>
          <AlertDescription>
            Ejecuta <code>scripts/007_inventory_and_suppliers.sql</code> en Supabase.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Unidades totales</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits}</div>
            <p className="text-xs text-muted-foreground">{products.length} productos activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Valor a coste</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventoryCost)}</div>
            <p className="text-xs text-muted-foreground">Capital inmovilizado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Valor a venta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventoryRetail)}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">+{formatCurrency(potentialMargin)} potencial</p>
          </CardContent>
        </Card>
        <Card className={lowStock.length > 0 ? "border-orange-500/50" : undefined}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Bajo stock</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", lowStock.length > 0 ? "text-orange-500" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", lowStock.length > 0 && "text-orange-500")}>{lowStock.length}</div>
            <p className="text-xs text-muted-foreground">{outOfStock.length} sin stock</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas de bajo stock</CardTitle>
          <CardDescription>Productos por debajo de su umbral de aviso</CardDescription>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Todo en orden, sin alertas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Umbral</TableHead>
                  <TableHead>Coste / unid.</TableHead>
                  <TableHead>Margen</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map(p => {
                  const margin = marginPercent(Number(p.price), Number(p.cost_price))
                  return (
                    <TableRow key={p.id} className={p.stock <= 0 ? "bg-destructive/5" : "bg-orange-500/5"}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                          <Link href={`/dashboard/products/${p.id}`} className="font-medium hover:underline">
                            {p.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.sku || "—"}</TableCell>
                      <TableCell className={cn("font-medium", p.stock <= 0 ? "text-destructive" : "text-orange-500")}>{p.stock}</TableCell>
                      <TableCell className="text-muted-foreground">{p.low_stock_threshold || 0}</TableCell>
                      <TableCell>{formatCurrency(Number(p.cost_price), p.currency)}</TableCell>
                      <TableCell>{margin.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Link href={`/dashboard/products/${p.id}`} className="text-xs text-primary hover:underline">
                          Reponer →
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos recientes</CardTitle>
          <CardDescription>Últimas 40 entradas/salidas</CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin movimientos todavía. Ajusta stock desde la ficha de un producto.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead className="text-right">Cambio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/products/${m.product_id}`} className="text-sm hover:underline">
                        {m.product?.name || m.product_id.slice(0, 8)}
                      </Link>
                      {m.product?.sku && <p className="text-xs font-mono text-muted-foreground">{m.product.sku}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {STOCK_REASON_LABELS[m.reason] || m.reason}
                      </Badge>
                      {m.notes && <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>}
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", m.change > 0 ? "text-emerald-600 dark:text-emerald-400" : m.change < 0 ? "text-destructive" : "")}>
                      {m.change > 0 ? "+" : ""}{m.change}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{m.resulting_stock ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
