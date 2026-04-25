import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, TrendingUp, CheckSquare } from "lucide-react"
import { DashboardCharts } from "@/components/dashboard/charts"
import { demoStats, demoSales, demoAffiliates } from "@/lib/demo-data"

async function getStats() {
  try {
    const supabase = await createClient()
    
    const { count: affiliatesCount } = await supabase
      .from("affiliates")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
    
    const { count: tasksCount } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
    
    const { data: salesData } = await supabase
      .from("affiliate_sales")
      .select("sale_amount, commission_amount")
    
    const totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.sale_amount), 0) || 0
    const totalCommissions = salesData?.reduce((sum, sale) => sum + Number(sale.commission_amount), 0) || 0

    return {
      totalSales,
      activeAffiliates: affiliatesCount || 0,
      pendingCommissions: totalCommissions,
      pendingTasks: tasksCount || 0,
      isDemo: false,
    }
  } catch {
    return {
      ...demoStats,
      isDemo: true,
    }
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const statCards = [
    {
      title: "Ventas Totales",
      value: `$${stats.totalSales.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      description: "Ventas via afiliados",
      icon: DollarSign,
    },
    {
      title: "Afiliados Activos",
      value: stats.activeAffiliates.toString(),
      description: "Influencers registrados",
      icon: Users,
    },
    {
      title: "Comisiones Pendientes",
      value: `$${stats.pendingCommissions.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      description: "Por pagar",
      icon: TrendingUp,
    },
    {
      title: "Tareas Pendientes",
      value: stats.pendingTasks.toString(),
      description: "Por completar",
      icon: CheckSquare,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general de tu tienda Lactate Pro
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
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

      {/* Charts */}
      <DashboardCharts 
        salesData={stats.isDemo ? demoSales : undefined} 
        affiliatesData={stats.isDemo ? demoAffiliates : undefined}
      />
    </div>
  )
}
