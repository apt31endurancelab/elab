"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Mail, Phone } from "lucide-react"
import { type Client, loadClientsFromStorage, saveClientsToStorage } from "./create-client-dialog"

export function ClientActions({ client, isDemo = false }: { client: Client; isDemo?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return

    if (isDemo) {
      const current = loadClientsFromStorage([])
      saveClientsToStorage(current.filter(c => c.id !== client.id))
      window.dispatchEvent(new Event("clients-updated"))
      router.refresh()
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from("clients").delete().eq("id", client.id)
    if (error) {
      console.error("Error deleting client:", error)
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {client.email && (
          <DropdownMenuItem onClick={() => window.open(`mailto:${client.email}`)}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar Email
          </DropdownMenuItem>
        )}
        {client.phone && (
          <DropdownMenuItem onClick={() => window.open(`tel:${client.phone}`)}>
            <Phone className="h-4 w-4 mr-2" />
            Llamar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
