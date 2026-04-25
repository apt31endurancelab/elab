const SHOPIFY_DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
  "your-store.myshopify.com"
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

type ShopifyResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

async function shopifyAdminFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
    console.warn("Shopify Admin Access Token not configured")
    return null
  }

  try {
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    const json: ShopifyResponse<T> = await response.json()

    if (json.errors) {
      console.error("Shopify API Error:", json.errors)
      return null
    }

    return json.data ?? null
  } catch (error) {
    console.error("Shopify fetch error:", error)
    return null
  }
}

export async function getShopifyAnalytics() {
  const query = `
    query {
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
            customer {
              email
              firstName
              lastName
            }
            fulfillmentStatus
            financialStatus
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `

  return shopifyAdminFetch<{
    orders: {
      edges: Array<{
        node: {
          id: string
          name: string
          createdAt: string
          totalPriceSet: {
            shopMoney: {
              amount: string
              currencyCode: string
            }
          }
          lineItems: {
            edges: Array<{
              node: {
                title: string
                quantity: number
              }
            }>
          }
          customer: {
            email: string
            firstName: string
            lastName: string
          } | null
          fulfillmentStatus: string
          financialStatus: string
        }
      }>
    }
  }>(query)
}

export async function getShopifyProducts() {
  const query = `
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            handle
            status
            totalInventory
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
              altText
            }
            totalVariants
          }
        }
      }
    }
  `

  return shopifyAdminFetch<{
    products: {
      edges: Array<{
        node: {
          id: string
          title: string
          handle: string
          status: string
          totalInventory: number
          priceRangeV2: {
            minVariantPrice: {
              amount: string
              currencyCode: string
            }
          }
          featuredImage: {
            url: string
            altText: string
          } | null
          totalVariants: number
        }
      }>
    }
  }>(query)
}

export async function getShopifyShopInfo() {
  const query = `
    query {
      shop {
        name
        email
        primaryDomain {
          url
          host
        }
        currencyCode
        plan {
          displayName
        }
      }
    }
  `

  return shopifyAdminFetch<{
    shop: {
      name: string
      email: string
      primaryDomain: {
        url: string
        host: string
      }
      currencyCode: string
      plan: {
        displayName: string
      }
    }
  }>(query)
}

export async function getShopifyCustomers() {
  const query = `
    query {
      customers(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            createdAt
            updatedAt
            amountSpent {
              amount
              currencyCode
            }
            numberOfOrders
            email
            firstName
            lastName
            tags
            defaultAddress {
              city
              country
            }
          }
        }
      }
    }
  `

  return shopifyAdminFetch<{
    customers: {
      edges: Array<{
        node: {
          id: string
          createdAt: string
          updatedAt: string
          amountSpent: {
            amount: string
            currencyCode: string
          }
          numberOfOrders: number
          email: string | null
          firstName: string | null
          lastName: string | null
          tags: string[]
          defaultAddress: {
            city: string | null
            country: string | null
          } | null
        }
      }>
    }
  }>(query)
}

export async function getShopifyOverviewMetrics() {
  const [analytics, products, customers] = await Promise.all([
    getShopifyAnalytics(),
    getShopifyProducts(),
    getShopifyCustomers(),
  ])

  const orders = analytics?.orders?.edges ?? []
  const productEdges = products?.products?.edges ?? []
  const customerEdges = customers?.customers?.edges ?? []

  const totalRevenue = orders.reduce((sum, { node }) => {
    return sum + parseFloat(node.totalPriceSet.shopMoney.amount || "0")
  }, 0)

  const ordersCount = orders.length
  const itemsSold = orders.reduce((sum, { node }) => {
    const totalItems = node.lineItems.edges.reduce((acc, item) => acc + item.node.quantity, 0)
    return sum + totalItems
  }, 0)

  const aov = ordersCount > 0 ? totalRevenue / ordersCount : 0
  const totalInventory = productEdges.reduce((sum, { node }) => sum + (node.totalInventory || 0), 0)
  const customersCount = customerEdges.length
  const returningCustomers = customerEdges.filter(({ node }) => node.numberOfOrders > 1).length
  const repeatPurchaseRate =
    customersCount > 0 ? (returningCustomers / customersCount) * 100 : 0

  return {
    totalRevenue,
    ordersCount,
    itemsSold,
    aov,
    totalInventory,
    customersCount,
    returningCustomers,
    repeatPurchaseRate,
  }
}

export async function createDiscountCode(code: string, percentage: number) {
  const query = `
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) {
                edges {
                  node {
                    code
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const variables = {
    basicCodeDiscount: {
      title: `Affiliate - ${code}`,
      code,
      startsAt: new Date().toISOString(),
      customerGets: {
        value: {
          percentage: percentage / 100,
        },
        items: {
          all: true,
        },
      },
      customerSelection: {
        all: true,
      },
    },
  }

  return shopifyAdminFetch(query, variables)
}
