import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderInvoiceHtml } from "@/lib/invoice-html"
import { sendEmail } from "@/lib/email"
import { invoiceTypeLabel } from "@/lib/invoice-status"

type ClientRow = {
  name: string | null
  rut: string | null
  tax_id: string | null
  tax_id_type: string | null
  address: string | null
  phone: string | null
  contact_person: string | null
  email: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => ({})) as {
    to?: string
    cc?: string
    subject?: string
    message?: string
  }

  let supabase
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: "Supabase no está configurado" }, { status: 500 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("*, clients(name, rut, tax_id, tax_id_type, address, phone, contact_person, email)")
    .eq("id", id)
    .single()

  if (invErr || !invoice) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)

  const client = invoice.clients as unknown as ClientRow | null
  const to = (body.to && body.to.trim()) || client?.email || ""
  if (!to) {
    return NextResponse.json({ error: "Falta el email destinatario" }, { status: 400 })
  }

  const formattedTaxId = client?.tax_id
    ? `${client.tax_id_type || "ID"}: ${client.tax_id}`
    : client?.rut
      ? `RUT: ${client.rut}`
      : null

  const html = renderInvoiceHtml({
    invoice_number: invoice.invoice_number,
    type: invoice.type,
    issue_date: invoice.issue_date,
    validity_days: invoice.validity_days,
    client_name: client?.name || "Cliente",
    client_rut: formattedTaxId,
    client_address: client?.address,
    client_phone: client?.phone,
    client_contact: client?.contact_person,
    client_email: client?.email,
    subtotal: Number(invoice.subtotal),
    tax_rate: Number(invoice.tax_rate),
    tax_amount: Number(invoice.tax_amount),
    total: Number(invoice.total),
    notes: invoice.notes,
    items: (items || []).map(it => ({
      description: it.description,
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      amount: Number(it.amount),
    })),
  })

  const typeLabel = invoiceTypeLabel(invoice.type)
  const subject = body.subject || `${typeLabel} ${invoice.invoice_number} — Endurance Lab`

  const intro = body.message
    ? `<div style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-left: 3px solid #111; font-size: 13px; line-height: 1.6;">${body.message.replace(/\n/g, "<br>")}</div>`
    : ""

  const result = await sendEmail({
    to,
    cc: body.cc || undefined,
    subject,
    html: intro + html,
    replyTo: user.email || undefined,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, missingConfig: "missingConfig" in result ? result.missingConfig : false },
      { status: result.ok ? 200 : "missingConfig" in result && result.missingConfig ? 503 : 502 },
    )
  }

  // Mark invoice as sent and log activity
  await supabase.from("invoices").update({ status: "sent" }).eq("id", id)
  await supabase.from("client_activities").insert({
    user_id: user.id,
    client_id: invoice.client_id,
    invoice_id: id,
    type: "invoice_sent",
    title: `${typeLabel} ${invoice.invoice_number} enviada`,
    description: `Enviada a ${to}`,
  })

  return NextResponse.json({ ok: true, id: result.id })
}
