"use client"

import { useState } from "react"
import { logActivityClient } from "@/lib/activity-log-client"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Plus, RefreshCw } from "lucide-react"

function generateCode(name: string): string {
  const cleanName = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${cleanName}${random}`
}

export function CreateAffiliateDialog({ isDemo = false }: { isDemo?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [commissionRate, setCommissionRate] = useState("10")
  const [discountPercent, setDiscountPercent] = useState("10")

  const handleNameChange = (value: string) => {
    setName(value)
    if (value && !code) {
      setCode(generateCode(value))
    }
  }

  const regenerateCode = () => {
    if (name) {
      setCode(generateCode(name))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isDemo) {
      setOpen(false)
      setName("")
      setEmail("")
      setCode("")
      setCommissionRate("10")
      setDiscountPercent("10")
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "tu-tienda.myshopify.com"
    const affiliateLink = `https://${storeUrl}?ref=${code}`

    const { error } = await supabase.from("affiliates").insert({
      name,
      email,
      code: code.toUpperCase(),
      commission_rate: parseInt(commissionRate),
      discount_percent: parseInt(discountPercent),
      affiliate_link: affiliateLink,
      status: "active",
      created_by: user.id,
    })

    if (!error) {
      logActivityClient({ action: "affiliate.created", entityType: "affiliate", entityName: name, metadata: { commission_rate: parseInt(commissionRate), discount_code: code.toUpperCase() } })
      setOpen(false)
      setName("")
      setEmail("")
      setCode("")
      setCommissionRate("10")
      setDiscountPercent("10")
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Afiliado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Afiliado</DialogTitle>
          <DialogDescription>
            Añade un influencer o socio al programa de afiliados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="name">Nombre</FieldLabel>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: Carlos Martínez"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="carlos@ejemplo.com"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="code">Código de Referido</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CARLOS10"
                className="font-mono"
                required
              />
              <Button type="button" variant="outline" size="icon" onClick={regenerateCode}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="commission">Comisión (%)</FieldLabel>
              <Input
                id="commission"
                type="number"
                min="1"
                max="50"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="discount">Descuento (%)</FieldLabel>
              <Input
                id="discount"
                type="number"
                min="1"
                max="50"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                required
              />
            </Field>
          </div>
          {code && (
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Enlace del afiliado:</p>
              <code className="text-xs break-all">
                https://tu-tienda.myshopify.com?ref={code}
              </code>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name || !email || !code}>
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Crear Afiliado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
