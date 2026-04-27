import { createClient } from "@/lib/supabase/server"
import { demoClients, demoCatalogProducts } from "@/lib/demo-data"
import { CreateInvoiceForm } from "@/components/dashboard/create-invoice-form"

async function getData() {
  try {
    const supabase = await createClient()

    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, rut, address, phone, contact_person, email")
      .order("name")

    const { data: products } = await supabase
      .from("products")
      .select("id, name, description, price, stock, sku")
      .order("name")

    return {
      clients: clients || [],
      products: products || [],
      isDemo: false,
    }
  } catch {
    return {
      clients: demoClients.map(c => ({
        id: c.id,
        name: c.name,
        rut: c.rut,
        address: c.address,
        phone: c.phone,
        contact_person: c.contact_person,
        email: c.email,
      })),
      products: demoCatalogProducts.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        sku: p.sku,
      })),
      isDemo: true,
    }
  }
}

export default async function NewInvoicePage() {
  const { clients, products, isDemo } = await getData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva Factura</h1>
        <p className="text-muted-foreground">
          Crea una cotización o factura para un cliente
        </p>
      </div>

      <CreateInvoiceForm clients={clients} products={products} isDemo={isDemo} />
    </div>
  )
}
