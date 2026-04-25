import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Store, Database, Shield, AlertCircle, CheckCircle2, Key } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConnectionsConfigForm } from "@/components/dashboard/connections-config-form"

async function getSettingsData() {
  let user = null
  let isDemo = false
  
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
  } catch {
    isDemo = true
  }
  
  if (!user) {
    isDemo = true
    user = {
      id: "demo-user-id",
      email: "demo@lactatepro.com",
      last_sign_in_at: new Date().toISOString(),
    }
  }
  
  return { user, isDemo }
}

export default async function SettingsPage() {
  const { user, isDemo } = await getSettingsData()
  
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasShopifyDomain = !!process.env.SHOPIFY_STORE_DOMAIN || !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  const hasShopifyToken = !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  
  const supabaseConfigured = hasSupabaseUrl && hasSupabaseKey
  const shopifyConfigured = hasShopifyDomain && hasShopifyToken

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">
          Configuración general del panel de administración
        </p>
      </div>

      {isDemo && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Modo Demo Activo</AlertTitle>
          <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
            Estás viendo datos de demostración. Para usar datos reales, configura las variables de entorno 
            en la sección Vars del menú de configuración (arriba a la derecha).
          </AlertDescription>
        </Alert>
      )}

      {/* API Keys Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Configuración de APIs</CardTitle>
          </div>
          <CardDescription>
            Estado de las conexiones con servicios externos. Configura las variables en Vars del menú de configuración.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Supabase */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Supabase</span>
              </div>
              <Badge variant={supabaseConfigured ? "default" : "destructive"}>
                {supabaseConfigured ? "Configurado" : "No configurado"}
              </Badge>
            </div>
            <div className="grid gap-2 pl-6 text-sm">
              <div className="flex items-center gap-2">
                {hasSupabaseUrl ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                )}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code>
              </div>
              <div className="flex items-center gap-2">
                {hasSupabaseKey ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                )}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
              </div>
            </div>
          </div>

          {/* Shopify */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Shopify</span>
              </div>
              <Badge variant={shopifyConfigured ? "default" : "secondary"}>
                {shopifyConfigured ? "Configurado" : "No configurado"}
              </Badge>
            </div>
            <div className="grid gap-2 pl-6 text-sm">
              <div className="flex items-center gap-2">
                {hasShopifyDomain ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">SHOPIFY_STORE_DOMAIN</code>
                {hasShopifyDomain && (
                  <span className="text-muted-foreground">
                    ({process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasShopifyToken ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">SHOPIFY_ADMIN_ACCESS_TOKEN</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConnectionsConfigForm />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Cuenta</CardTitle>
            </div>
            <CardDescription>Información de tu cuenta de administrador</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ID de Usuario</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">{user?.id}</code>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Último acceso</p>
              <p className="text-sm">
                {user?.last_sign_in_at 
                  ? new Date(user.last_sign_in_at).toLocaleString("es-ES")
                  : "N/A"
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Sistema</CardTitle>
            </div>
            <CardDescription>Información del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Versión</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Entorno</p>
              <Badge variant="outline">
                {process.env.NODE_ENV === "production" ? "Producción" : "Desarrollo"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tablas de Base de Datos</p>
              <p className="text-xs text-muted-foreground">
                profiles, tasks, affiliates, affiliate_sales, affiliate_payouts
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
