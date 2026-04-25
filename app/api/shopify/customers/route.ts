import { getShopifyCustomers } from "@/lib/shopify"

export async function GET() {
  const customers = await getShopifyCustomers()
  const customerEdges = customers?.customers?.edges ?? []

  return Response.json({
    ok: true,
    count: customerEdges.length,
    customers: customerEdges,
  })
}
