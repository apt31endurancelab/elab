import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TaskList } from "@/components/dashboard/task-list"
import { CreateTaskDialog } from "@/components/dashboard/create-task-dialog"
import { demoTasks } from "@/lib/demo-data"

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  assigned_to: string | null
  created_at: string
}

async function getTasks(): Promise<{ tasks: Task[]; isDemo: boolean }> {
  try {
    const supabase = await createClient()
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
    
    return { tasks: tasks || [], isDemo: false }
  } catch {
    return { tasks: demoTasks as Task[], isDemo: true }
  }
}

export default async function TasksPage() {
  const { tasks, isDemo } = await getTasks()

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter(t => t.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter(t => t.status === "in_progress").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter(t => t.status === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Lista de Tareas</CardTitle>
          <CardDescription>Todas las tareas del equipo organizadas por estado</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskList tasks={tasks} isDemo={isDemo} />
        </CardContent>
      </Card>
    </div>
  )
}
