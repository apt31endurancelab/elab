import { getShopifyShopInfo } from "@/lib/shopify"
import { getStoreAnalytics } from "@/lib/shopify/analytics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShoppingBag,
  Package,
  DollarSign,
  Store,
  Users,
  CreditCard,
  Boxes,
  TrendingUp,
  FlaskConical,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShopifyCustomersManager } from "@/components/dashboard/shopify-customers-manager"
import type { ComponentType } from "react"

export const dynamic = "force-dynamic"

export default async function ShopifyPage() {
  const [a, shopInfo] = await Promise.all([getStoreAnalytics(), getShopifyShopInfo()])
  const isDemo = !shopInfo?.shop
  const currency = shopInfo?.shop?.currencyCode || a.currency

  const fmtMoney = (n: number) => {
    try {
      return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
    } catch {
      return `$${Math.round(n).toLocaleString("es-CL")}`
    }
  }
  const fmtNum = (n: number) => n.toLocaleString("es-CL")
  const fmtPct = (n: number) => `${n.toFixed(1)}%`
  const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "—")

  const topStats = [
    { title: "Ingresos Totales", value: fmtMoney(a.sales.totalSales), icon: DollarSign },
    { title: "Pedidos", value: fmtNum(a.sales.ordersCount), icon: ShoppingBag },
    { title: "Clientes", value: fmtNum(a.customers.total), icon: Users },
    { title: "Stock Total", value: fmtNum(a.inventory.totalStock), icon: Store },
  ]

  const salesKpis = [
    { title: "Gross Sales", value: fmtMoney(a.sales.grossSales) },
    { title: "Net Sales", value: fmtMoney(a.sales.netSales) },
    { title: "Total Sales", value: fmtMoney(a.sales.totalSales) },
    { title: "Returns", value: fmtMoney(a.sales.returns) },
    { title: "Discounts", value: fmtMoney(a.sales.discounts) },
    { title: "Shipping Revenue", value: fmtMoney(a.sales.shipping) },
    { title: "Taxes", value: fmtMoney(a.sales.taxes) },
    { title: "AOV", value: fmtMoney(a.sales.aov) },
    { title: "Orders Count", value: fmtNum(a.sales.ordersCount) },
    { title: "Items Sold", value: fmtNum(a.sales.itemsSold) },
    { title: "Revenue / Customer", value: fmtMoney(a.sales.revenuePerCustomer) },
  ]

  const customerKpis = [
    { title: "Total Clientes", value: fmtNum(a.customers.total) },
    { title: "Nuevos", value: fmtNum(a.customers.newCount) },
    { title: "Recurrentes", value: fmtNum(a.customers.returningCount) },
    { title: "Repeat Purchase Rate", value: fmtPct(a.customers.repeatPurchaseRate) },
    { title: "CLV medio", value: fmtMoney(a.customers.avgClv) },
    { title: "Suscritos a marketing", value: fmtPct(a.customers.subscribedRate) },
  ]

  const maxGross = Math.max(...a.salesTrend.map((d) => d.gross), 1)
  const noSales = a.sales.ordersCount === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shopify Analytics</h1>
          <p className="text-muted-foreground">
            {shopInfo?.shop?.name || "Tienda Shopify"} —{" "}
            {isDemo ? "Sin conexión" : `Datos en tiempo real · ${currency}`}
          </p>
        </div>
        {!isDemo && (
          <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Conectado
          </Badge>
        )}
      </div>

      {isDemo && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <FlaskConical className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Sin tienda conectada</AlertTitle>
          <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
            No se detectó una tienda Shopify conectada. Conéctala desde Ajustes → Shopify para ver tus datos reales.
          </AlertDescription>
        </Alert>
      )}

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {topStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="sales" className="flex-none">Ventas</TabsTrigger>
          <TabsTrigger value="orders" className="flex-none">Pedidos</TabsTrigger>
          <TabsTrigger value="customers" className="flex-none">Clientes</TabsTrigger>
          <TabsTrigger value="products" className="flex-none">Productos</TabsTrigger>
          <TabsTrigger value="inventory" className="flex-none">Inventario</TabsTrigger>
          <TabsTrigger value="payments" className="flex-none">Pagos</TabsTrigger>
          <TabsTrigger value="traffic" className="flex-none">Tráfico</TabsTrigger>
        </TabsList>

        {/* 1. SALES */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <TrendingUp className="h-4 w-4" /> Métricas de Ventas
              </CardTitle>
              <CardDescription>
                Calculado en tiempo real sobre tus pedidos{a.windowOrders ? ` (últimos ${a.windowOrders})` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {noSales && (
                <p className="rounded-md border border-border/70 bg-muted/40 p-3 text-sm text-muted-foreground">
                  Aún no hay ventas registradas en tu tienda. Estas métricas se rellenarán automáticamente con cada pedido.
                </p>
              )}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {salesKpis.map((kpi) => (
                  <Card key={kpi.title} className="border-border/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-sm">Sales Trend (Gross vs Net)</CardTitle>
                  <CardDescription>Por mes, desde tus pedidos reales</CardDescription>
                </CardHeader>
                <CardContent>
                  {a.salesTrend.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin datos de ventas todavía.</p>
                  ) : (
                    <div className="space-y-2">
                      {a.salesTrend.map((row) => (
                        <div key={row.month} className="grid grid-cols-[40px_1fr_90px] items-center gap-2">
                          <span className="text-xs text-muted-foreground">{row.month}</span>
                          <div className="h-2 rounded bg-muted">
                            <div className="h-full rounded bg-foreground/85" style={{ width: `${(row.gross / maxGross) * 100}%` }} />
                          </div>
                          <span className="text-right text-xs">{fmtMoney(row.gross)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Nota: <strong>Revenue per visitor</strong> requiere datos de sesiones (Google Analytics 4); no lo expone la Admin API de Shopify.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ORDERS */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <ShoppingBag className="h-4 w-4" /> Pedidos
              </CardTitle>
              <CardDescription>Pedidos recientes con estado y origen</CardDescription>
            </CardHeader>
            <CardContent>
              {a.orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Envío</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a.orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.name}</TableCell>
                        <TableCell>{fmtDate(o.createdAt)}</TableCell>
                        <TableCell>{o.customer}</TableCell>
                        <TableCell className="text-muted-foreground">{o.source}</TableCell>
                        <TableCell>
                          <Badge variant={o.financialStatus === "PAID" ? "default" : "outline"}>{o.financialStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={o.fulfillmentStatus === "FULFILLED" ? "default" : "secondary"}>
                            {o.fulfillmentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{fmtNum(o.itemsCount)}</TableCell>
                        <TableCell className="text-right font-medium">{fmtMoney(o.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={ShoppingBag} text="No hay pedidos todavía" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CUSTOMERS */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {customerKpis.map((kpi) => (
              <Card key={kpi.title} className="border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <ShopifyCustomersManager customers={a.customers.list} currency={currency} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. PRODUCTS */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Package className="h-4 w-4" /> Rendimiento de Productos
              </CardTitle>
              <CardDescription>Unidades vendidas e ingresos por producto (ordenado por ingresos)</CardDescription>
            </CardHeader>
            <CardContent>
              {a.products.list.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Vendidos</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a.products.list.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                        <TableCell>{p.vendor}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>
                            {p.status === "ACTIVE" ? "Activo" : "Borrador"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{fmtNum(p.inventory)}</TableCell>
                        <TableCell className="text-right">{fmtNum(p.unitsSold)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(p.revenue)}</TableCell>
                        <TableCell className="text-right font-medium">{fmtMoney(p.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={Package} text="No hay productos" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. INVENTORY */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Boxes className="h-4 w-4" /> Stock por Ubicación
                </CardTitle>
                <CardDescription>Disponible e incoming, en tiempo real</CardDescription>
              </CardHeader>
              <CardContent>
                {a.inventory.byLocation.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ubicación</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="text-right">Incoming</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {a.inventory.byLocation.map((row) => (
                        <TableRow key={row.location}>
                          <TableCell>{row.location}</TableCell>
                          <TableCell className="text-right">{fmtNum(row.available)}</TableCell>
                          <TableCell className="text-right">{fmtNum(row.incoming)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState icon={Boxes} text="Sin datos de inventario" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Sin Stock (Out of Stock)</CardTitle>
                <CardDescription>{a.inventory.outOfStock.length} producto(s) agotado(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {a.inventory.outOfStock.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {a.inventory.outOfStock.map((p) => (
                      <li key={p.title} className="flex items-center justify-between">
                        <span>{p.title}</span>
                        <Badge variant="outline" className="text-amber-600">{p.sku}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Todos los productos tienen stock. 👍</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 8. PAYMENTS */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <CreditCard className="h-4 w-4" /> Mix de Pagos
              </CardTitle>
              <CardDescription>Importe por método de pago (gateway)</CardDescription>
            </CardHeader>
            <CardContent>
              {a.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a.payments.map((p) => (
                      <TableRow key={p.method}>
                        <TableCell className="capitalize">{p.method}</TableCell>
                        <TableCell className="text-right">{fmtNum(p.count)}</TableCell>
                        <TableCell className="text-right font-medium">{fmtMoney(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={CreditCard} text="Sin transacciones todavía" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4 + 5. TRAFFIC / FUNNEL (GA4) */}
        <TabsContent value="traffic" className="space-y-4">
          <Alert className="border-blue-500/40 bg-blue-500/10">
            <FlaskConical className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-600 dark:text-blue-400">Requiere Google Analytics 4</AlertTitle>
            <AlertDescription className="text-blue-600/80 dark:text-blue-400/80">
              El <strong>Conversion Funnel</strong> (sesiones, add-to-cart, checkout) y las <strong>fuentes de tráfico</strong>
              (Direct, Search, Social, Email, Referral) no los expone la Admin API de Shopify. Para datos reales aquí hay
              que conectar Google Analytics 4 o usar ShopifyQL. Lo dejamos preparado como siguiente integración.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-sm">Conversion Funnel</CardTitle>
                <CardDescription>Sessions → Product views → Add to cart → Checkout → Purchase</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Pendiente de conectar GA4.</CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-sm">Fuentes de Tráfico</CardTitle>
                <CardDescription>Atribución por canal de adquisición</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Pendiente de conectar GA4.</CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  )
}
