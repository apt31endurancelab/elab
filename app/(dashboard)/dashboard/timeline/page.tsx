import { createClient } from "@/lib/supabase/server"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"
import { demoActivityLog, demoInvoices, demoTasks } from "@/lib/demo-data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { UpcomingAgenda, type AgendaInvoice, type AgendaTask } from "@/components/dashboard/upcoming-agenda"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

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

async function getAgendaData(): Promise<{ invoices: AgendaInvoice[]; tasks: AgendaTask[] }> {
  try {
    const supabase = await createClient()

    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, client_id, invoice_number, type, status, issue_date, validity_days, total, is_recurring, recurring_frequency, clients(name)")

    const invoiceList: AgendaInvoice[] = (invoices || []).map((inv) => {
      const client = inv.clients as unknown as { name: string } | null
      return {
        id: inv.id,
        client_id: inv.client_id,
        client_name: client?.name || "Cliente desconocido",
        invoice_number: inv.invoice_number,
        type: inv.type,
        status: inv.status,
        issue_date: inv.issue_date,
        validity_days: inv.validity_days,
        total: Number(inv.total),
        is_recurring: inv.is_recurring,
        recurring_frequency: inv.recurring_frequency,
      }
    })

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_date, assigned_to")
      .not("due_date", "is", null)

    const taskList: AgendaTask[] = (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      assigned_to: t.assigned_to,
    }))

    return { invoices: invoiceList, tasks: taskList }
  } catch {
    return {
      invoices: (demoInvoices as unknown as AgendaInvoice[]).map(i => ({ ...i, client_name: i.client_name || "" })),
      tasks: (demoTasks as AgendaTask[]).filter(t => t.due_date),
    }
  }
}

async function getActivityData() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { logs: demoActivityLog as ActivityLog[], isDemo: true, isSuperadmin: true, users: {} }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const isSuperadmin = profile?.role === "superadmin"

    // RLS handles filtering: superadmin sees all, others see own
    const { data: logs } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)

    // If superadmin, fetch all user profiles for display
    let users: Record<string, { email: string; full_name: string | null }> = {}
    if (isSuperadmin) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")

      if (profiles) {
        users = Object.fromEntries(profiles.map(p => [p.id, { email: p.email, full_name: p.full_name }]))
      }
    }

    // Add current user to users map
    users[user.id] = { email: user.email || "", full_name: null }

    return { logs: (logs || []) as ActivityLog[], isDemo: false, isSuperadmin, users }
  } catch {
    return { logs: demoActivityLog as ActivityLog[], isDemo: true, isSuperadmin: true, users: {} }
  }
}

export default async function TimelinePage() {
  const [{ logs, isDemo, isSuperadmin, users }, agenda] = await Promise.all([
    getActivityData(),
    getAgendaData(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
        <p className="text-muted-foreground">
          Lo que viene y lo que ya ha pasado, en una sola vista
        </p>
      </div>

      {isDemo && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Modo Demo</AlertTitle>
          <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
            Estás viendo datos de demostración.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Próximamente</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          <UpcomingAgenda invoices={agenda.invoices} tasks={agenda.tasks} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <ActivityTimeline
            logs={logs}
            isDemo={isDemo}
            isSuperadmin={isSuperadmin}
            users={users}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
