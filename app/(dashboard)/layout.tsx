import { createClient } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import type { Role, UserPermission } from "@/lib/access/types"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null
  let isDemo = false
  let role: Role = "admin"
  let permissions: UserPermission[] = []
  let avatarUrl: string | null = null
  let fullName: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser

    if (user) {
      // Fetch or create profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, avatar_url, status, last_sign_in_at, invited_by, created_at, updated_at")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        // Profile doesn't exist yet, create it
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          role: "admin",
        })
      } else {
        role = (profile.role || "admin") as Role
        avatarUrl = profile.avatar_url || null
        fullName = profile.full_name || null
      }

      // Fetch user permissions
      const { data: perms } = await supabase
        .from("user_permissions")
        .select("section_key, can_write")
        .eq("user_id", user.id)

      if (perms) {
        permissions = perms as UserPermission[]
      }
    }
  } catch {
    // If Supabase is not configured properly, use demo mode
    isDemo = true
  }

  // If no user and not in demo mode yet, set demo mode
  if (!user) {
    isDemo = true
  }

  // Demo mode gets superadmin access
  if (isDemo) {
    role = "superadmin"
  }

  const demoUser = {
    id: "demo-user",
    email: "demo@lactatepro.com",
    user_metadata: { full_name: "Usuario Demo" }
  }

  const headerUser = user
    ? { id: user.id, email: user.email || "", user_metadata: { full_name: (user.user_metadata?.full_name as string | undefined) ?? undefined } }
    : demoUser

  return (
    <SidebarProvider>
      <DashboardSidebar user={headerUser} isDemo={isDemo} role={role} permissions={permissions} />
      <SidebarInset>
        <DashboardHeader
          user={headerUser}
          isDemo={isDemo}
          avatarUrl={avatarUrl}
          fullName={fullName ?? demoUser.user_metadata.full_name}
        />
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
