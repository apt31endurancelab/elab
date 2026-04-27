import { createClient } from "@/lib/supabase/server"
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
import { DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react"
import { RegisterSaleDialog } from "@/components/dashboard/register-sale-dialog"
import { PayoutActions } from "@/components/dashboard/payout-actions"
import { demoCommissions, demoAffiliates } from "@/lib/demo-data"

interface Sale {
  id: string
  created_at: string
  affiliate_id: string
  order_id: string
  order_total: number
  commission_amount: number
  status: string
  affiliates?: { name: string; email: string; discount_code: string } | null
  affiliate_name?: string
}

interface Payout {
  id: string
  created_at: string
  affiliate_id: string
  amount: number
  payment_method: string | null
  status: string
  affiliates?: { name: string; email: string } | null
}

async function getCommissionsData(): Promise<{ 
  sales: Sale[]
  payouts: Payout[]
  isDemo: boolean 
}> {
  try {
    const supabase = await createClient()
    
    const { data: sales } = await supabase
      .from("affiliate_sales")
      .select(`
        *,
        affiliates (
          name,
          email,
          discount_code
        )
      `)
      .order("created_at", { ascending: false })

    const { data: payouts } = await supabase
      .from("affiliate_payouts")
      .select(`
        *,
        affiliates (
          name,
          email
        )
      `)
      .order("created_at", { ascending: false })

    return { sales: sales || [], payouts: payouts || [], isDemo: false }
  } catch {
    const demoPayouts: Payout[] = [
      {
        id: "payout-1",
        created_at: "2024-04-01",
        affiliate_id: "demo-2",
        amount: 500,
        payment_method: "Transferencia",
        status: "completed",
        affiliates: { name: "María López", email: "maria@example.com" }
      }
    ]
    
    const sales: Sale[] = demoCommissions.map(c => ({
      id: c.id,
      created_at: c.created_at,
      affiliate_id: c.affiliate_id,
      order_id: c.order_id,
      order_total: c.sale_amount,
      commission_amount: c.commission_amount,
      status: c.status,
      affiliate_name: c.affiliate_name,
      affiliates: { name: c.affiliate_name, email: "", discount_code: "" },
    }))
    
    return { sales, payouts: demoPayouts, isDemo: true }
  }
}

export default async function CommissionsPage() {
  const { sales, payouts, isDemo } = await getCommissionsData()

  const totalSales = sales.reduce((sum, s) => sum + Number(s.order_total), 0)
  const totalCommissions = sales.reduce((sum, s) => sum + Number(s.commission_amount), 0)
  const pendingCommissions = sales
    .filter(s => s.status === "pending")
    .reduce((sum, s) => sum + Number(s.commission_amount), 0)
  const paidCommissions = payouts
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const stats = [
    {
      title: "Ventas Totales",
      value: `$${totalSales.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      description: "Via programa de afiliados",
      icon: TrendingUp,
    },
    {
      title: "Comisiones Generadas",
      value: `$${totalCommissions.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      description: "Total acumulado",
      icon: DollarSign,
    },
    {
      title: "Pendientes de Pago",
      value: `$${pendingCommissions.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      description: "Por liquidar",
      icon: Clock,
    },
    {
      title: "Total Pagado",
      value: `$${paidCommissions.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      description: "Comisiones liquidadas",
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comisiones</h1>
          <p className="text-muted-foreground">
            Gestiona las ventas y pagos a afiliados
          </p>
        </div>
        <RegisterSaleDialog isDemo={isDemo} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Ventas Recientes</CardTitle>
          <CardDescription>Historial de ventas generadas por afiliados</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Venta</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(sale.created_at).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {sale.affiliates?.name || sale.affiliate_name || "Desconocido"}
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {sale.order_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      ${Number(sale.order_total).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                      ${Number(sale.commission_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        sale.status === "paid" ? "default" : 
                        sale.status === "pending" ? "secondary" : "outline"
                      }>
                        {sale.status === "paid" ? "Pagado" : 
                         sale.status === "pending" ? "Pendiente" : sale.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay ventas registradas</p>
              <p className="text-sm text-muted-foreground">
                Registra una venta manual o conecta con Shopify webhooks
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Historial de Pagos</CardTitle>
          <CardDescription>Pagos realizados a afiliados</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(payout.created_at).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payout.affiliates?.name || "Desconocido"}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${Number(payout.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payout.payment_method || "Transferencia"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={payout.status === "completed" ? "default" : "secondary"}>
                        {payout.status === "completed" ? "Pagado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <PayoutActions payout={payout} isDemo={isDemo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay pagos registrados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
