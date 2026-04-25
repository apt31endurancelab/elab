import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ShopifySetupCard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shopify Analytics</h1>
        <p className="text-muted-foreground">
          Conecta tu tienda para ver estadísticas en tiempo real
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Configura la conexión con Shopify</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Para ver los datos de tu tienda, necesitas configurar las variables de entorno de Shopify.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2 font-mono text-sm">
            <p className="text-muted-foreground"># Variables requeridas:</p>
            <p>NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com</p>
            <p>SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx</p>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <a 
                href="https://shopify.dev/docs/apps/auth/admin-app-access-tokens" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Ver documentación
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
