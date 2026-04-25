import { getShopifyAnalytics } from "@/lib/shopify"

export async function GET() {
  const analytics = await getShopifyAnalytics()
  const orders = analytics?.orders?.edges ?? []

  return Response.json({
    ok: true,
    count: orders.length,
    orders,
  })
}
