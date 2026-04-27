import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AccessManagement } from "@/components/dashboard/access-management"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function AccessPage() {
  let isDemo = false
  let isSuperadmin = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "superadmin") {
      redirect("/dashboard/settings")
    }

    isSuperadmin = true
  } catch (error) {
    // Re-throw Next.js redirect errors
    if (error && typeof error === "object" && "digest" in error) {
      throw error
    }
    isDemo = true
  }

  if (isDemo) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestión de Acceso</h1>
          <p className="text-muted-foreground">
            Administra usuarios, roles y permisos de acceso
          </p>
        </div>
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Modo Demo</AlertTitle>
          <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
            La gestión de acceso no está disponible en modo demo. Configura Supabase para usar esta funcionalidad.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <AccessManagement />
}
