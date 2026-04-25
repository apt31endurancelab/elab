import { getShopifyOverviewMetrics } from "@/lib/shopify"

export async function GET() {
  const metrics = await getShopifyOverviewMetrics()

  return Response.json({
    ok: true,
    metrics,
  })
}
