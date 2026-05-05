"use client"

import { type InvoiceWithClient } from "./invoice-detail-dialog"

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

function generatePdfHtml(invoice: InvoiceWithClient): string {
  const typeLabel =
    invoice.type === "cotizacion" ? "COTIZACIÓN"
    : invoice.type === "proforma" ? "PROFORMA"
    : "FACTURA"
  const isQuote = invoice.type === "cotizacion" || invoice.type === "proforma"
  const dateFormatted = new Date(invoice.issue_date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  <title>${typeLabel} ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 15mm 18mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #111;
      font-size: 13px;
      line-height: 1.5;
      background: white;
    }
    .page { max-width: 210mm; margin: 0 auto; padding: 40px; }
    @media print {
      .page { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #f5f5f5; padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">
    <button onclick="window.print()" style="background: #111; color: white; border: none; padding: 10px 28px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500;">
      Descargar PDF / Imprimir
    </button>
    <div style="font-size: 11px; color: #666; margin-top: 6px;">
      Tip: en el diálogo de impresión, desactiva "Encabezados y pies de página" para un PDF limpio.
    </div>
  </div>

  <div class="page">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px;">
      <div>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 1px;">e.lab</div>
        <div style="font-size: 11px; color: #555; margin-top: 4px;">Endurance Lab — Santiago, Chile</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 22px; font-weight: 700; letter-spacing: 2px;">${typeLabel}</div>
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; margin-top: 4px;">${invoice.invoice_number}</div>
        <div style="font-size: 12px; color: #555; margin-top: 2px;">${dateFormatted}</div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; gap: 32px; margin-bottom: 36px;">
      <div style="flex: 1; line-height: 1.7; font-size: 13px;">
        <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Cliente</div>
        <p style="font-weight: 600;">${invoice.client_name}</p>
        ${invoice.client_rut ? `<p>${invoice.client_rut}</p>` : ""}
        ${invoice.client_address ? `<p>${invoice.client_address}</p>` : ""}
        ${invoice.client_contact ? `<p>${invoice.client_contact}</p>` : ""}
        ${invoice.client_phone ? `<p>${invoice.client_phone}</p>` : ""}
        ${invoice.client_email ? `<p>${invoice.client_email}</p>` : ""}
      </div>
      ${isQuote ? `
      <div style="text-align: right; line-height: 1.7; font-size: 13px;">
        <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Validez</div>
        <p>${invoice.validity_days} días</p>
      </div>` : ""}
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="border-bottom: 2px solid #111;">
          <th style="text-align: left; padding: 10px 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Descripción</th>
          <th style="text-align: right; padding: 10px 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Cantidad</th>
          <th style="text-align: right; padding: 10px 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Precio</th>
          <th style="text-align: right; padding: 10px 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
      <div style="width: 280px;">
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px;">
          <span style="color: #555;">Subtotal</span>
          <span>${formatCLP(invoice.subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #ddd;">
          <span style="color: #555;">Impuesto ${invoice.tax_rate}%</span>
          <span>${formatCLP(invoice.tax_amount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px 0; font-weight: 700; font-size: 16px;">
          <span>Total</span>
          <span>${formatCLP(invoice.total)}</span>
        </div>
      </div>
    </div>

    ${invoice.notes ? `
    <div style="margin-bottom: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #444; line-height: 1.6;">
      ${invoice.notes.replace(/\n/g, "<br>")}
    </div>` : ""}

    <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee; font-size: 10.5px; color: #666; line-height: 1.6;">
      <strong>CLB Visual Media SPA</strong> · RUT 76582851-1 · Banco de Chile · Cta Cte 00-801-10744-10
      &nbsp;·&nbsp; contact@endurancelab.cc · +34 613 402 739
    </div>
  </div>
</body>
</html>`
}

export function openInvoicePdf(invoice: InvoiceWithClient) {
  const html = generatePdfHtml(invoice)
  const win = window.open("", "_blank")
  if (!win) {
    alert("Por favor permite las ventanas emergentes para generar el PDF")
    return
  }
  win.document.write(html)
  win.document.close()
}
