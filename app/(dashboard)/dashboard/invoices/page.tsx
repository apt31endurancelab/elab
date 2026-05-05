import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileText, DollarSign, Clock, AlertTriangle } from "lucide-react"
import { demoInvoices } from "@/lib/demo-data"
import { InvoiceListClient } from "@/components/dashboard/invoice-list-client"

export type InvoiceRow = {
  id: string
  client_id: string
  client_name: string
  client_rut?: string
  client_address?: string
  client_phone?: string
  client_contact?: string
  client_email?: string
  invoice_number: string
  type: "cotizacion" | "proforma" | "factura"
  status: string
  issue_date: string
  validity_days: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  is_recurring: boolean
  recurring_frequency: string | null
  notes: string | null
  created_at: string
  items: { description: string; quantity: number; unit_price: number; amount: number }[]
}

async function getInvoices(): Promise<{ invoices: InvoiceRow[]; isDemo: boolean }> {
  try {
    const supabase = await createClient()

    const { data: invoices } = await supabase
      .from("invoices")
      .select("*, clients(name, rut, tax_id, tax_id_type, address, phone, contact_person, email)")
      .order("created_at", { ascending: false })

    if (!invoices) return { invoices: demoInvoices as InvoiceRow[], isDemo: true }

    const invoiceIds = invoices.map(inv => inv.id)
    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .in("invoice_id", invoiceIds)

    const result: InvoiceRow[] = invoices.map(inv => {
      const client = inv.clients as { name: string; rut: string | null; tax_id: string | null; tax_id_type: string | null; address: string; phone: string; contact_person: string; email: string } | null
      const formattedTaxId = client?.tax_id
        ? `${client.tax_id_type || "ID"}: ${client.tax_id}`
        : client?.rut
          ? `RUT: ${client.rut}`
          : undefined
      return {
        ...inv,
        client_name: client?.name || "Cliente desconocido",
        client_rut: formattedTaxId,
        client_address: client?.address || undefined,
        client_phone: client?.phone || undefined,
        client_contact: client?.contact_person || undefined,
        client_email: client?.email || undefined,
        items: (items || []).filter(it => it.invoice_id === inv.id).map(it => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
          amount: Number(it.amount),
        })),
      }
    })

    return { invoices: result, isDemo: false }
  } catch {
    return { invoices: demoInvoices as InvoiceRow[], isDemo: true }
  }
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

export default async function InvoicesPage() {
  const { invoices, isDemo } = await getInvoices()

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const paidTotal = invoices.filter(i => i.status === "paid").reduce((sum, inv) => sum + Number(inv.total), 0)
  const pendingTotal = invoices.filter(i => i.status === "sent" || i.status === "draft").reduce((sum, inv) => sum + Number(inv.total), 0)
  const overdueCount = invoices.filter(i => i.status === "overdue").length

  const stats = [
    {
      title: "Total Facturado",
      value: formatCLP(totalInvoiced),
      description: `${invoices.length} documentos`,
      icon: FileText,
    },
    {
      title: "Cobrado",
      value: formatCLP(paidTotal),
      description: `${invoices.filter(i => i.status === "paid").length} pagadas`,
      icon: DollarSign,
    },
    {
      title: "Pendiente de Cobro",
      value: formatCLP(pendingTotal),
      description: "Borradores + enviadas",
      icon: Clock,
    },
    {
      title: "Vencidas",
      value: overdueCount.toString(),
      description: "Requieren atención",
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground">
            Gestiona cotizaciones y facturas
          </p>
        </div>
        <a href="/dashboard/invoices/new">
          <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Nueva Factura
          </button>
        </a>
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
          <CardTitle className="text-base font-medium">Lista de Facturas</CardTitle>
          <CardDescription>Todas las cotizaciones y facturas emitidas</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceListClient invoices={invoices} isDemo={isDemo} />
        </CardContent>
      </Card>
    </div>
  )
}
