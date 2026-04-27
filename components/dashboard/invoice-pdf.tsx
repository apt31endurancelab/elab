"use client"

import { type InvoiceWithClient } from "./invoice-detail-dialog"

function formatCLP(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`
}

function generatePdfHtml(invoice: InvoiceWithClient): string {
  const typeLabel = invoice.type === "cotizacion" ? "COTIZACIÓN" : "FACTURA"
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
    @page { size: A4; margin: 15mm 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #111;
      font-size: 13px;
      line-height: 1.5;
      background: white;
    }
    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 40px;
    }
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
  </div>

  <div class="page">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 48px;">
      <h1 style="font-size: 26px; font-weight: 700; letter-spacing: 3px; border-bottom: 2.5px solid #111; display: inline-block; padding: 6px 32px;">
        ${typeLabel}
      </h1>
    </div>

    <!-- Client + Company -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 48px;">
      <div style="line-height: 2; font-size: 13px;">
        <p><strong>Cliente:</strong> ${invoice.client_name}</p>
        ${invoice.client_rut ? `<p><strong>Rut:</strong> ${invoice.client_rut}</p>` : ""}
        ${invoice.client_address ? `<p><strong>Dirección:</strong> ${invoice.client_address}</p>` : ""}
        ${invoice.client_phone ? `<p><strong>Teléfono:</strong> ${invoice.client_phone}</p>` : ""}
        ${invoice.client_contact ? `<p><strong>Contacto:</strong> ${invoice.client_contact}</p>` : ""}
        ${invoice.client_email ? `<p><strong>E-mail:</strong> ${invoice.client_email}</p>` : ""}
        <p><strong>Fecha:</strong> ${dateFormatted}</p>
        <p><strong>Validez de la cotización:</strong> ${invoice.validity_days} días</p>
      </div>
      <div style="text-align: right; line-height: 2; font-size: 13px;">
        <p style="font-weight: 700; font-size: 15px;">Endurance Lab</p>
        <p>Paderewski 1586, Vitacura, 7630292, Santiago -</p>
        <p>Chile</p>
        <p>Carlos Lastra</p>
        <p>Contact@endurancelab.cc</p>
      </div>
    </div>

    <!-- Items Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <thead>
        <tr style="border-bottom: 2.5px solid #111;">
          <th style="text-align: left; padding: 10px 8px; font-weight: 700; font-size: 13px;">Descripción</th>
          <th style="text-align: right; padding: 10px 8px; font-weight: 700; font-size: 13px;">Cantidad</th>
          <th style="text-align: right; padding: 10px 8px; font-weight: 700; font-size: 13px;">Precio</th>
          <th style="text-align: right; padding: 10px 8px; font-weight: 700; font-size: 13px;">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 56px;">
      <div style="width: 300px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px;">
          <span>Subtotal</span>
          <span>${formatCLP(invoice.subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1.5px solid #111; font-size: 13px;">
          <span>Impuesto ${invoice.tax_rate}%</span>
          <span style="margin-left: 16px;">${formatCLP(invoice.tax_amount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px 0; font-weight: 700; font-size: 16px; border-bottom: 2.5px solid #111;">
          <span>Total</span>
          <span>${formatCLP(invoice.total)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top: 56px; line-height: 1.9; font-size: 11px; color: #444;">
      <p>Razón Social: CLB Visual Media SPA</p>
      <p>Rut: 76582851-1</p>
      <p>Giro: OTRAS ACTIVIDADES DE SERVICIOS DE APOYO A LAS EMPRESAS N.C.P..</p>
      <p>Banco de Chile</p>
      <p>Cta Corriente</p>
      <p>Cuenta N° 00-801-10744-10</p>
      <p>Carlos@apt31.com</p>
      <p>Carlos Lastra Barros - +34613402739</p>
      <p>Contact@endurancelab.cc</p>
    </div>

    <!-- Logo -->
    <div style="text-align: right; margin-top: 48px; font-size: 32px; font-weight: 700; color: #111;">
      e.lab
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
