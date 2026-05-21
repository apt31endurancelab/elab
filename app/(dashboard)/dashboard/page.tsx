import { createClient } from "@/lib/supabase/server"
import { CustomizableDashboard } from "@/components/dashboard/customizable-dashboard"
import { demoStats, demoAffiliates, demoTasks, demoInvoices } from "@/lib/demo-data"
import type { AgendaInvoice, AgendaTask } from "@/components/dashboard/upcoming-agenda"
import type { RawSale } from "@/components/dashboard/charts"

type RecentTask = { id: string; title: string; status: string; due_date: string | null; assigned_to: string | null }
type RecentInvoice = { id: string; invoice_number: string; client_name: string; total: number; status: string; issue_date: string }

async function getDashboardData() {
  try {
    const supabase = await createClient()

    const [
      { count: affiliatesCount },
      { count: tasksCount },
      { data: salesData },
      { data: affiliates },
      { data: invoicesForAgenda },
      { data: tasksForAgenda },
      { data: recentTasks },
      { data: recentInvoices },
    ] = await Promise.all([
      supabase.from("affiliates").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("affiliate_sales").select("created_at, order_total, commission_amount").order("created_at", { ascending: true }),
      supabase.from("affiliates").select("name, total_sales:order_total").limit(10),
      supabase.from("invoices").select("id, client_id, invoice_number, type, status, issue_date, validity_days, total, is_recurring, recurring_frequency, clients(name)"),
      supabase.from("tasks").select("id, title, description, status, priority, due_date, assigned_to").not("due_date", "is", null),
      supabase.from("tasks").select("id, title, status, due_date, assigned_to").order("created_at", { ascending: false }).limit(8),
      supabase.from("invoices").select("id, invoice_number, total, status, issue_date, clients(name)").order("created_at", { ascending: false }).limit(8),
    ])

    const totalSales = salesData?.reduce((s, x) => s + Number(x.order_total), 0) || 0
    const totalCommissions = salesData?.reduce((s, x) => s + Number(x.commission_amount), 0) || 0

    const rawSales: RawSale[] = (salesData || []).map(s => ({
      created_at: s.created_at,
      sale_amount: Number(s.order_total) || 0,
      commission_amount: Number(s.commission_amount) || 0,
    }))

    const agendaInvoices: AgendaInvoice[] = (invoicesForAgenda || []).map((inv) => {
      const client = inv.clients as unknown as { name: string } | null
      return {
        id: inv.id,
        client_id: inv.client_id,
        client_name: client?.name || "Cliente",
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

    const agendaTasks: AgendaTask[] = (tasksForAgenda || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      assigned_to: t.assigned_to,
    }))

    const recentInvoicesMapped: RecentInvoice[] = (recentInvoices || []).map((inv) => {
      const client = inv.clients as unknown as { name: string } | null
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        client_name: client?.name || "Cliente",
        total: Number(inv.total),
        status: inv.status,
        issue_date: inv.issue_date,
      }
    })

    return {
      stats: {
        totalSales,
        activeAffiliates: affiliatesCount || 0,
        pendingCommissions: totalCommissions,
        pendingTasks: tasksCount || 0,
      },
      rawSales,
      affiliatesData: (affiliates || []).map(a => ({ name: a.name, total_sales: Number(a.total_sales) })),
      agenda: { invoices: agendaInvoices, tasks: agendaTasks },
      recentTasks: (recentTasks || []) as RecentTask[],
      recentInvoices: recentInvoicesMapped,
      isDemo: false,
    }
  } catch {
    return {
      stats: {
        totalSales: demoStats.totalSales,
        activeAffiliates: demoStats.activeAffiliates,
        pendingCommissions: demoStats.pendingCommissions,
        pendingTasks: demoStats.pendingTasks,
      },
      rawSales: undefined,
      affiliatesData: demoAffiliates as unknown as { name: string; total_sales?: number; ventas?: number }[],
      agenda: {
        invoices: (demoInvoices as unknown as AgendaInvoice[]),
        tasks: (demoTasks as AgendaTask[]).filter(t => t.due_date),
      },
      recentTasks: (demoTasks as RecentTask[]).slice(0, 8),
      recentInvoices: (demoInvoices as unknown as RecentInvoice[]).slice(0, 8),
      isDemo: true,
    }
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen general — arrastra los widgets para reordenarlos
          </p>
        </div>
      </div>

      <CustomizableDashboard
        stats={data.stats}
        rawSales={data.rawSales}
        affiliatesData={data.affiliatesData}
        agenda={data.agenda}
        recentTasks={data.recentTasks}
        recentInvoices={data.recentInvoices}
      />
    </div>
  )
}
