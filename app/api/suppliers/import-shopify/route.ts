import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { pullShopifyProducts } from "@/lib/shopify/products"

// Import Shopify product "vendor" values as local suppliers and link each product
// to its vendor (product_suppliers, primary). Lets the Proveedores section mirror
// who supplies each Shopify product.

export async function POST() {
  const admin = createAdminClient()
  const { data: connection } = await admin
    .from("shopify_connections")
    .select("id, shop_domain, access_token, user_id")
    .in("status", ["connected", "syncing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!connection) return NextResponse.json({ error: "Sin conexión activa a Shopify" }, { status: 400 })

  let ownerId: string | null = null
  try {
    const supa = await createClient()
    const { data: { user } } = await supa.auth.getUser()
    ownerId = user?.id ?? null
  } catch { /* ignore */ }
  if (!ownerId) ownerId = connection.user_id
  if (!ownerId) {
    const { data: admins } = await admin.from("profiles").select("id").eq("role", "superadmin").limit(1)
    ownerId = admins?.[0]?.id ?? null
  }
  if (!ownerId) return NextResponse.json({ error: "No se encontró un usuario propietario" }, { status: 400 })

  const pulled = await pullShopifyProducts(connection.shop_domain, connection.access_token)

  const { data: localProducts } = await admin.from("products").select("id, shopify_product_id, currency")
  const localByShopifyId = new Map((localProducts || []).filter(p => p.shopify_product_id).map(p => [p.shopify_product_id as string, p]))

  const { data: existingSuppliers } = await admin.from("suppliers").select("id, name")
  const supplierByName = new Map((existingSuppliers || []).map(s => [s.name.trim().toLowerCase(), s.id as string]))

  const { data: existingLinks } = await admin.from("product_suppliers").select("product_id, supplier_id")
  const linkSet = new Set((existingLinks || []).map(l => `${l.product_id}:${l.supplier_id}`))
  const productsWithPrimary = new Set((existingLinks || []).map(l => l.product_id as string))

  let suppliersCreated = 0
  let productsLinked = 0

  for (const sp of pulled) {
    const vendor = (sp.vendor || "").trim()
    if (!vendor) continue
    const key = vendor.toLowerCase()

    // ensure supplier exists
    let supplierId = supplierByName.get(key)
    if (!supplierId) {
      const { data: created, error } = await admin
        .from("suppliers")
        .insert({ user_id: ownerId, name: vendor, is_active: true })
        .select("id")
        .single()
      if (error || !created) {
        console.error("Supplier insert failed:", vendor, error?.message)
        continue
      }
      supplierId = created.id
      supplierByName.set(key, supplierId)
      suppliersCreated += 1
    }

    // link to the local product (if imported) as primary supplier
    const local = localByShopifyId.get(sp.shopify_product_id)
    if (!local) continue
    if (linkSet.has(`${local.id}:${supplierId}`)) continue

    const { error: linkErr } = await admin.from("product_suppliers").insert({
      product_id: local.id,
      supplier_id: supplierId,
      cost_price: 0,
      currency: local.currency || "USD",
      is_primary: !productsWithPrimary.has(local.id),
    })
    if (!linkErr) {
      linkSet.add(`${local.id}:${supplierId}`)
      productsWithPrimary.add(local.id)
      productsLinked += 1
    } else {
      console.error("Link insert failed:", vendor, linkErr.message)
    }
  }

  return NextResponse.json({ ok: true, suppliersCreated, productsLinked, vendorsSeen: pulled.length })
}
