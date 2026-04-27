"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { SECTION_KEYS, SECTION_LABELS, type Role, type SectionKey } from "@/lib/access/types"
import { getDefaultPermissions } from "@/lib/access/helpers"

interface InviteUserDialogProps {
  onSuccess: () => void
}

export function InviteUserDialog({ onSuccess }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<Role>("admin")
  const [selectedSections, setSelectedSections] = useState<Set<SectionKey>>(
    new Set(SECTION_KEYS)
  )

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole)
    const defaults = getDefaultPermissions(newRole)
    setSelectedSections(new Set(defaults.map(p => p.section_key)))
  }

  const toggleSection = (key: SectionKey) => {
    const next = new Set(selectedSections)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setSelectedSections(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const permissions = Array.from(selectedSections).map(key => ({
        section_key: key,
        can_write: role !== "viewer",
      }))

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, full_name: fullName || undefined, permissions }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Error al invitar usuario")
        return
      }

      toast.success(`Invitación enviada a ${email}`)
      setOpen(false)
      setEmail("")
      setFullName("")
      setRole("admin")
      setSelectedSections(new Set(SECTION_KEYS))
      onSuccess()
    } catch {
      toast.error("Error al invitar usuario")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invitar Usuario</DialogTitle>
            <DialogDescription>
              Envía una invitación por email para acceder al panel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nombre (opcional)</Label>
              <Input
                id="invite-name"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => handleRoleChange(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer (solo lectura)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role !== "superadmin" && (
              <div className="space-y-2">
                <Label>Secciones permitidas</Label>
                <div className="grid gap-2 max-h-48 overflow-y-auto rounded-md border p-3">
                  {SECTION_KEYS.filter(k => k !== "settings").map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`section-${key}`}
                        checked={selectedSections.has(key)}
                        onCheckedChange={() => toggleSection(key)}
                      />
                      <Label
                        htmlFor={`section-${key}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {SECTION_LABELS[key]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !email}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Enviando...
                </>
              ) : (
                "Enviar Invitación"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
