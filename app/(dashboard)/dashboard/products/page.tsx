import { createClient } from "@/lib/supabase/server"
import { ProductsWorkspace } from "@/components/dashboard/products-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { Product } from "@/lib/inventory"

async function getData(): Promise<{ products: Product[]; shopifyConnected: boolean; hasMigration: boolean }> {
  try {
    const supabase = await createClient()
    const [{ data: products }, { data: shopify }] = await Promise.all([
      supabase.from("products").select("*").order("name", { ascending: true }),
      supabase.from("shopify_connections").select("id").in("status", ["connected", "syncing"]).limit(1),
    ])
    return {
      products: (products || []) as Product[],
      shopifyConnected: !!(shopify && shopify.length > 0),
      hasMigration: true,
    }
  } catch {
    return { products: [], shopifyConnected: false, hasMigration: false }
  }
}

export default async function ProductsPage() {
  const { products, shopifyConnected, hasMigration } = await getData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="text-muted-foreground">
          Catálogo maestro con coste, precio y margen. Source of truth que se sube a Shopify.
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

      <ProductsWorkspace products={products} shopifyConnected={shopifyConnected} />
    </div>
  )
}
