"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Camera, Settings as SettingsIcon, LogOut } from "lucide-react"

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "??"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ProfileMenu({
  email,
  fullName,
  avatarUrl,
  isDemo = false,
}: {
  email: string
  fullName: string | null
  avatarUrl: string | null
  isDemo?: boolean
}) {
  const router = useRouter()
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(avatarUrl || "")
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl)

  useEffect(() => {
    setCurrentAvatar(avatarUrl)
    setPhotoUrl(avatarUrl || "")
  }, [avatarUrl])

  const savePhoto = async () => {
    setSaving(true)
    if (isDemo) {
      // Persist locally so it survives refresh in demo mode
      try {
        localStorage.setItem("endurancelab_demo_avatar", photoUrl)
      } catch {}
      setCurrentAvatar(photoUrl)
      setSaving(false)
      setPhotoOpen(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: photoUrl || null })
      .eq("id", user.id)

    if (!error) {
      setCurrentAvatar(photoUrl || null)
      setPhotoOpen(false)
      router.refresh()
    } else {
      console.error("Error updating avatar:", error)
    }
    setSaving(false)
  }

  const signOut = async () => {
    setSigningOut(true)
    if (isDemo) {
      router.push("/auth/login")
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded-full ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Menú de perfil"
          >
            <Avatar className="h-8 w-8">
              {currentAvatar ? <AvatarImage src={currentAvatar} alt={fullName || email} /> : null}
              <AvatarFallback className="text-xs font-medium">{initialsFrom(fullName, email)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{fullName || "Usuario"}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPhotoOpen(true)}>
            <Camera className="h-4 w-4 mr-2" />
            Cambiar foto de perfil
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Ajustes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} disabled={signingOut} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
            <DialogDescription>
              Pega la URL de una imagen pública. Para subir desde tu equipo, configura un bucket
              público &quot;avatars&quot; en Supabase Storage y actualizamos esto a un upload directo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 py-2">
            <Avatar className="h-16 w-16">
              {photoUrl ? <AvatarImage src={photoUrl} alt="Preview" /> : null}
              <AvatarFallback>{initialsFrom(fullName, email)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Field>
                <FieldLabel htmlFor="avatar-url">URL de la imagen</FieldLabel>
                <Input
                  id="avatar-url"
                  type="url"
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={savePhoto} disabled={saving}>
              {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
