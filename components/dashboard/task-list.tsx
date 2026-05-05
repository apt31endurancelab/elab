"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logActivityClient } from "@/lib/activity-log-client"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Clock, CheckCircle2, Circle, AlertCircle, AlertTriangle, User, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  TASK_STATUS_ORDER,
  taskStatusAccentClass,
  taskStatusCardClass,
  taskStatusGroupLabel,
  TASK_STATUS_ICONS,
  type TaskStatus,
} from "@/lib/task-status"
import { EditTaskDialog } from "./edit-task-dialog"

export type Task = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: "low" | "medium" | "high"
  due_date: string | null
  assigned_to: string | null
  created_at: string
}

export const TEAM_MEMBERS = ["Hector", "Carlos", "Oriol", "Ale"] as const

const TASKS_STORAGE_KEY = "endurancelab_tasks"

export function loadTasksFromStorage(fallback: Task[]): Task[] {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return fallback
}

export function saveTasksToStorage(tasks: Task[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-chart-4/20 text-chart-4",
  high: "bg-destructive/20 text-destructive",
}

const priorityLabels = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
}

function getDueDateWarning(dueDate: string | null, status: string): { level: "critical" | "warning" | "soon" | null; daysLeft: number } {
  if (!dueDate || status === "completed") return { level: null, daysLeft: Infinity }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffMs = due.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return { level: "critical", daysLeft }
  if (daysLeft <= 1) return { level: "critical", daysLeft }
  if (daysLeft <= 3) return { level: "warning", daysLeft }
  if (daysLeft <= 7) return { level: "soon", daysLeft }
  return { level: null, daysLeft }
}

function DeadlineWarning({ dueDate, status }: { dueDate: string | null; status: string }) {
  const { level, daysLeft } = getDueDateWarning(dueDate, status)
  if (!level) return null

  const config = {
    critical: {
      bg: "bg-destructive/15 border-destructive/30 text-destructive",
      icon: "text-destructive",
      message: daysLeft < 0
        ? `Vencida hace ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? "s" : ""}`
        : daysLeft === 0
        ? "Vence HOY"
        : "Vence MANANA",
    },
    warning: {
      bg: "bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400",
      icon: "text-orange-500",
      message: `Quedan ${daysLeft} dias`,
    },
    soon: {
      bg: "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400",
      icon: "text-yellow-500",
      message: `Quedan ${daysLeft} dias`,
    },
  }

  const c = config[level]
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border", c.bg)}>
      <AlertTriangle className={cn("h-3 w-3", c.icon)} />
      {c.message}
    </div>
  )
}

export function TaskList({ tasks, isDemo = false }: { tasks: Task[]; isDemo?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const updateDemoStorage = useCallback((updater: (prev: Task[]) => Task[]) => {
    const current = loadTasksFromStorage([])
    const next = updater(current)
    saveTasksToStorage(next)
    window.dispatchEvent(new Event("tasks-updated"))
  }, [])

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (isDemo) {
      updateDemoStorage(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
      return
    }

    setLoading(taskId)
    const supabase = createClient()

    await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId)

    const task = tasks.find(t => t.id === taskId)
    const action = status === "completed" ? "task.completed" as const : "task.updated" as const
    logActivityClient({ action, entityType: "task", entityId: taskId, entityName: task?.title, metadata: { new_status: status } })

    router.refresh()
    setLoading(null)
  }

  const deleteTask = async (taskId: string) => {
    if (isDemo) {
      updateDemoStorage(prev => prev.filter(t => t.id !== taskId))
      return
    }

    const task = tasks.find(t => t.id === taskId)

    setLoading(taskId)
    const supabase = createClient()

    await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)

    logActivityClient({ action: "task.deleted", entityType: "task", entityId: taskId, entityName: task?.title })

    router.refresh()
    setLoading(null)
  }

  const handleTaskUpdated = (updated: Task) => {
    if (isDemo) {
      updateDemoStorage(prev => prev.map(t => t.id === updated.id ? updated : t))
    } else {
      router.refresh()
    }
    setEditingTask(null)
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Circle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No hay tareas todavia</p>
        <p className="text-sm text-muted-foreground">Crea una nueva tarea para empezar</p>
      </div>
    )
  }

  const groupedTasks = TASK_STATUS_ORDER.reduce<Record<TaskStatus, Task[]>>((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status)
    return acc
  }, { pending: [], in_progress: [], stuck: [], completed: [] })

  return (
    <div className="space-y-6">
      {TASK_STATUS_ORDER.map((status) => {
        const StatusIcon = TASK_STATUS_ICONS[status]
        const statusTasks = groupedTasks[status]

        if (statusTasks.length === 0) return null

        const accent = taskStatusAccentClass(status)
        const isCompleted = status === "completed"

        return (
          <div key={status} className="space-y-2">
            <div className={cn("flex items-center gap-2 text-sm font-semibold", accent)}>
              <StatusIcon className="h-4 w-4" />
              <span>{taskStatusGroupLabel(status)}</span>
              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-normal">
                {statusTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {statusTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border bg-card transition-opacity",
                    taskStatusCardClass(task.status),
                    loading === task.id && "opacity-50",
                    isCompleted && "opacity-60",
                  )}
                >
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={(checked) =>
                      updateTaskStatus(task.id, checked ? "completed" : "pending")
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium",
                      isCompleted && "text-muted-foreground"
                    )}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={priorityColors[task.priority]}>
                        {priorityLabels[task.priority]}
                      </Badge>
                      {task.assigned_to && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          <User className="h-3 w-3 mr-1" />
                          {task.assigned_to}
                        </Badge>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.due_date).toLocaleDateString("es-ES")}
                        </span>
                      )}
                      <DeadlineWarning dueDate={task.due_date} status={task.status} />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingTask(task)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "pending")}>
                        <Circle className="h-4 w-4 mr-2" />
                        Marcar como Pendiente
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "in_progress")}>
                        <Clock className="h-4 w-4 mr-2" />
                        Marcar En Progreso
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "stuck")}>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Marcar Estancada
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "completed")}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como Completada
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteTask(task.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <EditTaskDialog
        task={editingTask}
        open={editingTask !== null}
        onOpenChange={(open) => { if (!open) setEditingTask(null) }}
        onSaved={handleTaskUpdated}
        isDemo={isDemo}
      />
    </div>
  )
}
