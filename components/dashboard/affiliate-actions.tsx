"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logActivityClient } from "@/lib/activity-log-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Copy, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

type Affiliate = {
  id: string
  name: string
  email: string
  code: string
  commission_rate?: number
  commission_percent?: number
  discount_percent?: number
  referral_link?: string | null
  status: string
}

export function AffiliateActions({ affiliate, isDemo = false }: { affiliate: Affiliate; isDemo?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const link = affiliate.referral_link || ""
  
  const copyLink = () => {
    navigator.clipboard.writeText(link)
    toast.success("Enlace copiado al portapapeles")
  }

  const copyCode = () => {
    navigator.clipboard.writeText(affiliate.code)
    toast.success("Código copiado al portapapeles")
  }

  const toggleStatus = async () => {
    if (isDemo) {
      toast.info("Función no disponible en modo demo")
      return
    }
    
    setLoading(true)
    const supabase = createClient()
    
    const newStatus = affiliate.status === "active" ? "inactive" : "active"
    await supabase
      .from("affiliates")
      .update({ status: newStatus })
      .eq("id", affiliate.id)

    logActivityClient({ action: "affiliate.status_changed", entityType: "affiliate", entityId: affiliate.id, entityName: affiliate.name, metadata: { old_status: affiliate.status, new_status: newStatus } })

    router.refresh()
    setLoading(false)
  }

  const deleteAffiliate = async () => {
    if (isDemo) {
      toast.info("Función no disponible en modo demo")
      return
    }

    if (!confirm("¿Estás seguro de eliminar este afiliado? Esta acción no se puede deshacer.")) {
      return
    }

    setLoading(true)
    const supabase = createClient()

    await supabase
      .from("affiliates")
      .delete()
      .eq("id", affiliate.id)

    logActivityClient({ action: "affiliate.deleted", entityType: "affiliate", entityId: affiliate.id, entityName: affiliate.name })

    router.refresh()
    setLoading(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar Enlace
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyCode}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Copiar Código
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleStatus}>
          {affiliate.status === "active" ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Desactivar
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Activar
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={deleteAffiliate} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
