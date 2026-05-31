import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { shopifyAdminFetch } from "@/lib/shopify"

// Import Shopify customers into the CRM `clients` table (owned by the importing
// user). Matches by email to update instead of duplicating.

type CustNode = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  note: string | null
  defaultAddress: { address1: string | null; city: string | null; country: string | null } | null
}

const CUSTOMERS_QUERY = `
  query ImportCustomers($cursor: String) {
    customers(first: 100, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      edges { node {
        id firstName lastName email phone note
        defaultAddress { address1 city country }
      } }
      pageInfo { hasNextPage endCursor }
    }
  }
`

export async function POST() {
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  // Pull all customers (up to ~500)
  const customers: CustNode[] = []
  let cursor: string | null = null
  for (let i = 0; i < 5; i++) {
    const data: { customers: { edges: Array<{ node: CustNode }>; pageInfo: { hasNextPage: boolean; endCursor: string } } } | null =
      await shopifyAdminFetch(CUSTOMERS_QUERY, { cursor }, { noStore: true })
    if (!data) break
    customers.push(...data.customers.edges.map((e) => e.node))
    if (!data.customers.pageInfo.hasNextPage) break
    cursor = data.customers.pageInfo.endCursor
  }

  if (customers.length === 0) {
    return NextResponse.json({ error: "No se encontraron clientes en Shopify (¿conexión activa?)" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin.from("clients").select("id, email").eq("user_id", user.id)
  const byEmail = new Map((existing || []).filter(c => c.email).map(c => [(c.email as string).toLowerCase(), c.id as string]))

  let imported = 0
  let updated = 0
  for (const c of customers) {
    const name = `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || "Cliente Shopify"
    const address = [c.defaultAddress?.address1, c.defaultAddress?.city, c.defaultAddress?.country].filter(Boolean).join(", ") || null
    const fields = {
      name,
      email: c.email,
      phone: c.phone,
      address,
      notes: c.note || "Importado de Shopify",
    }
    const existingId = c.email ? byEmail.get(c.email.toLowerCase()) : undefined
    if (existingId) {
      await admin.from("clients").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", existingId)
      updated += 1
    } else {
      const { error } = await admin.from("clients").insert({ user_id: user.id, ...fields })
      if (!error) {
        imported += 1
        if (c.email) byEmail.set(c.email.toLowerCase(), "x")
      } else {
        console.error("Client import failed:", name, error.message)
      }
    }
  }

  return NextResponse.json({ ok: true, imported, updated, total: customers.length })
}
