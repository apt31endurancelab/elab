export const TAX_ID_TYPES = [
  { value: "NIF", label: "NIF (España)" },
  { value: "CIF", label: "CIF (España, antiguo)" },
  { value: "VAT", label: "VAT (UE / UK)" },
  { value: "RUT", label: "RUT (Chile)" },
  { value: "RFC", label: "RFC (México)" },
  { value: "EIN", label: "EIN (USA)" },
  { value: "CUIT", label: "CUIT (Argentina)" },
  { value: "CNPJ", label: "CNPJ (Brasil)" },
  { value: "RUC", label: "RUC (Perú / Ecuador)" },
  { value: "OTHER", label: "Otro" },
]

export type TaxIdInfo = {
  tax_id_type?: string | null
  tax_id?: string | null
  rut?: string | null
}

// Returns the human-readable string to display for a client's fiscal id, falling back
// to the legacy `rut` column for rows that haven't been migrated yet.
export function formatTaxId(c: TaxIdInfo): string | null {
  if (c.tax_id) {
    const type = c.tax_id_type || "ID"
    return `${type}: ${c.tax_id}`
  }
  if (c.rut) return `RUT: ${c.rut}`
  return null
}

export function bareTaxId(c: TaxIdInfo): string | null {
  return c.tax_id || c.rut || null
}
