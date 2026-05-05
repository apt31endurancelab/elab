"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { logActivityClient } from "@/lib/activity-log-client"
import {
  TASK_STATUS_ICONS,
  TASK_STATUS_ORDER,
  taskStatusAccentClass,
  taskStatusCardClass,
  taskStatusGroupLabel,
  type TaskStatus,
} from "@/lib/task-status"
import {
  loadTasksFromStorage,
  saveTasksToStorage,
  type Task,
} from "./task-list"
import { User } from "lucide-react"

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-chart-4/20 text-chart-4",
  high: "bg-destructive/20 text-destructive",
}

const priorityLabels = { low: "Baja", medium: "Media", high: "Alta" }

export function TaskKanban({ tasks, isDemo = false }: { tasks: Task[]; isDemo?: boolean }) {
  const router = useRouter()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)

  const moveTask = useCallback(async (taskId: string, status: TaskStatus) => {
    if (isDemo) {
      const current = loadTasksFromStorage([])
      const next = current.map((t) => (t.id === taskId ? { ...t, status } : t))
      saveTasksToStorage(next)
      window.dispatchEvent(new Event("tasks-updated"))
      return
    }
    const supabase = createClient()
    await supabase.from("tasks").update({ status }).eq("id", taskId)
    const t = tasks.find((x) => x.id === taskId)
    logActivityClient({
      action: status === "completed" ? "task.completed" : "task.updated",
      entityType: "task",
      entityId: taskId,
      entityName: t?.title,
      metadata: { new_status: status },
    })
    router.refresh()
  }, [isDemo, router, tasks])

  const handleDrop = (status: TaskStatus) => {
    if (draggingId) {
      const t = tasks.find((x) => x.id === draggingId)
      if (t && t.status !== status) moveTask(draggingId, status)
    }
    setDraggingId(null)
    setOverColumn(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {TASK_STATUS_ORDER.map((status) => {
        const Icon = TASK_STATUS_ICONS[status]
        const accent = taskStatusAccentClass(status)
        const columnTasks = tasks.filter((t) => t.status === status)
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setOverColumn(status) }}
            onDragLeave={() => setOverColumn((c) => (c === status ? null : c))}
            onDrop={() => handleDrop(status)}
            className={cn(
              "flex flex-col rounded-lg border bg-muted/30 p-2 min-h-[200px] transition-colors",
              overColumn === status && "ring-2 ring-primary bg-primary/5",
            )}
          >
            <div className={cn("flex items-center gap-2 px-1 py-2 text-sm font-semibold", accent)}>
              <Icon className="h-4 w-4" />
              <span>{taskStatusGroupLabel(status)}</span>
              <span className="ml-auto text-xs bg-background text-muted-foreground border rounded px-1.5 py-0.5 font-normal">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {columnTasks.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6">Sin tareas</div>
              ) : (
                columnTasks.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDraggingId(t.id)}
                    onDragEnd={() => { setDraggingId(null); setOverColumn(null) }}
                    className={cn(
                      "p-3 rounded-md border bg-card cursor-grab active:cursor-grabbing shadow-sm",
                      taskStatusCardClass(t.status),
                      status === "completed" && "opacity-70",
                      draggingId === t.id && "opacity-50",
                    )}
                  >
                    <p className={cn("text-sm font-medium", status === "completed" && "text-muted-foreground")}>
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px]", priorityColors[t.priority])}>
                        {priorityLabels[t.priority]}
                      </Badge>
                      {t.assigned_to && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          <User className="h-2.5 w-2.5 mr-0.5" />
                          {t.assigned_to}
                        </Badge>
                      )}
                      {t.due_date && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(t.due_date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
