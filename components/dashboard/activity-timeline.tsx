"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  LogIn,
  LogOut,
  CheckSquare,
  PenLine,
  CheckCircle2,
  Building2,
  UserPlus,
  Shield,
  FileText,
  Send,
  DollarSign,
  Users,
  ShoppingBag,
  CircleDot,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface ActivityTimelineProps {
  logs: ActivityLog[]
  isDemo: boolean
  isSuperadmin: boolean
  users: Record<string, { email: string; full_name: string | null }>
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  "user.login":           { icon: LogIn,        color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/20", label: "Inicio de sesión" },
  "user.logout":          { icon: LogOut,       color: "text-gray-400",    bgColor: "bg-gray-500/10 border-gray-500/20",    label: "Cierre de sesión" },
  "task.created":         { icon: CheckSquare,  color: "text-blue-500",    bgColor: "bg-blue-500/10 border-blue-500/20",    label: "Tarea creada" },
  "task.updated":         { icon: PenLine,      color: "text-amber-500",   bgColor: "bg-amber-500/10 border-amber-500/20",  label: "Tarea actualizada" },
  "task.completed":       { icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/20", label: "Tarea completada" },
  "client.created":       { icon: Building2,    color: "text-purple-500",  bgColor: "bg-purple-500/10 border-purple-500/20", label: "Cliente creado" },
  "client.updated":       { icon: Building2,    color: "text-purple-400",  bgColor: "bg-purple-500/10 border-purple-500/20", label: "Cliente actualizado" },
  "invoice.created":      { icon: FileText,     color: "text-blue-500",    bgColor: "bg-blue-500/10 border-blue-500/20",    label: "Factura creada" },
  "invoice.sent":         { icon: Send,         color: "text-sky-500",     bgColor: "bg-sky-500/10 border-sky-500/20",      label: "Factura enviada" },
  "invoice.paid":         { icon: DollarSign,   color: "text-emerald-500", bgColor: "bg-emerald-500/10 border-emerald-500/20", label: "Factura pagada" },
  "affiliate.created":    { icon: Users,        color: "text-indigo-500",  bgColor: "bg-indigo-500/10 border-indigo-500/20", label: "Afiliado creado" },
  "affiliate.updated":    { icon: Users,        color: "text-indigo-400",  bgColor: "bg-indigo-500/10 border-indigo-500/20", label: "Afiliado actualizado" },
  "user.invited":         { icon: UserPlus,     color: "text-violet-500",  bgColor: "bg-violet-500/10 border-violet-500/20", label: "Usuario invitado" },
  "user.role_changed":    { icon: Shield,       color: "text-orange-500",  bgColor: "bg-orange-500/10 border-orange-500/20", label: "Rol cambiado" },
  "shopify.order_synced": { icon: ShoppingBag,  color: "text-green-500",   bgColor: "bg-green-500/10 border-green-500/20",  label: "Pedido Shopify" },
}

const defaultConfig = { icon: CircleDot, color: "text-muted-foreground", bgColor: "bg-muted", label: "Acción" }

const entityTypeLabels: Record<string, string> = {
  task: "Tareas",
  client: "Clientes",
  invoice: "Facturas",
  affiliate: "Afiliados",
  user: "Usuarios",
  shopify: "Shopify",
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return "hace unos segundos"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "ayer"
  if (days < 7) return `hace ${days} días`
  return new Date(date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Hoy"
  if (date.toDateString() === yesterday.toDateString()) return "Ayer"

  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function getMetadataDescription(log: ActivityLog): string | null {
  const meta = log.metadata
  if (!meta || Object.keys(meta).length === 0) return null

  if (meta.client_name && meta.total) {
    return `${meta.client_name} — ${Number(meta.total).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })}`
  }
  if (meta.role) return `Rol: ${meta.role}`
  if (meta.old_role && meta.new_role) return `${meta.old_role} → ${meta.new_role}`
  if (meta.old_status && meta.new_status) return `${meta.old_status} → ${meta.new_status}`
  if (meta.commission_rate) return `Comisión: ${meta.commission_rate}% — Código: ${meta.discount_code || "N/A"}`
  if (meta.priority) return `Prioridad: ${meta.priority}`
  if (meta.contact_person) return `Contacto: ${meta.contact_person}`
  if (meta.field && meta.old_value !== undefined) return `${meta.field}: ${meta.old_value} → ${meta.new_value}`

  return null
}

function groupLogsByDay(logs: ActivityLog[]): Map<string, ActivityLog[]> {
  const groups = new Map<string, ActivityLog[]>()
  for (const log of logs) {
    const dayKey = new Date(log.created_at).toDateString()
    if (!groups.has(dayKey)) groups.set(dayKey, [])
    groups.get(dayKey)!.push(log)
  }
  return groups
}

export function ActivityTimeline({ logs, isSuperadmin, users }: ActivityTimelineProps) {
  const [filterUser, setFilterUser] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterDate, setFilterDate] = useState<string>("")

  const uniqueUsers = useMemo(() => {
    const ids = [...new Set(logs.map(l => l.user_id))]
    return ids.map(id => ({
      id,
      label: users[id]?.full_name || users[id]?.email || id.slice(0, 8),
    }))
  }, [logs, users])

  const uniqueEntityTypes = useMemo(() => {
    return [...new Set(logs.map(l => l.entity_type))]
  }, [logs])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterUser !== "all" && log.user_id !== filterUser) return false
      if (filterType !== "all" && log.entity_type !== filterType) return false
      if (filterDate) {
        const logDate = new Date(log.created_at).toISOString().split("T")[0]
        if (logDate !== filterDate) return false
      }
      return true
    })
  }, [logs, filterUser, filterType, filterDate])

  const dayGroups = useMemo(() => groupLogsByDay(filteredLogs), [filteredLogs])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {isSuperadmin && (
              <div className="space-y-1.5 min-w-[180px]">
                <Label className="text-xs text-muted-foreground">Persona</Label>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueEntityTypes.map(t => (
                    <SelectItem key={t} value={t}>{entityTypeLabels[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <Input
                type="date"
                className="h-9"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            No hay actividad registrada
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {[...dayGroups.entries()].map(([dayKey, dayLogs]) => (
            <div key={dayKey}>
              {/* Day header */}
              <div className="sticky top-14 z-20 mb-4">
                <div className="inline-flex items-center rounded-full border bg-background/95 px-4 py-1.5 text-sm font-medium backdrop-blur">
                  {formatDayHeader(dayLogs[0].created_at)}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {dayLogs.length}
                  </Badge>
                </div>
              </div>

              {/* Day entries */}
              <div className="relative ml-4 pl-6 border-l-2 border-border/50 space-y-1">
                {dayLogs.map((log) => {
                  const config = actionConfig[log.action] || defaultConfig
                  const Icon = config.icon
                  const userInfo = users[log.user_id]
                  const userName = userInfo?.full_name || userInfo?.email || log.user_id.slice(0, 8)
                  const metaDesc = getMetadataDescription(log)

                  return (
                    <div key={log.id} className="relative group">
                      {/* Icon on the line */}
                      <div className={cn(
                        "absolute -left-[31px] top-3 flex h-5 w-5 items-center justify-center rounded-full border",
                        config.bgColor
                      )}>
                        <Icon className={cn("h-3 w-3", config.color)} />
                      </div>

                      {/* Content card */}
                      <div className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 ml-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* User avatar */}
                            {isSuperadmin && (
                              <div className="flex-shrink-0 mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {(userInfo?.email || "?").charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] px-1.5 py-0 border", config.bgColor, config.color)}
                                >
                                  {config.label}
                                </Badge>
                                {log.entity_name && (
                                  <span className="text-sm font-medium truncate">
                                    {log.entity_name}
                                  </span>
                                )}
                              </div>
                              {metaDesc && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {metaDesc}
                                </p>
                              )}
                              {isSuperadmin && (
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                  por {userName}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {timeAgo(log.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
