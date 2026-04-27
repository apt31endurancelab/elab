"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Plus } from "lucide-react"
import { demoAffiliates } from "@/lib/demo-data"

type Affiliate = {
  id: string
  name: string
  code: string
  commission_rate: number
}

export function RegisterSaleDialog({ isDemo = false }: { isDemo?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [selectedAffiliate, setSelectedAffiliate] = useState("")
  const [orderId, setOrderId] = useState("")
  const [saleAmount, setSaleAmount] = useState("")
  const [commission, setCommission] = useState("0.00")

  useEffect(() => {
    const fetchAffiliates = async () => {
      if (isDemo) {
        const demoData = demoAffiliates.filter(a => a.status === "active").map(a => ({
          id: a.id,
          name: a.name,
          code: a.code,
          commission_rate: a.commission_percent
        }))
        setAffiliates(demoData)
        return
      }
      
      const supabase = createClient()
      const { data } = await supabase
        .from("affiliates")
        .select("id, name, code, commission_rate")
        .eq("status", "active")
      
      if (data) setAffiliates(data)
    }
    
    if (open) fetchAffiliates()
  }, [open, isDemo])

  useEffect(() => {
    const affiliate = affiliates.find(a => a.id === selectedAffiliate)
    if (affiliate && saleAmount) {
      const commissionAmount = (parseFloat(saleAmount) * affiliate.commission_rate / 100).toFixed(2)
      setCommission(commissionAmount)
    } else {
      setCommission("0.00")
    }
  }, [selectedAffiliate, saleAmount, affiliates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isDemo) {
      setOpen(false)
      setSelectedAffiliate("")
      setOrderId("")
      setSaleAmount("")
      setCommission("0.00")
      setLoading(false)
      return
    }

    const supabase = createClient()

    await supabase.from("affiliate_sales").insert({
      affiliate_id: selectedAffiliate,
      order_id: orderId,
      sale_amount: parseFloat(saleAmount),
      commission_amount: parseFloat(commission),
      status: "pending",
    })

    logActivityClient({ action: "sale.registered", entityType: "sale", entityName: `Pedido ${orderId}`, metadata: { amount: parseFloat(saleAmount), commission: parseFloat(commission) } })

    setOpen(false)
    setSelectedAffiliate("")
    setOrderId("")
    setSaleAmount("")
    setCommission("0.00")
    setLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Venta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Venta de Afiliado</DialogTitle>
          <DialogDescription>
            Registra manualmente una venta generada por un afiliado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="affiliate">Afiliado</FieldLabel>
            <Select value={selectedAffiliate} onValueChange={setSelectedAffiliate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un afiliado" />
              </SelectTrigger>
              <SelectContent>
                {affiliates.map((affiliate) => (
                  <SelectItem key={affiliate.id} value={affiliate.id}>
                    {affiliate.name} ({affiliate.code}) - {affiliate.commission_rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="order_id">ID del Pedido</FieldLabel>
            <Input
              id="order_id"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Ej: #1234"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="amount">Monto de la Venta ($)</FieldLabel>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={saleAmount}
              onChange={(e) => setSaleAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </Field>
          {selectedAffiliate && saleAmount && (
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Comisión calculada:</p>
              <p className="text-lg font-bold text-chart-2">${commission}</p>
              <p className="text-xs text-muted-foreground">
                {affiliates.find(a => a.id === selectedAffiliate)?.commission_rate}% de ${saleAmount}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !selectedAffiliate || !orderId || !saleAmount}>
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Registrar Venta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
