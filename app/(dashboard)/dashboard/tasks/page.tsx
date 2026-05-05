import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateTaskDialog } from "@/components/dashboard/create-task-dialog"
import { TasksWorkspace } from "@/components/dashboard/tasks-workspace"
import { demoTasks } from "@/lib/demo-data"
import { type Task } from "@/components/dashboard/task-list"

async function getTasks(): Promise<{ tasks: Task[]; isDemo: boolean }> {
  try {
    const supabase = await createClient()
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })

    return { tasks: (tasks || []) as Task[], isDemo: false }
  } catch {
    return { tasks: demoTasks as Task[], isDemo: true }
  }
}

export default async function TasksPage() {
  const { tasks, isDemo } = await getTasks()

  const counts = {
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    stuck: tasks.filter(t => t.status === "stuck").length,
    completed: tasks.filter(t => t.status === "completed").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground">
            Gestiona las tareas del equipo
          </p>
        </div>
        <CreateTaskDialog isDemo={isDemo} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-slate-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.pending}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">En Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.in_progress}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Estancadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.stuck}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.completed}</div>
          </CardContent>
        </Card>
      </div>

      <TasksWorkspace tasks={tasks} isDemo={isDemo} />
    </div>
  )
}
