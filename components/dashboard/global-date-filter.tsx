"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { CalendarRange } from "lucide-react"

const PRESETS = [
  { value: "24h", label: "Últimas 24 horas" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "month", label: "Este mes" },
  { value: "prev_month", label: "Mes anterior" },
  { value: "all", label: "Todo el histórico" },
]

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : null
}
function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`
}

export function GlobalDateFilter() {
  const router = useRouter()
  const [preset, setPreset] = useState("30d")
  const [compare, setCompare] = useState(false)

  useEffect(() => {
    setPreset(readCookie("g_range") || "30d")
    setCompare(readCookie("g_compare") === "1")
  }, [])

  const changePreset = (value: string) => {
    setPreset(value)
    writeCookie("g_range", value)
    router.refresh()
  }
  const toggleCompare = (value: boolean) => {
    setCompare(value)
    writeCookie("g_compare", value ? "1" : "0")
    router.refresh()
  }

  const label = PRESETS.find((p) => p.value === preset)?.label ?? "Últimos 30 días"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <CalendarRange className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
          {compare && <span className="rounded bg-primary/15 px-1 text-[10px] font-medium text-primary">vs ant.</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Rango de fechas</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preset} onValueChange={changePreset}>
          {PRESETS.map((p) => (
            <DropdownMenuRadioItem key={p.value} value={p.value}>{p.label}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={compare} onCheckedChange={toggleCompare}>
          Comparar vs periodo anterior
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
