import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, Mail, AlertTriangle } from "lucide-react"
import { CreateClientDialog, type Client } from "@/components/dashboard/create-client-dialog"
import { ClientListTable } from "@/components/dashboard/client-list-table"
import { demoClients, demoInvoices, demoClientActivities } from "@/lib/demo-data"

type ClientWithStats = Client & {
  invoiceCount: number
  overdueCount: number
  pendingReminders: number
  totalInvoiced: number
}

async function getClients(): Promise<{ clients: ClientWithStats[]; isDemo: boolean }> {
  try {
    const supabase = await createClient()
    const { data: clients } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })

    const { data: invoices } = await supabase
      .from("invoices")
      .select("client_id, status, total")

    const { data: activities } = await supabase
      .from("client_activities")
      .select("client_id, is_reminder, reminder_completed")

    const enriched: ClientWithStats[] = (clients || []).map(c => {
      const clientInvoices = (invoices || []).filter(i => i.client_id === c.id)
      const clientActivities = (activities || []).filter(a => a.client_id === c.id)
      return {
        ...c,
        invoiceCount: clientInvoices.length,
        overdueCount: clientInvoices.filter(i => i.status === "overdue").length,
        pendingReminders: clientActivities.filter(a => a.is_reminder && !a.reminder_completed).length,
        totalInvoiced: clientInvoices.reduce((sum, i) => sum + Number(i.total), 0),
      }
    })

    return { clients: enriched, isDemo: false }
  } catch {
    const enriched: ClientWithStats[] = demoClients.map(c => {
      const clientInvoices = demoInvoices.filter(i => i.client_id === c.id)
      const clientActivities = demoClientActivities.filter(a => a.client_id === c.id)
      return {
        ...(c as Client),
        invoiceCount: clientInvoices.length,
        overdueCount: clientInvoices.filter(i => i.status === "overdue").length,
        pendingReminders: clientActivities.filter(a => a.is_reminder && !a.reminder_completed).length,
        totalInvoiced: clientInvoices.reduce((sum, i) => sum + Number(i.total), 0),
      }
    })
    return { clients: enriched, isDemo: true }
  }
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

export default async function ClientsPage() {
  const { clients, isDemo } = await getClients()

  const totalClients = clients.length
  const withOverdue = clients.filter(c => c.overdueCount > 0).length
  const totalInvoiced = clients.reduce((sum, c) => sum + c.totalInvoiced, 0)
  const pendingReminders = clients.reduce((sum, c) => sum + c.pendingReminders, 0)

  const stats = [
    {
      title: "Total Clientes",
      value: totalClients.toString(),
      description: "En el CRM",
      icon: Building2,
    },
    {
      title: "Facturado Total",
      value: formatCLP(totalInvoiced),
      description: "Suma de todos los clientes",
      icon: Users,
    },
    {
      title: "Con Facturas Vencidas",
      value: withOverdue.toString(),
      description: "Requieren atención",
      icon: AlertTriangle,
    },
    {
      title: "Recordatorios",
      value: pendingReminders.toString(),
      description: "Pendientes de completar",
      icon: Mail,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona tus clientes para facturación
          </p>
        </div>
        <CreateClientDialog isDemo={isDemo} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Lista de Clientes</CardTitle>
          <CardDescription>Haz clic en un cliente para ver su cronología</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientListTable clients={clients} isDemo={isDemo} />
        </CardContent>
      </Card>
    </div>
  )
}
