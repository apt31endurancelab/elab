import { shopifyAdminFetch } from "@/lib/shopify"

// Customer write helpers (Admin API 2025-10). Requires write_customers scope.

const CUSTOMER_UPDATE = `
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) { customer { id } userErrors { field message } }
  }
`
const CUSTOMER_CREATE = `
  mutation customerCreate($input: CustomerInput!) {
    customerCreate(input: $input) { customer { id } userErrors { field message } }
  }
`
const CUSTOMER_MARKETING = `
  mutation customerEmailMarketingConsentUpdate($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) { userErrors { field message } }
  }
`

export type CustomerFields = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  note?: string
  tags?: string[]
  marketing?: boolean
}

function buildInput(f: CustomerFields): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  if (f.firstName !== undefined) input.firstName = f.firstName || null
  if (f.lastName !== undefined) input.lastName = f.lastName || null
  if (f.email !== undefined && f.email) input.email = f.email
  if (f.phone !== undefined) input.phone = f.phone || null
  if (f.note !== undefined) input.note = f.note || null
  if (f.tags !== undefined) input.tags = f.tags
  return input
}

async function setMarketing(customerId: string, subscribed: boolean): Promise<string | null> {
  const res = await shopifyAdminFetch<{ customerEmailMarketingConsentUpdate: { userErrors: { message: string }[] } }>(
    CUSTOMER_MARKETING,
    {
      input: {
        customerId,
        emailMarketingConsent: {
          marketingState: subscribed ? "SUBSCRIBED" : "UNSUBSCRIBED",
          marketingOptInLevel: "SINGLE_OPT_IN",
        },
      },
    },
    { noStore: true },
  )
  if (!res) return "consent request failed"
  if (res.customerEmailMarketingConsentUpdate.userErrors.length)
    return res.customerEmailMarketingConsentUpdate.userErrors.map(e => e.message).join("; ")
  return null
}

export async function updateShopifyCustomer(id: string, f: CustomerFields): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await shopifyAdminFetch<{
    customerUpdate: { customer: { id: string } | null; userErrors: { message: string }[] }
  }>(CUSTOMER_UPDATE, { input: { id, ...buildInput(f) } }, { noStore: true })
  if (!res) return { ok: false, error: "customerUpdate request failed" }
  if (res.customerUpdate.userErrors.length) return { ok: false, error: res.customerUpdate.userErrors.map(e => e.message).join("; ") }
  if (f.marketing !== undefined) {
    const mErr = await setMarketing(id, f.marketing)
    if (mErr) return { ok: false, error: mErr }
  }
  return { ok: true, id: res.customerUpdate.customer?.id }
}

export async function createShopifyCustomer(f: CustomerFields): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!f.email && !f.phone) return { ok: false, error: "Se requiere email o teléfono" }
  const res = await shopifyAdminFetch<{
    customerCreate: { customer: { id: string } | null; userErrors: { message: string }[] }
  }>(CUSTOMER_CREATE, { input: buildInput(f) }, { noStore: true })
  if (!res) return { ok: false, error: "customerCreate request failed" }
  if (res.customerCreate.userErrors.length) return { ok: false, error: res.customerCreate.userErrors.map(e => e.message).join("; ") }
  const id = res.customerCreate.customer?.id
  if (id && f.marketing) await setMarketing(id, true)
  return { ok: true, id }
}
