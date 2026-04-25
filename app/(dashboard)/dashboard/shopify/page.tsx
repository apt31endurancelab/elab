import { getShopifyAnalytics, getShopifyProducts, getShopifyShopInfo } from "@/lib/shopify"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Package, DollarSign, Store, AlertCircle, FlaskConical } from "lucide-react"
import { ShopifySetupCard } from "@/components/dashboard/shopify-setup-card"
import { demoShopifyOrders, demoProducts } from "@/lib/demo-data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ShopifyDataBlock {
  id: string
  title: string
  subtitle: string
  api: string
  metrics: string[]
  notes?: string[]
}

const shopifyDataBlocks: ShopifyDataBlock[] = [
  {
    id: "sales",
    title: "1. Metricas de Ventas (Sales / Revenue)",
    subtitle: "Dashboard + API (Reports API / GraphQL Admin)",
    api: "Reports API / GraphQL Admin",
    metrics: [
      "Gross Sales (ventas brutas)",
      "Net Sales (ventas netas)",
      "Total Sales (ventas totales)",
      "Returns (devoluciones)",
      "Discounts (descuentos aplicados)",
      "Shipping revenue (ingresos por envio)",
      "Taxes (impuestos)",
      "Average Order Value (AOV)",
      "Orders count (num pedidos)",
      "Items sold (unidades vendidas)",
      "Revenue per visitor",
      "Revenue per customer",
    ],
  },
  {
    id: "orders",
    title: "2. Pedidos (Orders)",
    subtitle: "Operacion y estado de cada pedido",
    api: "Orders API",
    metrics: [
      "Order ID",
      "Order value",
      "Line items (productos por pedido)",
      "Discounts por pedido",
      "Shipping method",
      "Payment gateway",
      "Financial status (paid, pending, refunded)",
      "Fulfillment status (fulfilled, unfulfilled)",
      "Refunds",
      "Cancelations",
      "Tags",
      "Source name (web, POS, app)",
      "Timeline del pedido (events)",
      "Risk level (fraude)",
    ],
  },
  {
    id: "customers",
    title: "3. Clientes (Customers)",
    subtitle: "Analitica de cliente y segmentacion",
    api: "Customers API",
    metrics: [
      "Customer ID",
      "First / last order date",
      "Total spent",
      "Orders count",
      "Average order value",
      "Customer lifetime value (CLV)",
      "Location (pais, ciudad)",
      "Email / phone",
      "Tags",
      "Marketing consent (email/sms)",
      "New vs Returning customers",
      "Repeat purchase rate",
    ],
  },
  {
    id: "conversion",
    title: "4. Conversion (Conversion Funnel)",
    subtitle: "Parte en dashboard y parte calculada",
    api: "Dashboard + calculos derivados",
    metrics: [
      "Sessions (visitas)",
      "Conversion rate",
      "Add to cart rate",
      "Reached checkout rate",
      "Completed checkout rate",
      "Funnel: Sessions > Product views > Add to cart > Checkout > Purchase",
    ],
    notes: [
      "Shopify no expone todo el funnel completo facilmente por API.",
      "Para un funnel completo: ShopifyQL y/o integracion con Google Analytics 4.",
    ],
  },
  {
    id: "traffic",
    title: "5. Trafico y Marketing",
    subtitle: "Atribucion, fuentes y performance de acquisition",
    api: "Dashboard + datos parciales por API",
    metrics: [
      "Sessions by source: Direct, Search, Social, Email, Referral",
      "Top referrers",
      "Landing pages",
      "Sessions by location (pais/ciudad)",
    ],
    notes: [
      "Limitacion: Shopify no es fuerte en analitica de trafico avanzada.",
      "Recomendado: complementar con GA4.",
    ],
  },
  {
    id: "products",
    title: "6. Productos (Products Performance)",
    subtitle: "Rendimiento comercial por producto y variante",
    api: "Products API + Reports",
    metrics: [
      "Product title",
      "SKU",
      "Vendor",
      "Product type",
      "Inventory",
      "Units sold",
      "Revenue per product",
      "Conversion rate por producto",
      "Top products",
      "Variant performance",
    ],
  },
  {
    id: "inventory",
    title: "7. Inventario (Inventory)",
    subtitle: "Control de stock y reposicion",
    api: "Inventory API",
    metrics: [
      "Inventory levels",
      "Inventory adjustments",
      "Stock by location",
      "Incoming inventory",
      "Out of stock products",
    ],
  },
  {
    id: "payments",
    title: "8. Pagos (Payments)",
    subtitle: "Estado y riesgo de cobros",
    api: "Transactions API",
    metrics: [
      "Payment method (card, PayPal, etc.)",
      "Transaction ID",
      "Payment status",
      "Refunds",
      "Chargebacks",
    ],
  },
]

const salesTrendDemo = [
  { month: "Jan", gross: 43800, net: 40150, orders: 214, items: 486, returns: 980, discounts: 1640, taxes: 4210, shipping: 2190, sessions: 15100, customers: 176 },
  { month: "Feb", gross: 46200, net: 42240, orders: 226, items: 512, returns: 1120, discounts: 1690, taxes: 4390, shipping: 2260, sessions: 15980, customers: 184 },
  { month: "Mar", gross: 45100, net: 40980, orders: 218, items: 498, returns: 1290, discounts: 1830, taxes: 4300, shipping: 2210, sessions: 15640, customers: 180 },
  { month: "Apr", gross: 50800, net: 46810, orders: 248, items: 566, returns: 1180, discounts: 1710, taxes: 4860, shipping: 2440, sessions: 17160, customers: 201 },
  { month: "May", gross: 57200, net: 52550, orders: 281, items: 640, returns: 1360, discounts: 1960, taxes: 5410, shipping: 2630, sessions: 18940, customers: 219 },
  { month: "Jun", gross: 62100, net: 57480, orders: 304, items: 694, returns: 1420, discounts: 2030, taxes: 5820, shipping: 2770, sessions: 20420, customers: 232 },
]

const conversionFunnelDemo = [
  { step: "Sessions", value: 20420 },
  { step: "Product Views", value: 14590 },
  { step: "Add to Cart", value: 6210 },
  { step: "Checkout", value: 3580 },
  { step: "Purchase", value: 3040 },
]

const trafficSourcesDemo = [
  { source: "Direct", sessions: 6120 },
  { source: "Search", sessions: 5340 },
  { source: "Social", sessions: 3720 },
  { source: "Email", sessions: 2860 },
  { source: "Referral", sessions: 2380 },
]

const topProductsDemo = [
  { product: "Lactate Pro 2", revenue: 22890, units: 114, conversion: 4.1 },
  { product: "Test Strips 25", revenue: 16120, units: 322, conversion: 3.6 },
  { product: "Full Kit", revenue: 13490, units: 31, conversion: 2.7 },
  { product: "Starter Kit", revenue: 9780, units: 49, conversion: 2.9 },
  { product: "Sensor Pack", revenue: 6840, units: 171, conversion: 2.2 },
]

const inventoryByLocationDemo = [
  { location: "Madrid", stock: 182, incoming: 40 },
  { location: "Barcelona", stock: 149, incoming: 30 },
  { location: "Valencia", stock: 113, incoming: 18 },
  { location: "Paris", stock: 87, incoming: 22 },
]

const paymentMethodsDemo = [
  { method: "Card", amount: 35620 },
  { method: "PayPal", amount: 12230 },
  { method: "Shop Pay", amount: 7830 },
  { method: "Bank", amount: 4260 },
]

const maxSales = Math.max(...salesTrendDemo.map((d) => d.gross))
const maxFunnel = Math.max(...conversionFunnelDemo.map((d) => d.value))
const maxTraffic = Math.max(...trafficSourcesDemo.map((d) => d.sessions))
const maxProductRevenue = Math.max(...topProductsDemo.map((d) => d.revenue))

export default async function ShopifyPage() {
  const hasShopifyConfig =
    !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN &&
    (!!process.env.SHOPIFY_STORE_DOMAIN || !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN)
  
  let analytics = null
  let products = null
  let shopInfo = null
  let isDemo = !hasShopifyConfig
  
  if (hasShopifyConfig) {
    try {
      [analytics, products, shopInfo] = await Promise.all([
        getShopifyAnalytics(),
        getShopifyProducts(),
        getShopifyShopInfo(),
      ])
    } catch {
      isDemo = true
    }
  }

  // Use demo data or real data
  const orders = isDemo 
    ? demoShopifyOrders.map(o => ({
        node: {
          id: o.id,
          name: o.order_number,
          customer: { firstName: o.customer.split(' ')[0], lastName: o.customer.split(' ')[1] || '', email: o.email },
          totalPriceSet: { shopMoney: { amount: o.total.toString() } },
          fulfillmentStatus: o.status === "fulfilled" ? "FULFILLED" : "PENDING",
          financialStatus: "PAID",
        }
      }))
    : (analytics?.orders?.edges || [])
    
  const productList = isDemo
    ? demoProducts.map(p => ({
        node: {
          id: p.id,
          title: p.title,
          status: p.status === "active" ? "ACTIVE" : "DRAFT",
          totalVariants: 1,
          totalInventory: p.inventory,
          priceRangeV2: { minVariantPrice: { amount: p.price.toString() } },
        }
      }))
    : (products?.products?.edges || [])

  // Calculate stats
  const totalRevenue = orders.reduce((sum: number, { node }: { node: { totalPriceSet: { shopMoney: { amount: string } } } }) => 
    sum + parseFloat(node.totalPriceSet.shopMoney.amount), 0
  )
  const totalOrders = orders.length
  const totalProducts = productList.length
  const totalInventory = productList.reduce((sum: number, { node }: { node: { totalInventory: number } }) => 
    sum + node.totalInventory, 0
  )

  const stats = [
    {
      title: "Ingresos Totales",
      value: `$${totalRevenue.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
    },
    {
      title: "Pedidos",
      value: totalOrders.toString(),
      icon: ShoppingBag,
    },
    {
      title: "Productos",
      value: totalProducts.toString(),
      icon: Package,
    },
    {
      title: "Stock Total",
      value: totalInventory.toString(),
      icon: Store,
    },
  ]

  const latest = salesTrendDemo[salesTrendDemo.length - 1]
  const grossSales = latest.gross
  const netSales = latest.net
  const totalSales = grossSales + latest.taxes + latest.shipping
  const returnsValue = latest.returns
  const discountsValue = latest.discounts
  const shippingRevenue = latest.shipping
  const taxesValue = latest.taxes
  const aov = latest.net / latest.orders
  const ordersCount = latest.orders
  const itemsSold = latest.items
  const revenuePerVisitor = latest.net / latest.sessions
  const revenuePerCustomer = latest.net / latest.customers

  const kpiCards = [
    { title: "Gross Sales", value: `$${grossSales.toLocaleString("es-ES")}` },
    { title: "Net Sales", value: `$${netSales.toLocaleString("es-ES")}` },
    { title: "Total Sales", value: `$${totalSales.toLocaleString("es-ES")}` },
    { title: "Returns", value: `$${returnsValue.toLocaleString("es-ES")}` },
    { title: "Discounts", value: `$${discountsValue.toLocaleString("es-ES")}` },
    { title: "Shipping Revenue", value: `$${shippingRevenue.toLocaleString("es-ES")}` },
    { title: "Taxes", value: `$${taxesValue.toLocaleString("es-ES")}` },
    { title: "AOV", value: `$${aov.toFixed(2)}` },
    { title: "Orders Count", value: ordersCount.toString() },
    { title: "Items Sold", value: itemsSold.toString() },
    { title: "Revenue / Visitor", value: `$${revenuePerVisitor.toFixed(2)}` },
    { title: "Revenue / Customer", value: `$${revenuePerCustomer.toFixed(2)}` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shopify Analytics</h1>
        <p className="text-muted-foreground">
          {shopInfo?.shop?.name || "Lactate Pro Store"} - {isDemo ? "Datos de demostración" : "Datos en tiempo real"}
        </p>
      </div>

      {isDemo && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <FlaskConical className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Modo Demo</AlertTitle>
          <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
            Estás viendo datos de demostración. Para conectar tu tienda Shopify, añade las variables de entorno 
            SHOPIFY_ADMIN_ACCESS_TOKEN y SHOPIFY_STORE_DOMAIN en la sección Vars.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Data Model Shopify (Visible siempre)</CardTitle>
          <CardDescription>
            Seccion funcional con todas las metricas, entidades y APIs para implementar en el SaaS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 rounded-lg border border-border/70 p-4">
            <div>
              <h3 className="text-sm font-semibold">Demo Analytics Playground</h3>
              <p className="text-xs text-muted-foreground">
                Vista demo con metricas y graficos para simular toda la capa Shopify end-to-end.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {kpiCards.map((kpi) => (
                <Card key={kpi.title} className="border-border/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      {kpi.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-sm">Sales Trend (Gross vs Net)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {salesTrendDemo.map((row) => (
                      <div key={row.month} className="grid grid-cols-[34px_1fr_56px] items-center gap-2">
                        <span className="text-xs text-muted-foreground">{row.month}</span>
                        <div className="h-2 rounded bg-muted">
                          <div
                            className="h-full rounded bg-foreground/85"
                            style={{ width: `${(row.gross / maxSales) * 100}%` }}
                          />
                        </div>
                        <span className="text-right text-xs">${Math.round(row.gross / 1000)}k</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-sm">Conversion Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {conversionFunnelDemo.map((row) => (
                      <div key={row.step} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{row.step}</span>
                          <span className="font-medium">{row.value.toLocaleString("es-ES")}</span>
                        </div>
                        <div className="h-2 rounded bg-muted">
                          <div
                            className="h-full rounded bg-foreground"
                            style={{ width: `${(row.value / maxFunnel) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-sm">Traffic Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trafficSourcesDemo.map((row) => (
                      <div key={row.source} className="grid grid-cols-[70px_1fr_64px] items-center gap-2">
                        <span className="text-xs text-muted-foreground">{row.source}</span>
                        <div className="h-2 rounded bg-muted">
                          <div
                            className="h-full rounded bg-foreground/90"
                            style={{ width: `${(row.sessions / maxTraffic) * 100}%` }}
                          />
                        </div>
                        <span className="text-right text-xs">{row.sessions.toLocaleString("es-ES")}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-sm">Top Products Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topProductsDemo.map((row) => (
                      <div key={row.product} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate text-muted-foreground">{row.product}</span>
                          <span className="font-medium">${row.revenue.toLocaleString("es-ES")}</span>
                        </div>
                        <div className="h-2 rounded bg-muted">
                          <div
                            className="h-full rounded bg-foreground/88"
                            style={{ width: `${(row.revenue / maxProductRevenue) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-sm">Inventory by Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Incoming</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryByLocationDemo.map((row) => (
                        <TableRow key={row.location}>
                          <TableCell>{row.location}</TableCell>
                          <TableCell className="text-right">{row.stock}</TableCell>
                          <TableCell className="text-right">{row.incoming}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-sm">Payments Mix</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentMethodsDemo.map((row) => (
                        <TableRow key={row.method}>
                          <TableCell>{row.method}</TableCell>
                          <TableCell className="text-right">${row.amount.toLocaleString("es-ES")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {shopifyDataBlocks.map((block) => (
              <Card key={`always-${block.id}`} className="border-border/70">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-snug">
                      {block.title}
                    </CardTitle>
                    <Badge variant="outline">{block.api}</Badge>
                  </div>
                  <CardDescription>{block.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {block.metrics.map((metric) => (
                      <li key={`${block.id}-${metric}`} className="leading-snug">
                        • {metric}
                      </li>
                    ))}
                  </ul>
                  {block.notes && block.notes.length > 0 && (
                    <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                      <p className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Nota importante
                      </p>
                      <ul className="space-y-1 text-xs text-amber-600/80 dark:text-amber-400/80">
                        {block.notes.map((note) => (
                          <li key={`${block.id}-${note}`}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="data-model" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="orders" className="flex-none">Pedidos Recientes</TabsTrigger>
          <TabsTrigger value="products" className="flex-none">Productos</TabsTrigger>
          <TabsTrigger value="data-model" className="flex-none">Data Model Shopify</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Últimos Pedidos</CardTitle>
              <CardDescription>Pedidos recientes de tu tienda Shopify</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 10).map(({ node: order }: { node: { id: string; name: string; customer?: { firstName?: string; lastName?: string; email?: string } | null; totalPriceSet: { shopMoney: { amount: string } }; fulfillmentStatus: string; financialStatus: string } }) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.name}</TableCell>
                        <TableCell>
                          {order.customer 
                            ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim() || order.customer.email
                            : "Cliente no registrado"
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            order.fulfillmentStatus === "FULFILLED" ? "default" : "secondary"
                          }>
                            {order.fulfillmentStatus === "FULFILLED" ? "Enviado" : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            order.financialStatus === "PAID" ? "default" : "outline"
                          }>
                            {order.financialStatus === "PAID" ? "Pagado" : order.financialStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay pedidos recientes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Catálogo de Productos</CardTitle>
              <CardDescription>Productos de medición de lactato</CardDescription>
            </CardHeader>
            <CardContent>
              {productList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Variantes</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productList.map(({ node: product }: { node: { id: string; title: string; status: string; totalVariants: number; totalInventory: number; priceRangeV2: { minVariantPrice: { amount: string } } } }) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.title}</TableCell>
                        <TableCell>
                          <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                            {product.status === "ACTIVE" ? "Activo" : "Borrador"}
                          </Badge>
                        </TableCell>
                        <TableCell>{product.totalVariants}</TableCell>
                        <TableCell>{product.totalInventory}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${parseFloat(product.priceRangeV2.minVariantPrice.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay productos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Arquitectura de Datos Shopify</CardTitle>
              <CardDescription>
                Mapa completo de metricas, entidades y limitaciones para tu SaaS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {shopifyDataBlocks.map((block) => (
                  <Card key={block.id} className="border-border/70">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-semibold leading-snug">
                          {block.title}
                        </CardTitle>
                        <Badge variant="outline">{block.api}</Badge>
                      </div>
                      <CardDescription>{block.subtitle}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {block.metrics.map((metric) => (
                          <li key={metric} className="leading-snug">
                            • {metric}
                          </li>
                        ))}
                      </ul>
                      {block.notes && block.notes.length > 0 && (
                        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                          <p className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            Nota importante
                          </p>
                          <ul className="space-y-1 text-xs text-amber-600/80 dark:text-amber-400/80">
                            {block.notes.map((note) => (
                              <li key={note}>• {note}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
