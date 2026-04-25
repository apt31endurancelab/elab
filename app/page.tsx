import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      redirect("/dashboard")
    } else {
      // Even without user, allow access to dashboard in demo mode
      redirect("/dashboard")
    }
  } catch {
    // If Supabase fails, redirect to dashboard in demo mode
    redirect("/dashboard")
  }
}
