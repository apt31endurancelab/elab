import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  // Local dev escape hatch: go straight to the dashboard while running `next dev`.
  if (process.env.NODE_ENV === "development") {
    redirect("/dashboard")
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      redirect("/dashboard")
    } else {
      redirect("/auth/login")
    }
  } catch {
    // If Supabase fails, redirect to login
    redirect("/auth/login")
  }
}
