import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  FileText,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { demoClients, demoInvoices, demoClientActivities } from "@/lib/demo-data"
import { ClientTimeline } from "@/components/dashboard/client-timeline"
import { invoiceStatusBadgeClass, invoiceStatusLabel, invoiceTypeLabel } from "@/lib/invoice-status"
import { formatTaxId } from "@/lib/tax-id"

type ClientDetail = {
  id: string
  name: string
  rut: string | null
  tax_id_type?: string | null
  tax_id?: string | null
  country_code?: string | null
  address: string | null
  phone: string | null
  contact_person: string | null
  email: string | null
  notes: string | null
  created_at: string
}

type ClientInvoice = {
  id: string
  invoice_number: string
  type: string
  status: string
  issue_date: string
  total: number
}

type Activity = {
  id: string
  client_id: string
  invoice_id: string | null
  type: string
  title: string
  description: string | null
  is_reminder: boolean
  reminder_date: string | null
  reminder_completed: boolean
  created_at: string
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

async function getClientData(clientId: string): Promise<{
  client: ClientDetail
  invoices: ClientInvoice[]
  activities: Activity[]
  isDemo: boolean
} | null> {
  try {
    const supabase = await createClient()

    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single()

    if (!client) return null

    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, type, status, issue_date, total")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })

    const { data: activities } = await supabase
      .from("client_activities")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })

    return {
      client,
      invoices: invoices || [],
      activities: activities || [],
      isDemo: false,
    }
  } catch {
    const client = demoClients.find(c => c.id === clientId)
    if (!client) return null

    const invoices = demoInvoices
      .filter(inv => inv.client_id === clientId)
      .map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        type: inv.type,
        status: inv.status,
        issue_date: inv.issue_date,
        total: inv.total,
      }))

    const activities = demoClientActivities.filter(a => a.client_id === clientId)

    return {
      client: client as ClientDetail,
      invoices,
      activities,
      isDemo: true,
    }
  }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getClientData(id)

  if (!data) notFound()

  const { client, invoices, activities, isDemo } = data

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const paidTotal = invoices.filter(i => i.status === "paid").reduce((sum, inv) => sum + Number(inv.total), 0)
  const overdueCount = invoices.filter(i => i.status === "overdue").length
  const pendingReminders = activities.filter(a => a.is_reminder && !a.reminder_completed).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">
            Cliente desde {new Date(client.created_at).toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
          </p>
        </div>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {overdueCount} factura{overdueCount > 1 ? "s" : ""} vencida{overdueCount > 1 ? "s" : ""}
          </Badge>
        )}
        {pendingReminders > 0 && (
          <Badge variant="outline" className="text-sm px-3 py-1 border-orange-500 text-orange-600 dark:text-orange-400">
            {pendingReminders} recordatorio{pendingReminders > 1 ? "s" : ""} pendiente{pendingReminders > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Client info + Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formatTaxId(client) && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-mono">{formatTaxId(client)}</span>
              </div>
            )}
            {client.contact_person && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{client.contact_person}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`tel:${client.phone}`} className="text-primary hover:underline">{client.phone}</a>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{client.address}</span>
              </div>
            )}
            {client.notes && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="lg:col-span-2 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Facturado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCLP(totalInvoiced)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cobrado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCLP(paidTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCLP(totalInvoiced - paidTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{invoices.length}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoices + Timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">Facturas</CardTitle>
              <CardDescription>Documentos emitidos a este cliente</CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href="/dashboard/invoices/new">
                <FileText className="h-4 w-4 mr-1" />
                Nueva
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(inv.issue_date).toLocaleDateString("es-CL")}
                      </TableCell>
                      <TableCell className="font-medium">{formatCLP(Number(inv.total))}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={invoiceStatusBadgeClass(inv.status)}>
                          {invoiceStatusLabel(inv.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay facturas para este cliente
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Cronología</CardTitle>
            <CardDescription>Historial de actividad con este cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientTimeline
              activities={activities}
              clientId={client.id}
              isDemo={isDemo}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
