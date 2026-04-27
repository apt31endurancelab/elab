import { createClient } from "@/lib/supabase/server"
import { demoInvoices, demoTasks } from "@/lib/demo-data"
import { InvoiceCalendar, type CalendarInvoice, type CalendarTask } from "@/components/dashboard/invoice-calendar"

async function getCalendarData(): Promise<{ invoices: CalendarInvoice[]; tasks: CalendarTask[] }> {
  try {
    const supabase = await createClient()

    // Fetch invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*, clients(name, rut, address, phone, contact_person, email)")
      .order("issue_date", { ascending: false })

    let invoiceResult: CalendarInvoice[] = []
    if (invoices) {
      const invoiceIds = invoices.map(inv => inv.id)
      const { data: items } = await supabase
        .from("invoice_items")
        .select("*")
        .in("invoice_id", invoiceIds)

      invoiceResult = invoices.map(inv => {
        const client = inv.clients as { name: string; rut: string; address: string; phone: string; contact_person: string; email: string } | null
        return {
          id: inv.id,
          client_id: inv.client_id,
          client_name: client?.name || "Cliente desconocido",
          client_rut: client?.rut || undefined,
          client_address: client?.address || undefined,
          client_phone: client?.phone || undefined,
          client_contact: client?.contact_person || undefined,
          client_email: client?.email || undefined,
          invoice_number: inv.invoice_number,
          type: inv.type,
          status: inv.status,
          issue_date: inv.issue_date,
          validity_days: inv.validity_days,
          subtotal: Number(inv.subtotal),
          tax_rate: Number(inv.tax_rate),
          tax_amount: Number(inv.tax_amount),
          total: Number(inv.total),
          is_recurring: inv.is_recurring,
          recurring_frequency: inv.recurring_frequency,
          notes: inv.notes,
          created_at: inv.created_at,
          items: (items || []).filter(it => it.invoice_id === inv.id).map(it => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: Number(it.unit_price),
            amount: Number(it.amount),
          })),
        }
      })
    }

    // Fetch tasks with due dates
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })

    const taskResult: CalendarTask[] = (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      assigned_to: t.assigned_to,
    }))

    return { invoices: invoiceResult, tasks: taskResult }
  } catch {
    const demoTasksWithDates = (demoTasks as CalendarTask[]).filter(t => t.due_date)
    return { invoices: demoInvoices as unknown as CalendarInvoice[], tasks: demoTasksWithDates }
  }
}

export default async function InvoiceCalendarPage() {
  const { invoices, tasks } = await getCalendarData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
        <p className="text-muted-foreground">
          Visualiza facturas, vencimientos y tareas programadas
        </p>
      </div>

      <InvoiceCalendar invoices={invoices} tasks={tasks} />
    </div>
  )
}
