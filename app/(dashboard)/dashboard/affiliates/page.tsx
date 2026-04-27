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
import { Users, DollarSign, TrendingUp, Percent } from "lucide-react"
import { CreateAffiliateDialog } from "@/components/dashboard/create-affiliate-dialog"
import { AffiliateActions } from "@/components/dashboard/affiliate-actions"
import { demoAffiliates } from "@/lib/demo-data"

interface AffiliateWithStats {
  id: string
  name: string
  email: string
  discount_code: string
  commission_rate: number
  discount_percentage: number
  referral_link: string | null
  status: string
  totalSales: number
  totalCommission: number
  salesCount: number
}

async function getAffiliates(): Promise<{ affiliates: AffiliateWithStats[]; isDemo: boolean }> {
  try {
    const supabase = await createClient()

    const { data: affiliates } = await supabase
      .from("affiliates")
      .select("*")
      .order("created_at", { ascending: false })

    const { data: salesData } = await supabase
      .from("affiliate_sales")
      .select("affiliate_id, order_total, commission_amount")

    const affiliateStats = affiliates?.map(affiliate => {
      const sales = salesData?.filter(s => s.affiliate_id === affiliate.id) || []
      const totalSales = sales.reduce((sum, s) => sum + Number(s.order_total), 0)
      const totalCommission = sales.reduce((sum, s) => sum + Number(s.commission_amount), 0)
      return {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        discount_code: affiliate.discount_code || "",
        commission_rate: Number(affiliate.commission_rate),
        discount_percentage: Number(affiliate.discount_percentage),
        referral_link: affiliate.referral_link,
        status: affiliate.status,
        totalSales,
        totalCommission,
        salesCount: sales.length,
      }
    }) || []

    return { affiliates: affiliateStats, isDemo: false }
  } catch {
    const demoStats = demoAffiliates.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      discount_code: a.code || "",
      commission_rate: a.commission_percent || 0,
      discount_percentage: a.discount_percent || 0,
      referral_link: null,
      status: a.status,
      totalSales: a.total_sales || 0,
      totalCommission: a.total_commission || 0,
      salesCount: Math.floor((a.total_sales || 0) / 150),
    }))
    return { affiliates: demoStats, isDemo: true }
  }
}

export default async function AffiliatesPage() {
  const { affiliates, isDemo } = await getAffiliates()

  const totalAffiliates = affiliates.length
  const activeAffiliates = affiliates.filter(a => a.status === "active").length
  const totalSalesAmount = affiliates.reduce((sum, a) => sum + a.totalSales, 0)
  const totalCommissions = affiliates.reduce((sum, a) => sum + a.totalCommission, 0)
  const avgCommission = affiliates.length
    ? affiliates.reduce((sum, a) => sum + a.commission_rate, 0) / affiliates.length
    : 0

  const stats = [
    {
      title: "Afiliados Totales",
      value: totalAffiliates.toString(),
      description: `${activeAffiliates} activos`,
      icon: Users,
    },
    {
      title: "Ventas Generadas",
      value: `$${totalSalesAmount.toLocaleString("es-CL")}`,
      description: "Total via afiliados",
      icon: TrendingUp,
    },
    {
      title: "Comisiones Totales",
      value: `$${totalCommissions.toLocaleString("es-CL")}`,
      description: "Pagadas + Pendientes",
      icon: DollarSign,
    },
    {
      title: "Comisión Promedio",
      value: `${avgCommission.toFixed(0)}%`,
      description: "Tasa promedio",
      icon: Percent,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestión de Afiliados</h1>
          <p className="text-muted-foreground">
            Administra tus influencers y socios afiliados
          </p>
        </div>
        <CreateAffiliateDialog isDemo={isDemo} />
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
          <CardTitle className="text-base font-medium">Lista de Afiliados</CardTitle>
          <CardDescription>Todos tus influencers y socios registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {affiliates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Ventas</TableHead>
                  <TableHead>Ganancias</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell className="font-medium">{affiliate.name}</TableCell>
                    <TableCell className="text-muted-foreground">{affiliate.email}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {affiliate.discount_code}
                      </code>
                    </TableCell>
                    <TableCell>{affiliate.commission_rate}%</TableCell>
                    <TableCell>
                      ${affiliate.totalSales.toLocaleString("es-CL")}
                      <span className="text-muted-foreground text-xs ml-1">
                        ({affiliate.salesCount})
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                      ${affiliate.totalCommission.toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={affiliate.status === "active" ? "default" : "secondary"}>
                        {affiliate.status === "active" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AffiliateActions affiliate={{...affiliate, code: affiliate.discount_code}} isDemo={isDemo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay afiliados todavía</p>
              <p className="text-sm text-muted-foreground">Crea tu primer afiliado para empezar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
