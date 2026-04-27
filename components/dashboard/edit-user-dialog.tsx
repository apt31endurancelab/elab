"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { SECTION_KEYS, SECTION_LABELS, type Role, type SectionKey, type UserWithPermissions } from "@/lib/access/types"
import { getDefaultPermissions } from "@/lib/access/helpers"

interface EditUserDialogProps {
  user: UserWithPermissions
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditUserDialog({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [role, setRole] = useState<Role>(user.role)
  const [fullName, setFullName] = useState(user.full_name || "")
  const [selectedSections, setSelectedSections] = useState<Set<SectionKey>>(
    new Set(user.permissions.map(p => p.section_key))
  )

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole)
    if (newRole === "superadmin") {
      setSelectedSections(new Set(SECTION_KEYS))
    } else {
      const defaults = getDefaultPermissions(newRole)
      setSelectedSections(new Set(defaults.map(p => p.section_key)))
    }
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

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, full_name: fullName || null, permissions }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Error al actualizar usuario")
        return
      }

      toast.success("Usuario actualizado correctamente")
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error("Error al actualizar usuario")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              {user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
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
                        id={`edit-section-${key}`}
                        checked={selectedSections.has(key)}
                        onCheckedChange={() => toggleSection(key)}
                      />
                      <Label
                        htmlFor={`edit-section-${key}`}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
