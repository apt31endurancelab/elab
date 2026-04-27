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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, CheckCircle2, Clock } from "lucide-react"

import { toast } from "sonner"

type Payout = {
  id: string
  status: string
}

export function PayoutActions({ payout, isDemo = false }: { payout: Payout; isDemo?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const updateStatus = async (status: string) => {
    if (isDemo) {
      toast.info("Función no disponible en modo demo")
      return
    }
    
    setLoading(true)
    const supabase = createClient()
    
    const updates: { status: string; paid_at?: string } = { status }
    if (status === "paid") {
      updates.paid_at = new Date().toISOString()
    }
    
    await supabase
      .from("affiliate_payouts")
      .update(updates)
      .eq("id", payout.id)

    logActivityClient({ action: "payout.updated", entityType: "payout", entityId: payout.id, metadata: { new_status: status } })

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
        <DropdownMenuItem onClick={() => updateStatus("paid")}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Marcar como Pagado
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateStatus("pending")}>
          <Clock className="h-4 w-4 mr-2" />
          Marcar como Pendiente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
