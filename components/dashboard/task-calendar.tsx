"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, CalendarDays, User } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  TASK_STATUS_ICONS,
  taskStatusAccentClass,
  taskStatusCardClass,
  taskStatusLabel,
} from "@/lib/task-status"
import { type Task } from "./task-list"

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function TaskCalendar({ tasks }: { tasks: Task[]; isDemo?: boolean }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!t.due_date) continue
      ;(map[t.due_date] ||= []).push(t)
    }
    return map
  }, [tasks])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayStr = today.toISOString().split("T")[0]

  const cells: { day: number; dateStr: string; isCurrentMonth: boolean }[] = []
  const prevMonthDays = getDaysInMonth(year, month - 1)
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ day: d, dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ day: d, dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isCurrentMonth: false })
  }

  const prev = () => { if (month === 0) { setMonth(11); setYear(year - 1) } else setMonth(month - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(year + 1) } else setMonth(month + 1) }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  const onDayClick = (dateStr: string) => {
    if ((tasksByDate[dateStr] || []).length === 0) return
    setSelected(dateStr)
    setDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg font-semibold min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </CardTitle>
          <Button variant="outline" size="icon" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>
          <CalendarDays className="h-4 w-4 mr-1" />
          Hoy
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {DAY_NAMES.map((d) => (
            <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {cells.map((cell, i) => {
            const dayTasks = tasksByDate[cell.dateStr] || []
            const isToday = cell.dateStr === todayStr
            const has = dayTasks.length > 0
            return (
              <div
                key={i}
                onClick={() => onDayClick(cell.dateStr)}
                className={cn(
                  "bg-background min-h-[110px] p-1.5 transition-colors",
                  !cell.isCurrentMonth && "bg-muted/50",
                  has && "cursor-pointer hover:bg-accent/50",
                  isToday && "ring-2 ring-primary ring-inset",
                )}
              >
                <div className={cn(
                  "text-sm mb-1 font-medium",
                  !cell.isCurrentMonth && "text-muted-foreground/50",
                  isToday && "text-primary font-bold",
                )}>{cell.day}</div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((t) => {
                    const Icon = TASK_STATUS_ICONS[t.status]
                    return (
                      <div key={t.id} className={cn("flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight border", taskStatusCardClass(t.status))}>
                        <Icon className={cn("h-2.5 w-2.5 shrink-0", taskStatusAccentClass(t.status))} />
                        <span className={cn("truncate", t.status === "completed" && "line-through opacity-70")}>{t.title}</span>
                      </div>
                    )
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} más</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selected && new Date(selected + "T12:00:00").toLocaleDateString("es-CL", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selected && (tasksByDate[selected] || []).map((t) => {
              const Icon = TASK_STATUS_ICONS[t.status]
              return (
                <div key={t.id} className={cn("p-3 rounded-lg border", taskStatusCardClass(t.status))}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("h-4 w-4", taskStatusAccentClass(t.status))} />
                    <span className={cn("text-sm font-medium", t.status === "completed" && "text-muted-foreground")}>
                      {t.title}
                    </span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {taskStatusLabel(t.status)}
                    </Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  {t.assigned_to && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" /> {t.assigned_to}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
