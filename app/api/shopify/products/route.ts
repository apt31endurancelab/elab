import { getShopifyProducts } from "@/lib/shopify"

export async function GET() {
  const products = await getShopifyProducts()
  const productEdges = products?.products?.edges ?? []

  return Response.json({
    ok: true,
    count: productEdges.length,
    products: productEdges,
  })
}
