import { createClient } from "@/lib/supabase/server"
import { FaqWorkspace, type FaqEntry } from "@/components/dashboard/faq-workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Sparkles } from "lucide-react"

async function getEntries() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("faq_entries")
      .select("*")
      .order("category", { ascending: true })
      .order("created_at", { ascending: false })
    return { entries: (data || []) as FaqEntry[], hasMigration: true }
  } catch {
    return { entries: [] as FaqEntry[], hasMigration: false }
  }
}

export default async function FaqPage() {
  const { entries, hasMigration } = await getEntries()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">FAQ / Knowledge Base</h1>
        <p className="text-muted-foreground">
          Base de conocimiento que alimentará el bot de venta y postventa
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

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Bot pendiente de LLM provider</AlertTitle>
        <AlertDescription>
          La tabla está lista para que un agente la consulte vía búsqueda full-text + embeddings. Cuando elijas
          OpenAI/Anthropic/etc., conectamos un endpoint /api/faq/ask que recupere las entradas relevantes y construya
          la respuesta con el LLM. Mientras tanto, esto sirve como base de conocimiento manual.
        </AlertDescription>
      </Alert>

      <FaqWorkspace entries={entries} />
    </div>
  )
}
