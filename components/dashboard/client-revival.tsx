"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Mail, Send, Building2, Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export type RevivalClient = {
  id: string
  name: string
  email: string | null
  contact_person: string | null
  last_activity_at: string | null
  invoice_count: number
  total_invoiced: number
  days_since_activity: number | null
}

type Template = { id: string; label: string; subject: string; body: (c: RevivalClient) => string }

const TEMPLATES: Template[] = [
  {
    id: "checkin",
    label: "Check-in suave (60 días)",
    subject: "¿Cómo va todo, {name}?",
    body: (c) => `Hola${c.contact_person ? ` ${c.contact_person}` : ""},

Hace tiempo que no hablamos y quería ver cómo va todo por tu lado. Si hay algo en lo que podamos ayudar desde Endurance Lab — calibraciones, recambios, una nueva máquina — escríbeme y lo revisamos sin compromiso.

Un saludo,
Carlos`,
  },
  {
    id: "calibration",
    label: "Recordatorio de calibración",
    subject: "Recordatorio: calibración de tu máquina",
    body: (c) => `Hola${c.contact_person ? ` ${c.contact_person}` : ""},

Pasamos por aquí para recordarte que las cintas de lactato necesitan calibración periódica para mantener precisión clínica. Si llevas tiempo sin hacerla, te ayudamos a programarla en la siguiente ventana.

Un saludo,
Carlos`,
  },
  {
    id: "shared_question",
    label: "Compartir respuesta común",
    subject: "Respuesta a una duda que también te puede servir",
    body: (c) => `Hola${c.contact_person ? ` ${c.contact_person}` : ""},

Otro cliente nos preguntó algo recientemente que probablemente te suene también: [PEGAR PREGUNTA]. La respuesta corta es: [PEGAR RESPUESTA].

Si quieres profundizar, escríbeme y montamos una llamada rápida.

Un saludo,
Carlos`,
  },
]

function bucketByActivity(c: RevivalClient): "cold" | "warm" | "hot" {
  if (c.days_since_activity === null) return "cold"
  if (c.days_since_activity > 90) return "cold"
  if (c.days_since_activity > 30) return "warm"
  return "hot"
}

const bucketStyles: Record<"cold" | "warm" | "hot", { label: string; className: string }> = {
  cold: { label: "Frío", className: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300" },
  warm: { label: "Templado", className: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300" },
  hot: { label: "Activo", className: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" },
}

export function ClientRevival({ clients }: { clients: RevivalClient[] }) {
  const [search, setSearch] = useState("")
  const [bucket, setBucket] = useState<"all" | "cold" | "warm">("cold")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeFor, setComposeFor] = useState<RevivalClient | null>(null)
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0].id)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients
      .filter((c) => {
        if (q && !c.name.toLowerCase().includes(q) && !(c.email || "").toLowerCase().includes(q)) return false
        if (bucket !== "all" && bucketByActivity(c) !== bucket) return false
        return true
      })
      .sort((a, b) => (b.days_since_activity ?? 9999) - (a.days_since_activity ?? 9999))
  }, [clients, search, bucket])

  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  const openCompose = (client: RevivalClient | null) => {
    const t = TEMPLATES.find(x => x.id === templateId) || TEMPLATES[0]
    if (client) {
      setComposeFor(client)
      setSubject(t.subject.replace("{name}", client.contact_person || client.name))
      setBody(t.body(client))
    } else {
      const first = clients.find(c => selected.has(c.id))
      if (!first) return
      setComposeFor(null)
      setSubject(t.subject.replace("{name}", "amigos"))
      setBody(t.body({
        id: "_",
        name: "amigos",
        email: null,
        contact_person: null,
        last_activity_at: null,
        invoice_count: 0,
        total_invoiced: 0,
        days_since_activity: null,
      }))
    }
    setFeedback(null)
    setComposeOpen(true)
  }

  const onTemplateChange = (id: string) => {
    setTemplateId(id)
    const t = TEMPLATES.find(x => x.id === id) || TEMPLATES[0]
    if (composeFor) {
      setSubject(t.subject.replace("{name}", composeFor.contact_person || composeFor.name))
      setBody(t.body(composeFor))
    } else {
      setSubject(t.subject.replace("{name}", "amigos"))
      setBody(t.body({
        id: "_",
        name: "amigos",
        email: null,
        contact_person: null,
        last_activity_at: null,
        invoice_count: 0,
        total_invoiced: 0,
        days_since_activity: null,
      }))
    }
  }

  const send = async () => {
    setSending(true)
    setFeedback(null)
    const recipients = composeFor ? [composeFor] : clients.filter(c => selected.has(c.id) && c.email)
    if (recipients.length === 0) {
      setFeedback({ kind: "error", message: "Ningún destinatario tiene email registrado." })
      setSending(false)
      return
    }
    try {
      const res = await fetch("/api/clients/revive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_ids: recipients.map(r => r.id),
          subject,
          body,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFeedback({ kind: "error", message: data.error || `Error ${res.status}` })
      } else {
        setFeedback({ kind: "success", message: `Enviado a ${data.sent || recipients.length} cliente${(data.sent || recipients.length) === 1 ? "" : "s"}.` })
        setTimeout(() => { setComposeOpen(false); setSelected(new Set()) }, 1500)
      }
    } catch (err) {
      setFeedback({ kind: "error", message: err instanceof Error ? err.message : "Error desconocido" })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Reactivar clientes</CardTitle>
        <CardDescription>
          Clientes que llevan tiempo sin actividad. Manda un mensaje rápido para reabrir conversación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="flex-1 min-w-[180px]"
          />
          <Select value={bucket} onValueChange={(v: "all" | "cold" | "warm") => setBucket(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cold">Fríos (90+ días)</SelectItem>
              <SelectItem value="warm">Templados (30-90)</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} de {clients.length}
          </span>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm">{selected.size} seleccionado{selected.size === 1 ? "" : "s"}</span>
            <Button size="sm" className="ml-auto" onClick={() => openCompose(null)}>
              <Send className="h-4 w-4 mr-1" />
              Enviar a todos
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Limpiar
            </Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm">No hay clientes en este filtro</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              <span>Seleccionar todos los visibles</span>
            </div>
            {filtered.map((c) => {
              const b = bucketByActivity(c)
              const style = bucketStyles[b]
              const isSelected = selected.has(c.id)
              return (
                <div
                  key={c.id}
                  className={cn("flex items-center gap-3 p-3 rounded-lg border", isSelected && "bg-primary/5 border-primary/30")}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(v) => {
                      const next = new Set(selected)
                      if (v) next.add(c.id); else next.delete(c.id)
                      setSelected(next)
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/dashboard/clients/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      <Badge variant="outline" className={cn("text-[10px]", style.className)}>
                        {style.label}
                      </Badge>
                      {c.email ? (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </span>
                      ) : (
                        <span className="text-xs text-orange-500">Sin email</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {c.days_since_activity === null
                          ? "Sin actividad registrada"
                          : c.days_since_activity === 0
                            ? "Activo hoy"
                            : `Hace ${c.days_since_activity} día${c.days_since_activity === 1 ? "" : "s"}`}
                      </span>
                      <span>· {c.invoice_count} factura{c.invoice_count === 1 ? "" : "s"}</span>
                      <span>· ${c.total_invoiced.toLocaleString("es-CL")}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled={!c.email} onClick={() => openCompose(c)}>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Enviar
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {composeFor ? `Mensaje para ${composeFor.name}` : `Mensaje para ${selected.size} clientes`}
            </DialogTitle>
            <DialogDescription>
              Usa una plantilla o edita libremente. Se envía vía Resend si está configurado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>Plantilla</FieldLabel>
              <Select value={templateId} onValueChange={onTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Asunto</FieldLabel>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Mensaje</FieldLabel>
              <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            {feedback && (
              <div className={cn(
                "p-2 rounded-md text-sm",
                feedback.kind === "success" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400",
              )}>
                {feedback.message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={sending}>Cancelar</Button>
            <Button onClick={send} disabled={sending || !subject || !body}>
              <Send className="h-4 w-4 mr-1" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
