import { invoiceTypeLabel } from "@/lib/invoice-status"

export type InvoiceHtmlInput = {
  invoice_number: string
  type: "cotizacion" | "proforma" | "factura" | string
  issue_date: string
  validity_days: number
  client_name: string
  client_rut?: string | null
  client_address?: string | null
  client_phone?: string | null
  client_contact?: string | null
  client_email?: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes?: string | null
  items: { description: string; quantity: number; unit_price: number; amount: number }[]
}

function formatCLP(amount: number) {
  return `$${Number(amount).toLocaleString("es-CL")}`
}

export function renderInvoiceHtml(invoice: InvoiceHtmlInput): string {
  const typeUpper = invoiceTypeLabel(invoice.type).toUpperCase()
  const isQuote = invoice.type === "cotizacion" || invoice.type === "proforma"
  const dateFormatted = new Date(invoice.issue_date).toLocaleDateString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })

  const itemsHtml = invoice.items.map(item => `
    <tr style="border-bottom: 1px solid #e5e5e5;">
      <td style="padding: 12px 8px; font-size: 13px;">${item.description}</td>
      <td style="padding: 12px 8px; text-align: right; font-size: 13px;">${item.quantity}</td>
      <td style="padding: 12px 8px; text-align: right; font-size: 13px;">${formatCLP(item.unit_price)}</td>
      <td style="padding: 12px 8px; text-align: right; font-size: 13px;">${formatCLP(item.amount)}</td>
    </tr>
  `).join("")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${typeUpper} ${invoice.invoice_number}</title>
</head>
<body style="margin:0; padding:0; background:#f6f7f8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; color:#111;">
  <div style="max-width: 640px; margin: 24px auto; background: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 28px;">
      <div>
        <div style="font-size: 26px; font-weight: 700; letter-spacing: 1px;">e.lab</div>
        <div style="font-size: 11px; color:#555; margin-top: 4px;">Endurance Lab — Santiago, Chile</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size: 20px; font-weight: 700; letter-spacing: 2px;">${typeUpper}</div>
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; margin-top: 4px;">${invoice.invoice_number}</div>
        <div style="font-size: 12px; color:#555; margin-top: 2px;">${dateFormatted}</div>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; gap: 24px; margin-bottom: 28px;">
      <div style="flex: 1; line-height: 1.7; font-size: 13px;">
        <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Cliente</div>
        <p style="font-weight: 600; margin: 0;">${invoice.client_name}</p>
        ${invoice.client_rut ? `<p style="margin:0;">${invoice.client_rut}</p>` : ""}
        ${invoice.client_address ? `<p style="margin:0;">${invoice.client_address}</p>` : ""}
        ${invoice.client_contact ? `<p style="margin:0;">${invoice.client_contact}</p>` : ""}
        ${invoice.client_phone ? `<p style="margin:0;">${invoice.client_phone}</p>` : ""}
        ${invoice.client_email ? `<p style="margin:0;">${invoice.client_email}</p>` : ""}
      </div>
      ${isQuote ? `
      <div style="text-align:right; line-height: 1.7; font-size: 13px;">
        <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Validez</div>
        <p style="margin:0;">${invoice.validity_days} días</p>
      </div>` : ""}
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 2px solid #111;">
          <th style="text-align:left; padding: 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Descripción</th>
          <th style="text-align:right; padding: 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Cant.</th>
          <th style="text-align:right; padding: 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Precio</th>
          <th style="text-align:right; padding: 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Importe</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div style="display:flex; justify-content:flex-end;">
      <div style="width: 260px; font-size: 13px;">
        <div style="display:flex; justify-content:space-between; padding: 4px 0;">
          <span style="color:#555;">Subtotal</span>
          <span>${formatCLP(invoice.subtotal)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding: 4px 0; border-bottom: 1px solid #ddd;">
          <span style="color:#555;">Impuesto ${invoice.tax_rate}%</span>
          <span>${formatCLP(invoice.tax_amount)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding: 8px 0; font-weight: 700; font-size: 15px;">
          <span>Total</span>
          <span>${formatCLP(invoice.total)}</span>
        </div>
      </div>
    </div>

    ${invoice.notes ? `
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #444; line-height: 1.6;">
        ${invoice.notes.replace(/\n/g, "<br>")}
      </div>` : ""}

    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 10.5px; color: #666; line-height: 1.6;">
      <strong>CLB Visual Media SPA</strong> · RUT 76582851-1 · Banco de Chile · Cta Cte 00-801-10744-10
      &nbsp;·&nbsp; contact@endurancelab.cc · +34 613 402 739
    </div>
  </div>
</body>
</html>`
}
