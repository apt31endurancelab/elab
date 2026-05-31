"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DownloadCloud } from "lucide-react"

export function ImportShopifyClientsButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/clients/import-shopify", { method: "POST" })
      const data = await res.json()
      if (!res.ok) toast.error(`Error: ${data.error || res.status}`)
      else {
        toast.success(`Shopify: ${data.imported} nuevo(s), ${data.updated} actualizado(s) de ${data.total}`)
        router.refresh()
      }
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={loading}>
      <DownloadCloud className="mr-1 h-4 w-4" />
      {loading ? "Importando..." : "Importar de Shopify"}
    </Button>
  )
}
