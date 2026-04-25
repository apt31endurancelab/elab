import { createClient } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null
  let isDemo = false
  
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
    
    if (user) {
      // Fetch or create profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          role: "admin",
        })
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

  const demoUser = {
    id: "demo-user",
    email: "demo@lactatepro.com",
    user_metadata: { full_name: "Usuario Demo" }
  }

  return (
    <SidebarProvider>
      <DashboardSidebar user={user || demoUser} isDemo={isDemo} />
      <SidebarInset>
        <DashboardHeader user={user || demoUser} isDemo={isDemo} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
