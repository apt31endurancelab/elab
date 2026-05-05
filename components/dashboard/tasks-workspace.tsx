"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TaskList, TEAM_MEMBERS, loadTasksFromStorage, type Task } from "./task-list"
import { TaskKanban } from "./task-kanban"
import { TaskCalendar } from "./task-calendar"
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from "@/lib/task-status"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const ALL = "all"

type DueFilter = "all" | "overdue" | "today" | "week" | "month" | "no_date"

const dueLabels: Record<DueFilter, string> = {
  all: "Cualquier fecha",
  overdue: "Vencidas",
  today: "Vencen hoy",
  week: "Esta semana",
  month: "Este mes",
  no_date: "Sin fecha",
}

function dueMatches(filter: DueFilter, due: string | null): boolean {
  if (filter === "all") return true
  if (filter === "no_date") return !due
  if (!due) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  switch (filter) {
    case "overdue":
      return diffDays < 0
    case "today":
      return diffDays === 0
    case "week":
      return diffDays >= 0 && diffDays <= 7
    case "month":
      return diffDays >= 0 && diffDays <= 31
  }
}

export function TasksWorkspace({ tasks, isDemo }: { tasks: Task[]; isDemo: boolean }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(ALL)
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL)
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL)
  const [dueFilter, setDueFilter] = useState<DueFilter>("all")

  // For demo mode, hydrate from localStorage so filters reflect locally-created tasks
  const [demoTasks, setDemoTasks] = useState<Task[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (isDemo) setDemoTasks(loadTasksFromStorage(tasks))
    setHydrated(true)
  }, [isDemo, tasks])

  useEffect(() => {
    if (!isDemo) return
    const handler = () => setDemoTasks(loadTasksFromStorage(tasks))
    window.addEventListener("tasks-updated", handler)
    return () => window.removeEventListener("tasks-updated", handler)
  }, [isDemo, tasks])

  const sourceTasks = isDemo ? demoTasks : tasks

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sourceTasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) return false
      if (statusFilter !== ALL && t.status !== statusFilter) return false
      if (assigneeFilter !== ALL) {
        if (assigneeFilter === "__unassigned__" && t.assigned_to) return false
        if (assigneeFilter !== "__unassigned__" && t.assigned_to !== assigneeFilter) return false
      }
      if (priorityFilter !== ALL && t.priority !== priorityFilter) return false
      if (!dueMatches(dueFilter, t.due_date)) return false
      return true
    })
  }, [sourceTasks, search, statusFilter, assigneeFilter, priorityFilter, dueFilter])

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== ALL ||
    assigneeFilter !== ALL ||
    priorityFilter !== ALL ||
    dueFilter !== "all"

  const clearFilters = () => {
    setSearch("")
    setStatusFilter(ALL)
    setAssigneeFilter(ALL)
    setPriorityFilter(ALL)
    setDueFilter("all")
  }

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Cargando…</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Lista de Tareas</CardTitle>
        <CardDescription>Todas las tareas del equipo organizadas por estado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título o descripción…"
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {TASK_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Asignado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Cualquier persona</SelectItem>
              <SelectItem value="__unassigned__">Sin asignar</SelectItem>
              {TEAM_MEMBERS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Cualquiera</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dueFilter} onValueChange={(v: DueFilter) => setDueFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Vencimiento" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(dueLabels) as DueFilter[]).map((k) => (
                <SelectItem key={k} value={k}>{dueLabels[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} de {sourceTasks.length}
          </span>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">
            <TaskList tasks={filtered} isDemo={isDemo} />
          </TabsContent>
          <TabsContent value="kanban" className="mt-4">
            <TaskKanban tasks={filtered} isDemo={isDemo} />
          </TabsContent>
          <TabsContent value="calendar" className="mt-4">
            <TaskCalendar tasks={filtered} isDemo={isDemo} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
