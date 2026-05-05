import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Package, AlertTriangle } from "lucide-react"
import { formatCurrency, marginPercent, isLowStock, STOCK_REASON_LABELS, type Product, type ProductSupplier, type Supplier, type StockMovement } from "@/lib/inventory"
import { ProductSuppliersEditor } from "@/components/dashboard/product-suppliers-editor"
import { StockAdjustForm } from "@/components/dashboard/stock-adjust-form"
import { invoiceTypeLabel } from "@/lib/invoice-status"

async function getData(id: string) {
  try {
    const supabase = await createClient()
    const [{ data: product }, { data: links }, { data: suppliers }, { data: movements }] = await Promise.all([
      supabase.from("products").select("*").eq("id", id).single(),
      supabase.from("product_suppliers").select("*, supplier:suppliers(*)").eq("product_id", id),
      supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
      supabase.from("stock_movements").select("*").eq("product_id", id).order("created_at", { ascending: false }).limit(20),
    ])
    if (!product) return null
    return {
      product: product as Product,
      links: (links || []) as unknown as (ProductSupplier & { supplier: Supplier })[],
      suppliers: (suppliers || []) as Supplier[],
      movements: (movements || []) as StockMovement[],
    }
  } catch {
    return null
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getData(id)
  if (!data) notFound()
  const { product, links, suppliers, movements } = data
  const margin = marginPercent(Number(product.price), Number(product.cost_price))
  const lowStock = isLowStock(product)

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/dashboard/products"><ArrowLeft className="h-4 w-4 mr-1" />Productos</Link>
        </Button>
        <div className="flex items-start gap-4">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {product.sku && <span className="font-mono text-sm text-muted-foreground">{product.sku}</span>}
              {product.category && <Badge variant="outline" className="text-[10px]">{product.category}</Badge>}
              {!product.is_active && <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
              {product.shopify_product_id && (
                <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                  Sincronizado en Shopify
                </Badge>
              )}
              {product.shopify_sync_error && (
                <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300">
                  Error sync
                </Badge>
              )}
            </div>
          </div>
        </div>
        {product.description && (
          <p className="text-sm text-muted-foreground mt-3 max-w-3xl">{product.description}</p>
        )}
      </div>

      {product.shopify_sync_error && (
        <Card className="border-red-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error en última sincronización a Shopify
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">{product.shopify_sync_error}</pre>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Coste base</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(Number(product.cost_price), product.currency)}</div>
            <p className="text-xs text-muted-foreground">{links.find(l => l.is_primary)?.supplier?.name || "Sin proveedor principal"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Precio venta</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(Number(product.price), product.currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Margen</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${margin > 30 ? "text-emerald-600 dark:text-emerald-400" : margin > 0 ? "text-orange-500" : "text-destructive"}`}>
              {margin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">{formatCurrency(Number(product.price) - Number(product.cost_price), product.currency)} por unidad</p>
          </CardContent>
        </Card>
        <Card className={lowStock ? "border-orange-500/50" : undefined}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stock</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${lowStock ? "text-orange-500" : ""}`}>
              {product.stock} unidades
              {lowStock && <AlertTriangle className="h-4 w-4 inline ml-1" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Aviso si ≤ {product.low_stock_threshold || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <ProductSuppliersEditor product={product} links={links} suppliers={suppliers} />

      <div className="grid gap-6 lg:grid-cols-2">
        <StockAdjustForm productId={product.id} currentStock={product.stock} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos movimientos</CardTitle>
            <CardDescription>20 más recientes</CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos todavía</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
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
                        <span className="text-sm">{STOCK_REASON_LABELS[m.reason] || m.reason}</span>
                        {m.reference_type === "invoice" && m.reference_id && (
                          <span className="text-xs text-muted-foreground ml-1">{invoiceTypeLabel("factura")}</span>
                        )}
                        {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${m.change > 0 ? "text-emerald-600 dark:text-emerald-400" : m.change < 0 ? "text-destructive" : ""}`}>
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
    </div>
  )
}
