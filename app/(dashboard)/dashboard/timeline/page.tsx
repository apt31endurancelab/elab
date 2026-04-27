import { createClient } from "@/lib/supabase/server"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"
import { demoActivityLog } from "@/lib/demo-data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  metadata: Record<string, unknown>
  created_at: string
}

async function getActivityData() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { logs: demoActivityLog as ActivityLog[], isDemo: true, isSuperadmin: true, users: {} }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const isSuperadmin = profile?.role === "superadmin"

    // RLS handles filtering: superadmin sees all, others see own
    const { data: logs } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)

    // If superadmin, fetch all user profiles for display
    let users: Record<string, { email: string; full_name: string | null }> = {}
    if (isSuperadmin) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")

      if (profiles) {
        users = Object.fromEntries(profiles.map(p => [p.id, { email: p.email, full_name: p.full_name }]))
      }
    }

    // Add current user to users map
    users[user.id] = { email: user.email || "", full_name: null }

    return { logs: (logs || []) as ActivityLog[], isDemo: false, isSuperadmin, users }
  } catch {
    return { logs: demoActivityLog as ActivityLog[], isDemo: true, isSuperadmin: true, users: {} }
  }
}

export default async function TimelinePage() {
  const { logs, isDemo, isSuperadmin, users } = await getActivityData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
        <p className="text-muted-foreground">
          Actividad reciente en toda la plataforma
        </p>
      </div>

      {isDemo && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Modo Demo</AlertTitle>
          <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
            Estás viendo datos de demostración.
          </AlertDescription>
        </Alert>
      )}

      <ActivityTimeline
        logs={logs}
        isDemo={isDemo}
        isSuperadmin={isSuperadmin}
        users={users}
      />
    </div>
  )
}
