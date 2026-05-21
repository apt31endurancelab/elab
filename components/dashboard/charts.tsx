"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

export type RawSale = {
  created_at: string
  sale_amount: number
  commission_amount: number
}

type Granularity = "day" | "month" | "quarter" | "semester" | "year"

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Día",
  month: "Mes",
  quarter: "Trimestre",
  semester: "Semestre",
  year: "Año",
}

interface AffiliateItem {
  name: string
  total_sales?: number
  ventas?: number
}

interface DashboardChartsProps {
  rawSales?: RawSale[]
  salesData?: { month: string; ventas: number; comisiones: number }[]
  affiliatesData?: AffiliateItem[]
}

const defaultTopAffiliates = [
  { name: "Carlos M.", ventas: 12500 },
  { name: "Ana G.", ventas: 9800 },
  { name: "Pedro L.", ventas: 7600 },
  { name: "Maria S.", ventas: 5400 },
  { name: "Juan R.", ventas: 4200 },
]

// Build synthetic daily sales for the last 12 months when nothing else is provided.
function buildDemoRawSales(): RawSale[] {
  const out: RawSale[] = []
  const today = new Date()
  for (let i = 365; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    // weekly seasonality + slight growth
    const base = 120 + Math.sin((i / 7) * Math.PI) * 40 + (365 - i) * 0.4
    const noise = Math.round(Math.random() * 80)
    const sale = Math.max(0, Math.round(base + noise))
    out.push({
      created_at: d.toISOString().split("T")[0],
      sale_amount: sale,
      commission_amount: Math.round(sale * 0.15),
    })
  }
  return out
}

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function bucketKey(date: Date, gran: Granularity): { key: string; label: string; sortKey: string } {
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  switch (gran) {
    case "day":
      return {
        key: `${y}-${m}-${d}`,
        label: `${d}/${m + 1}`,
        sortKey: date.toISOString().split("T")[0],
      }
    case "month":
      return { key: `${y}-${m}`, label: `${MONTH_SHORT[m]} ${String(y).slice(2)}`, sortKey: `${y}-${String(m).padStart(2, "0")}` }
    case "quarter": {
      const q = Math.floor(m / 3) + 1
      return { key: `${y}-Q${q}`, label: `Q${q} ${y}`, sortKey: `${y}-Q${q}` }
    }
    case "semester": {
      const s = m < 6 ? 1 : 2
      return { key: `${y}-S${s}`, label: `S${s} ${y}`, sortKey: `${y}-S${s}` }
    }
    case "year":
      return { key: `${y}`, label: `${y}`, sortKey: `${y}` }
  }
}

function aggregateSales(rows: RawSale[], gran: Granularity) {
  const map = new Map<string, { period: string; ventas: number; comisiones: number; sortKey: string }>()
  for (const row of rows) {
    const d = new Date(row.created_at)
    if (Number.isNaN(d.getTime())) continue
    const { key, label, sortKey } = bucketKey(d, gran)
    const existing = map.get(key) ?? { period: label, ventas: 0, comisiones: 0, sortKey }
    existing.ventas += Number(row.sale_amount) || 0
    existing.comisiones += Number(row.commission_amount) || 0
    map.set(key, existing)
  }
  return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

export function DashboardCharts({ rawSales, salesData, affiliatesData }: DashboardChartsProps) {
  const [granularity, setGranularity] = useState<Granularity>("month")

  const sourceRows: RawSale[] = useMemo(() => {
    if (rawSales && rawSales.length) return rawSales
    if (!salesData || salesData.length === 0) return buildDemoRawSales()
    // Convert legacy month buckets to fake mid-month rows so granularity still works
    const year = new Date().getFullYear()
    return salesData.map((s, i) => ({
      created_at: new Date(year, i, 15).toISOString().split("T")[0],
      sale_amount: s.ventas,
      commission_amount: s.comisiones,
    }))
  }, [rawSales, salesData])

  const chartData = useMemo(() => aggregateSales(sourceRows, granularity), [sourceRows, granularity])

  const topAffiliates = affiliatesData
    ? affiliatesData.slice(0, 5).map(a => ({
        name: a.name.split(" ")[0],
        ventas: a.total_sales || a.ventas || 0,
      }))
    : defaultTopAffiliates

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-1">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-medium">Ventas</CardTitle>
            <CardDescription>Evolución de ventas y comisiones</CardDescription>
          </div>
          <Select value={granularity} onValueChange={(v: Granularity) => setGranularity(v)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((g) => (
                <SelectItem key={g} value={g}>{GRANULARITY_LABELS[g]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.35} />
                <XAxis
                  dataKey="period"
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
