import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft, Truck, Mail, Phone, Globe, MapPin, Building2, Calendar, CreditCard,
} from "lucide-react"
import { formatCurrency, marginPercent, type Supplier, type ProductSupplier, type Product } from "@/lib/inventory"

type ProductLink = ProductSupplier & { product: Product }

async function getSupplier(id: string): Promise<{ supplier: Supplier; links: ProductLink[] } | null> {
  try {
    const supabase = await createClient()
    const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", id).single()
    if (!supplier) return null
    const { data: links } = await supabase
      .from("product_suppliers")
      .select("*, product:products(*)")
      .eq("supplier_id", id)
    return { supplier: supplier as Supplier, links: (links || []) as unknown as ProductLink[] }
  } catch {
    return null
  }
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getSupplier(id)
  if (!data) notFound()
  const { supplier, links } = data

  const totalCostBaseline = links.reduce((sum, l) => sum + Number(l.cost_price) * (l.min_order_qty || 1), 0)
  const primaryCount = links.filter(l => l.is_primary).length

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/dashboard/suppliers"><ArrowLeft className="h-4 w-4 mr-1" />Proveedores</Link>
        </Button>
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">{supplier.name}</h1>
          <Badge variant="outline" className={supplier.is_active ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600"}>
            {supplier.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {supplier.contact_person && (
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{supplier.contact_person}</div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${supplier.email}`} className="text-primary hover:underline">{supplier.email}</a></div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><a href={`tel:${supplier.phone}`} className="text-primary hover:underline">{supplier.phone}</a></div>
            )}
            {supplier.website && (
              <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><a href={supplier.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{supplier.website}</a></div>
            )}
            {supplier.address && (
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{supplier.address}</span></div>
            )}
            {supplier.tax_id && (
              <div className="flex items-center gap-2 font-mono text-xs">{supplier.tax_id_type || "ID"}: {supplier.tax_id}</div>
            )}
            {supplier.country_code && (
              <Badge variant="outline" className="text-[10px]">{supplier.country_code}</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /><span>Moneda: <strong>{supplier.default_currency || "—"}</strong></span></div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Lead time: <strong>{supplier.default_lead_time_days ? `${supplier.default_lead_time_days} días` : "—"}</strong></span></div>
            {supplier.payment_terms && (
              <div className="text-muted-foreground">{supplier.payment_terms}</div>
            )}
            {supplier.notes && (
              <>
                <Separator />
                <p className="text-muted-foreground">{supplier.notes}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
            <CardDescription>Productos asociados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-2xl font-bold">{links.length}</p>
              <p className="text-muted-foreground">Productos suministrados</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{primaryCount}</p>
              <p className="text-muted-foreground">Como proveedor principal</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{formatCurrency(totalCostBaseline, supplier.default_currency)}</p>
              <p className="text-muted-foreground">Coste mínimo agregado (qty × MOQ)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos suministrados</CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay productos vinculados a este proveedor.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU proveedor</TableHead>
                  <TableHead>Coste</TableHead>
                  <TableHead>Precio venta</TableHead>
                  <TableHead>Margen</TableHead>
                  <TableHead>MOQ</TableHead>
                  <TableHead>Lead time</TableHead>
                  <TableHead>Principal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map(l => {
                  const margin = marginPercent(Number(l.product?.price ?? 0), Number(l.cost_price))
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Link href={`/dashboard/products/${l.product_id}`} className="font-medium hover:underline">
                          {l.product?.name || "—"}
                        </Link>
                        {l.product?.sku && <p className="text-xs font-mono text-muted-foreground">{l.product.sku}</p>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.supplier_sku || "—"}</TableCell>
                      <TableCell>{formatCurrency(Number(l.cost_price), l.currency)}</TableCell>
                      <TableCell>{l.product ? formatCurrency(Number(l.product.price), l.product.currency) : "—"}</TableCell>
                      <TableCell>
                        <span className={margin > 30 ? "text-emerald-600 dark:text-emerald-400" : margin > 0 ? "text-orange-500" : "text-destructive"}>
                          {margin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>{l.min_order_qty}</TableCell>
                      <TableCell>{l.lead_time_days ? `${l.lead_time_days}d` : "—"}</TableCell>
                      <TableCell>
                        {l.is_primary && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]" variant="outline">Principal</Badge>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
