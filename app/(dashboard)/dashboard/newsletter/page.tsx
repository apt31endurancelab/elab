import { createClient } from "@/lib/supabase/server"
import { NewsletterWorkspace, type NewsletterSubscriber, type NewsletterCampaign } from "@/components/dashboard/newsletter-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { emailIsConfigured } from "@/lib/email"

async function getData() {
  try {
    const supabase = await createClient()
    const [{ data: subscribers }, { data: campaigns }] = await Promise.all([
      supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("newsletter_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
    ])
    return {
      subscribers: (subscribers || []) as NewsletterSubscriber[],
      campaigns: (campaigns || []) as NewsletterCampaign[],
      hasMigration: true,
    }
  } catch {
    return { subscribers: [] as NewsletterSubscriber[], campaigns: [] as NewsletterCampaign[], hasMigration: false }
  }
}

export default async function NewsletterPage() {
  const { subscribers, campaigns, hasMigration } = await getData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Newsletter</h1>
        <p className="text-muted-foreground">
          Gestiona suscriptores y envía campañas dirigidas
        </p>
      </div>

      {!hasMigration && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Migración pendiente</AlertTitle>
          <AlertDescription>
            Ejecuta <code>scripts/006_newsletter_and_faq.sql</code> en Supabase para activar este módulo.
          </AlertDescription>
        </Alert>
      )}

      <NewsletterWorkspace subscribers={subscribers} campaigns={campaigns} emailConfigured={emailIsConfigured()} />
    </div>
  )
}
