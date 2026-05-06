"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, AlertTriangle, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Alert = {
  id: string
  level: "critical" | "warning" | "info"
  type: "invoice_overdue" | "invoice_due_soon" | "task_overdue" | "task_due_soon"
  title: string
  description?: string
  href?: string
  date: string
}

const levelStyles: Record<Alert["level"], { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  warning: { icon: Clock, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  info: { icon: CheckCircle2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
}

export function NotificationsBell({ isDemo = false }: { isDemo?: boolean }) {
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (isDemo) {
      setAlerts([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      } else {
        setAlerts([])
      }
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo])

  const count = alerts?.length ?? 0
  const criticalCount = alerts?.filter(a => a.level === "critical").length ?? 0

  return (
    <Popover onOpenChange={(open) => { if (open) load() }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notificaciones">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-medium flex items-center justify-center",
              criticalCount > 0 ? "bg-red-500 text-white" : "bg-orange-500 text-white",
            )}>
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-medium">Notificaciones</p>
          {count > 0 && <Badge variant="outline" className="text-[10px]">{count}</Badge>}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {loading && alerts === null ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Cargando…</p>
          ) : count === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Todo al día</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {alerts!.map((a) => {
                const cfg = levelStyles[a.level]
                const Icon = cfg.icon
                const content = (
                  <div className={cn("flex items-start gap-2 p-2 rounded-md border", cfg.bg)}>
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{a.title}</p>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                      )}
                    </div>
                  </div>
                )
                return a.href ? (
                  <Link key={a.id} href={a.href} className="block hover:opacity-90">
                    {content}
                  </Link>
                ) : (
                  <div key={a.id}>{content}</div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
