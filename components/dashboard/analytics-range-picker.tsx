"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const PRESETS = [
  { value: "24h", label: "24 horas" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "month", label: "Este mes" },
  { value: "prev_month", label: "Mes anterior" },
  { value: "all", label: "Todo" },
]

export function AnalyticsRangePicker({ range, compare }: { range: string; compare: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const navigate = (next: { range?: string; compare?: boolean }) => {
    const sp = new URLSearchParams(params.toString())
    const r = next.range ?? range
    const c = next.compare ?? compare
    sp.set("range", r)
    if (c) sp.set("compare", "1")
    else sp.delete("compare")
    router.push(`${pathname}?${sp.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={range === p.value ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => navigate({ range: p.value })}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
        <Switch id="cmp" checked={compare} onCheckedChange={(v) => navigate({ compare: v })} />
        <Label htmlFor="cmp" className="text-xs">Comparar vs periodo anterior</Label>
      </div>
    </div>
  )
}
