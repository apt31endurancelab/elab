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
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Plus } from "lucide-react"

const CLIENTS_STORAGE_KEY = "endurancelab_clients"

export function loadClientsFromStorage(fallback: Client[]): Client[] {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem(CLIENTS_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return fallback
}

export function saveClientsToStorage(clients: Client[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients))
}

export type Client = {
  id: string
  name: string
  rut: string | null
  address: string | null
  phone: string | null
  contact_person: string | null
  email: string | null
  notes: string | null
  created_at: string
}

export function CreateClientDialog({ isDemo = false }: { isDemo?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [rut, setRut] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")

  const resetForm = () => {
    setName("")
    setRut("")
    setAddress("")
    setPhone("")
    setContactPerson("")
    setEmail("")
    setNotes("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isDemo) {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        name,
        rut: rut || null,
        address: address || null,
        phone: phone || null,
        contact_person: contactPerson || null,
        email: email || null,
        notes: notes || null,
        created_at: new Date().toISOString(),
      }
      const current = loadClientsFromStorage([])
      saveClientsToStorage([newClient, ...current])
      window.dispatchEvent(new Event("clients-updated"))
      setOpen(false)
      resetForm()
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase.from("clients").insert({
      name,
      rut: rut || null,
      address: address || null,
      phone: phone || null,
      contact_person: contactPerson || null,
      email: email || null,
      notes: notes || null,
      user_id: user.id,
    })

    if (error) {
      console.error("Error creating client:", error)
      setLoading(false)
      return
    }

    logActivityClient({ action: "client.created", entityType: "client", entityName: name, metadata: { contact_person: contactPerson || null } })

    setOpen(false)
    resetForm()
    setLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Añade un cliente al CRM para poder asignarlo a facturas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="client-name">Nombre / Razón Social</FieldLabel>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Universidad San Sebastián"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="client-rut">RUT</FieldLabel>
              <Input
                id="client-rut"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                placeholder="71.631.900-8"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-phone">Teléfono</FieldLabel>
              <Input
                id="client-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="client-address">Dirección</FieldLabel>
            <Input
              id="client-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="General Lagos 1163, Valdivia"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="client-contact">Persona de Contacto</FieldLabel>
              <Input
                id="client-contact"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Carmen Sayago"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-email">Email</FieldLabel>
              <Input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.cl"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="client-notes">Notas (opcional)</FieldLabel>
            <Textarea
              id="client-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre el cliente..."
              rows={2}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name}>
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Crear Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
