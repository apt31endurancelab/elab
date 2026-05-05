"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Plug,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Connection = {
  id: string
  shop_domain: string
  status: "connecting" | "connected" | "syncing" | "error" | "disconnected"
  status_message: string | null
  last_sync_at: string | null
  last_sync_error: string | null
  scopes: string | null
  installed_at: string | null
}

const statusConfig: Record<Connection["status"], { label: string; bg: string; color: string; icon: typeof CheckCircle2 }> = {
  connecting: { label: "Conectando…", bg: "bg-blue-500/10 border-blue-500/30", color: "text-blue-600 dark:text-blue-400", icon: RefreshCw },
  connected:  { label: "Conectado",  bg: "bg-emerald-500/10 border-emerald-500/30", color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  syncing:    { label: "Sincronizando…", bg: "bg-blue-500/10 border-blue-500/30", color: "text-blue-600 dark:text-blue-400", icon: RefreshCw },
  error:      { label: "Error",     bg: "bg-red-500/10 border-red-500/30", color: "text-red-600 dark:text-red-400", icon: AlertCircle },
  disconnected: { label: "Desconectado", bg: "bg-muted border-border", color: "text-muted-foreground", icon: XCircle },
}

export function ShopifyConnectCard({
  initialConnection,
  oauthConfigured,
  missingEnv,
}: {
  initialConnection: Connection | null
  oauthConfigured: boolean
  missingEnv: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [shop, setShop] = useState("")
  const [connection, setConnection] = useState<Connection | null>(initialConnection)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const banner = searchParams.get("shopify")
  const reason = searchParams.get("reason")

  useEffect(() => {
    setConnection(initialConnection)
  }, [initialConnection])

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop) return
    window.location.href = `/api/shopify/connect?shop=${encodeURIComponent(shop)}`
  }

  const handleSync = async () => {
    if (!connection) return
    setSyncing(true)
    try {
      await fetch(`/api/shopify/sync?connection_id=${connection.id}`, { method: "POST" })
      router.refresh()
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!connection) return
    if (!confirm("¿Desconectar esta tienda? Los datos sincronizados se conservarán.")) return
    setDisconnecting(true)
    try {
      await fetch("/api/shopify/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connection.id }),
      })
      router.refresh()
    } finally {
      setDisconnecting(false)
    }
  }

  const cfg = connection ? statusConfig[connection.status] : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-medium">Shopify</CardTitle>
          {connection && cfg && (
            <Badge variant="outline" className={cn("ml-auto", cfg.bg, cfg.color)}>
              <cfg.icon className={cn("h-3 w-3 mr-1", connection.status === "syncing" && "animate-spin")} />
              {cfg.label}
            </Badge>
          )}
        </div>
        <CardDescription>
          Conecta tu tienda Shopify para alimentar el dashboard de analytics y desbloquear afiliados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {banner === "connected" && (
          <Alert className="border-emerald-500/50 bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-600 dark:text-emerald-400">Tienda conectada</AlertTitle>
            <AlertDescription>
              {searchParams.get("shop")} se conectó correctamente. La primera sincronización corre en segundo plano.
            </AlertDescription>
          </Alert>
        )}
        {banner === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Falló la conexión</AlertTitle>
            <AlertDescription>Razón: {reason || "desconocida"}</AlertDescription>
          </Alert>
        )}

        {!oauthConfigured && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Faltan variables de entorno</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Configura estas variables en <code>.env.local</code> antes de conectar:</p>
              <pre className="bg-background/50 p-2 rounded text-xs">{missingEnv.map(v => `${v}=...`).join("\n")}</pre>
              <p className="text-xs">
                Crea una app en{" "}
                <a className="underline" target="_blank" rel="noreferrer" href="https://partners.shopify.com">
                  Shopify Partners <ExternalLink className="inline h-3 w-3" />
                </a>{" "}
                con scopes <code>read_orders, read_products, read_customers, read_analytics</code> y URL de redirect a{" "}
                <code>{`{SHOPIFY_APP_URL}/api/shopify/callback`}</code>.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {connection && connection.status !== "disconnected" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Tienda</p>
                <p className="font-mono">{connection.shop_domain}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última sincronización</p>
                <p>{connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString("es-CL") : "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Scopes</p>
                <p className="font-mono text-xs break-all">{connection.scopes || "—"}</p>
              </div>
            </div>
            {connection.last_sync_error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error en última sincronización</AlertTitle>
                <AlertDescription className="text-xs font-mono">{connection.last_sync_error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Sincronizar ahora
              </Button>
              <Button variant="outline" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor="shop">Dominio de tu tienda</FieldLabel>
              <Input
                id="shop"
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                placeholder="mistore.myshopify.com"
                disabled={!oauthConfigured}
              />
            </Field>
            <Button type="submit" disabled={!oauthConfigured || !shop}>
              <Plug className="h-4 w-4 mr-1" />
              Conectar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
