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

  return (
    <SidebarProvider>
      <DashboardSidebar user={user || demoUser} isDemo={isDemo} role={role} permissions={permissions} />
      <SidebarInset>
        <DashboardHeader user={user || demoUser} isDemo={isDemo} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
