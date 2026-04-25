"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"

const defaultSalesData = [
  { month: "Ene", ventas: 4000, comisiones: 400 },
  { month: "Feb", ventas: 3000, comisiones: 300 },
  { month: "Mar", ventas: 5000, comisiones: 500 },
  { month: "Abr", ventas: 4500, comisiones: 450 },
  { month: "May", ventas: 6000, comisiones: 600 },
  { month: "Jun", ventas: 5500, comisiones: 550 },
]

const defaultTopAffiliates = [
  { name: "Carlos M.", ventas: 12500 },
  { name: "Ana G.", ventas: 9800 },
  { name: "Pedro L.", ventas: 7600 },
  { name: "Maria S.", ventas: 5400 },
  { name: "Juan R.", ventas: 4200 },
]

interface SalesDataItem {
  month: string
  ventas: number
  comisiones: number
}

interface AffiliateItem {
  name: string
  total_sales?: number
  ventas?: number
}

interface DashboardChartsProps {
  salesData?: SalesDataItem[]
  affiliatesData?: AffiliateItem[]
}

export function DashboardCharts({ salesData, affiliatesData }: DashboardChartsProps) {
  const chartSalesData = salesData || defaultSalesData
  
  const topAffiliates = affiliatesData 
    ? affiliatesData.slice(0, 5).map(a => ({ 
        name: a.name.split(' ')[0], 
        ventas: a.total_sales || a.ventas || 0 
      }))
    : defaultTopAffiliates

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="text-base font-medium">Ventas por Mes</CardTitle>
          <CardDescription>Evolución de ventas y comisiones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSalesData}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.35} />
                <XAxis 
                  dataKey="month" 
                  className="text-xs" 
                  tick={{ fill: "var(--muted-foreground)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis 
                  className="text-xs" 
                  tick={{ fill: "var(--muted-foreground)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--card-foreground)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVentas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="text-base font-medium">Top Afiliados</CardTitle>
          <CardDescription>Por volumen de ventas generadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAffiliates} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.35} />
                <XAxis 
                  type="number" 
                  className="text-xs"
                  tick={{ fill: "var(--muted-foreground)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  className="text-xs"
                  tick={{ fill: "var(--muted-foreground)" }}
                  tickLine={{ stroke: "var(--border)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--card-foreground)",
                  }}
                />
                <Bar 
                  dataKey="ventas" 
                  fill="var(--foreground)" 
                  fillOpacity={0.9}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
