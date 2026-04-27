import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Link2 } from "lucide-react"
import { CopyButton } from "@/components/dashboard/copy-button"
import { demoAffiliates } from "@/lib/demo-data"

interface Affiliate {
  id: string
  name: string
  discount_code: string
  discount_percentage: number
  referral_link: string | null
  status: string
}

async function getAffiliates(): Promise<{ affiliates: Affiliate[]; isDemo: boolean }> {
  try {
    const supabase = await createClient()
    const { data: affiliates } = await supabase
      .from("affiliates")
      .select("*")
      .order("created_at", { ascending: false })
    
    return { affiliates: affiliates || [], isDemo: false }
  } catch {
    const demoMapped = demoAffiliates.map(a => ({
      id: a.id,
      name: a.name,
      discount_code: a.code || "",
      discount_percentage: a.discount_percent || 0,
      referral_link: a.referral_link || null,
      status: a.status,
    }))
    return { affiliates: demoMapped, isDemo: true }
  }
}

export default async function LinksPage() {
  const { affiliates, isDemo } = await getAffiliates()
  const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "tu-tienda.myshopify.com"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enlaces y Códigos</h1>
        <p className="text-muted-foreground">
          Gestiona los enlaces de referido y códigos de descuento
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">URL Base de la Tienda</CardTitle>
            <CardDescription>Dominio de tu tienda Shopify</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                https://{storeUrl}
              </code>
              <CopyButton text={`https://${storeUrl}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Formato de Enlaces</CardTitle>
            <CardDescription>Estructura de los enlaces de afiliado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                ?ref=CODIGO
              </code>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Los enlaces se generan automáticamente al crear un afiliado
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Enlaces Activos</CardTitle>
          <CardDescription>Todos los enlaces y códigos de tus afiliados</CardDescription>
        </CardHeader>
        <CardContent>
          {affiliates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Enlace Completo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((affiliate) => {
                  const link = affiliate.referral_link || `https://${storeUrl}?ref=${affiliate.discount_code}`
                  return (
                    <TableRow key={affiliate.id}>
                      <TableCell className="font-medium">{affiliate.name}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {affiliate.discount_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{affiliate.discount_percentage}% OFF</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <code className="text-xs text-muted-foreground truncate block">
                          {link}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={affiliate.status === "active" ? "default" : "secondary"}>
                          {affiliate.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <CopyButton text={affiliate.discount_code} label="Código" />
                          <CopyButton text={link} label="Enlace" />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Link2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay enlaces todavía</p>
              <p className="text-sm text-muted-foreground">
                Crea un afiliado para generar su enlace único
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
