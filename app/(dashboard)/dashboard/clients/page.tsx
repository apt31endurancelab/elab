import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Building2, Users, Mail, AlertTriangle } from "lucide-react"
import { CreateClientDialog, type Client } from "@/components/dashboard/create-client-dialog"
import { ImportShopifyClientsButton } from "@/components/dashboard/import-shopify-clients-button"
import { ClientListTable } from "@/components/dashboard/client-list-table"
import { ClientRevival, type RevivalClient } from "@/components/dashboard/client-revival"
import { demoClients, demoInvoices, demoClientActivities } from "@/lib/demo-data"

type ClientWithStats = Client & {
  invoiceCount: number
  overdueCount: number
  pendingReminders: number
  totalInvoiced: number
}

type ActivityRow = { client_id: string; created_at: string; is_reminder: boolean; reminder_completed: boolean }
type InvoiceRow = { client_id: string; status: string; total: number; created_at?: string; issue_date?: string }

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)))
}

function buildRevivalList(
  clients: Client[],
  invoices: InvoiceRow[],
  activities: ActivityRow[],
): RevivalClient[] {
  return clients.map(c => {
    const cInvoices = invoices.filter(i => i.client_id === c.id)
    const cActivities = activities.filter(a => a.client_id === c.id)

    const lastInvoiceDate = cInvoices.reduce<string | null>((latest, i) => {
      const d = i.created_at || i.issue_date || null
      return d && (!latest || d > latest) ? d : latest
    }, null)
    const lastActivityDate = cActivities.reduce<string | null>((latest, a) => {
      return a.created_at && (!latest || a.created_at > latest) ? a.created_at : latest
    }, null)

    const last = [lastInvoiceDate, lastActivityDate].filter(Boolean).sort().pop() || null

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      contact_person: c.contact_person,
      last_activity_at: last,
      invoice_count: cInvoices.length,
      total_invoiced: cInvoices.reduce((sum, i) => sum + Number(i.total), 0),
      days_since_activity: daysSince(last),
    }
  })
}

async function getClients(): Promise<{
  clients: ClientWithStats[]
  revival: RevivalClient[]
  isDemo: boolean
}> {
  try {
    const supabase = await createClient()
    const [{ data: clients }, { data: invoices }, { data: activities }] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("invoices").select("client_id, status, total, created_at, issue_date"),
      supabase.from("client_activities").select("client_id, created_at, is_reminder, reminder_completed"),
    ])

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

    const revival = buildRevivalList(
      (clients || []) as Client[],
      (invoices || []) as InvoiceRow[],
      (activities || []) as ActivityRow[],
    )

    return { clients: enriched, revival, isDemo: false }
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
    const revival = buildRevivalList(
      demoClients as Client[],
      demoInvoices as InvoiceRow[],
      demoClientActivities as ActivityRow[],
    )
    return { clients: enriched, revival, isDemo: true }
  }
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

export default async function ClientsPage() {
  const { clients, revival, isDemo } = await getClients()

  const totalClients = clients.length
  const withOverdue = clients.filter(c => c.overdueCount > 0).length
  const totalInvoiced = clients.reduce((sum, c) => sum + c.totalInvoiced, 0)
  const pendingReminders = clients.reduce((sum, c) => sum + c.pendingReminders, 0)
  const coldCount = revival.filter(c => (c.days_since_activity ?? 9999) > 90).length

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
        <div className="flex items-center gap-2">
          {!isDemo && <ImportShopifyClientsButton />}
          <CreateClientDialog isDemo={isDemo} />
        </div>
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

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="revival">
            Reactivar
            {coldCount > 0 && <span className="ml-2 text-[10px] bg-orange-500/15 text-orange-600 dark:text-orange-400 rounded px-1.5 py-0.5">{coldCount}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Lista de Clientes</CardTitle>
              <CardDescription>Haz clic en un cliente para ver su cronología</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientListTable clients={clients} isDemo={isDemo} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="revival" className="mt-4">
          <ClientRevival clients={revival} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
