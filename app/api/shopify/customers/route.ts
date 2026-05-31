import { getShopifyCustomers } from "@/lib/shopify"
import { createClient } from "@/lib/supabase/server"
import { createShopifyCustomer, updateShopifyCustomer, type CustomerFields } from "@/lib/shopify/customers"

export async function GET() {
  const customers = await getShopifyCustomers()
  const customerEdges = customers?.customers?.edges ?? []
  return Response.json({ ok: true, count: customerEdges.length, customers: customerEdges })
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Create a Shopify customer
export async function POST(request: Request) {
  if (!(await requireUser())) return Response.json({ error: "No autenticado" }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as CustomerFields
  const res = await createShopifyCustomer(body)
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 })
  return Response.json({ ok: true, id: res.id })
}

// Update a Shopify customer
export async function PATCH(request: Request) {
  if (!(await requireUser())) return Response.json({ error: "No autenticado" }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as CustomerFields & { id?: string }
  if (!body.id) return Response.json({ error: "id requerido" }, { status: 400 })
  const { id, ...fields } = body
  const res = await updateShopifyCustomer(id, fields)
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 })
  return Response.json({ ok: true, id: res.id })
}
