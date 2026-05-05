import { createClient } from "@/lib/supabase/server"
import { SuppliersWorkspace, type SupplierWithStats } from "@/components/dashboard/suppliers-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Globe, Package } from "lucide-react"

async function getData() {
  try {
    const supabase = await createClient()
    const [{ data: suppliers }, { data: links }] = await Promise.all([
      supabase.from("suppliers").select("*").order("created_at", { ascending: false }),
      supabase.from("product_suppliers").select("supplier_id, cost_price, min_order_qty"),
    ])

    const productCountBy = new Map<string, number>()
    const purchaseEstimateBy = new Map<string, number>()
    for (const link of links || []) {
      productCountBy.set(link.supplier_id, (productCountBy.get(link.supplier_id) ?? 0) + 1)
      purchaseEstimateBy.set(
        link.supplier_id,
        (purchaseEstimateBy.get(link.supplier_id) ?? 0) + Number(link.cost_price) * (link.min_order_qty || 1),
      )
    }

    const enriched: SupplierWithStats[] = (suppliers || []).map(s => ({
      ...s,
      product_count: productCountBy.get(s.id) ?? 0,
      total_purchase_estimate: purchaseEstimateBy.get(s.id) ?? 0,
    }))

    return { suppliers: enriched, hasMigration: true }
  } catch {
    return { suppliers: [] as SupplierWithStats[], hasMigration: false }
  }
}

export default async function SuppliersPage() {
  const { suppliers, hasMigration } = await getData()

  const activeCount = suppliers.filter(s => s.is_active).length
  const countriesCount = new Set(suppliers.map(s => s.country_code).filter(Boolean)).size
  const totalProducts = suppliers.reduce((sum, s) => sum + s.product_count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
        <p className="text-muted-foreground">
          CRM de proveedores y vínculo con productos para calcular margen
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores activos</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Países</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{countriesCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos vinculados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalProducts}</div></CardContent>
        </Card>
      </div>

      <SuppliersWorkspace suppliers={suppliers} />
    </div>
  )
}
