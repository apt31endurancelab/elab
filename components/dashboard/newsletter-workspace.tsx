"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Mail, Plus, Send, AlertCircle, CheckCircle2, X } from "lucide-react"

export type NewsletterSubscriber = {
  id: string
  email: string
  full_name: string | null
  source: string | null
  segments: string[]
  status: "active" | "unsubscribed" | "bounced"
  created_at: string
}

export type NewsletterCampaign = {
  id: string
  subject: string
  segments: string[]
  recipient_count: number
  sent_count: number
  failed_count: number
  status: string
  sent_at: string | null
  created_at: string
}

export function NewsletterWorkspace({
  subscribers,
  campaigns,
  emailConfigured,
}: {
  subscribers: NewsletterSubscriber[]
  campaigns: NewsletterCampaign[]
  emailConfigured: boolean
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [newSegments, setNewSegments] = useState("")
  const [adding, setAdding] = useState(false)

  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [selectedSegments, setSelectedSegments] = useState<string[]>([])
  const [testEmail, setTestEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null)

  const allSegments = Array.from(new Set(subscribers.flatMap(s => s.segments).filter(Boolean))).sort()
  const activeSubs = subscribers.filter(s => s.status === "active")

  const filteredCount = selectedSegments.length === 0
    ? activeSubs.length
    : activeSubs.filter(s => selectedSegments.every(seg => s.segments.includes(seg))).length

  const addSubscriber = async () => {
    setAdding(true)
    try {
      const res = await fetch("/api/newsletter/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          full_name: newName || undefined,
          segments: newSegments.split(",").map(s => s.trim()).filter(Boolean),
          source: "manual",
        }),
      })
      if (res.ok) {
        setAddOpen(false)
        setNewEmail("")
        setNewName("")
        setNewSegments("")
        router.refresh()
      }
    } finally {
      setAdding(false)
    }
  }

  const unsubscribe = async (id: string) => {
    if (!confirm("¿Marcar como desuscrito?")) return
    await fetch(`/api/newsletter/subscribers?id=${id}`, { method: "DELETE" })
    router.refresh()
  }

  const send = async (mode: "test" | "broadcast") => {
    if (!subject || !body) return
    setSending(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          segments: mode === "broadcast" ? selectedSegments : undefined,
          test_email: mode === "test" ? testEmail : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFeedback({ kind: "error", message: data.error || `Error ${res.status}` })
      } else if (mode === "test") {
        setFeedback({ kind: "success", message: `Test enviado a ${testEmail}` })
      } else {
        setFeedback({ kind: "success", message: `Enviado a ${data.sent}/${data.sent + (data.failed || 0)} suscriptores` })
        setTimeout(() => router.refresh(), 800)
      }
    } catch (err) {
      setFeedback({ kind: "error", message: err instanceof Error ? err.message : "Error" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Suscriptores activos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeSubs.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Desuscritos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-muted-foreground">{subscribers.filter(s => s.status === "unsubscribed").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Bounces</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-500">{subscribers.filter(s => s.status === "bounced").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Campañas enviadas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{campaigns.filter(c => c.status === "sent").length}</div></CardContent>
        </Card>
      </div>

      {!emailConfigured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Email no configurado</AlertTitle>
          <AlertDescription>
            Define <code>RESEND_API_KEY</code> y <code>MAIL_FROM</code> en <code>.env.local</code> para poder enviar.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Componer</TabsTrigger>
          <TabsTrigger value="subscribers">Suscriptores</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Nueva campaña</CardTitle>
              <CardDescription>
                Usa <code>{"{name}"}</code> para personalizar con el nombre del suscriptor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field>
                <FieldLabel>Asunto</FieldLabel>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Endurance Lab — Nuevo artículo" />
              </Field>
              <Field>
                <FieldLabel>Mensaje (HTML simple, saltos de línea preservados)</FieldLabel>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="Hola {name},..." />
              </Field>

              {allSegments.length > 0 && (
                <Field>
                  <FieldLabel>Segmentos (vacío = todos)</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {allSegments.map(seg => {
                      const active = selectedSegments.includes(seg)
                      return (
                        <Badge
                          key={seg}
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedSegments(active
                              ? selectedSegments.filter(s => s !== seg)
                              : [...selectedSegments, seg])
                          }}
                        >
                          {seg}
                          {active && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      )
                    })}
                  </div>
                </Field>
              )}

              <div className="text-sm text-muted-foreground">
                Audiencia: <strong>{filteredCount}</strong> suscriptor{filteredCount === 1 ? "" : "es"} activo{filteredCount === 1 ? "" : "s"}
                {selectedSegments.length > 0 && ` con ${selectedSegments.join(" + ")}`}
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Field className="flex-1 min-w-[240px]">
                  <FieldLabel>Email de prueba</FieldLabel>
                  <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="prueba@endurancelab.cc" />
                </Field>
                <Button variant="outline" onClick={() => send("test")} disabled={sending || !testEmail || !subject || !body}>
                  {sending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Enviar prueba
                </Button>
                <Button onClick={() => send("broadcast")} disabled={sending || !subject || !body || filteredCount === 0}>
                  {sending ? <Spinner className="mr-2 h-4 w-4" /> : <Send className="h-4 w-4 mr-1" />}
                  Enviar a {filteredCount}
                </Button>
              </div>

              {feedback && (
                <Alert variant={feedback.kind === "success" ? "default" : "destructive"}>
                  {feedback.kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Suscriptores</CardTitle>
                <CardDescription>{subscribers.length} en total</CardDescription>
              </div>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo suscriptor</DialogTitle>
                    <DialogDescription>Añade manualmente o segmenta para campañas dirigidas.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Field>
                      <FieldLabel>Email</FieldLabel>
                      <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                    </Field>
                    <Field>
                      <FieldLabel>Nombre (opcional)</FieldLabel>
                      <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </Field>
                    <Field>
                      <FieldLabel>Segmentos (separados por coma)</FieldLabel>
                      <Input value={newSegments} onChange={(e) => setNewSegments(e.target.value)} placeholder="entrenadores, atletas, chile" />
                    </Field>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                    <Button onClick={addSubscriber} disabled={adding || !newEmail}>
                      {adding ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Añadir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {subscribers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Mail className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm">Aún no hay suscriptores</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Segmentos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.email}</TableCell>
                        <TableCell>{s.full_name || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.source || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.segments.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              s.segments.map(seg => <Badge key={seg} variant="outline" className="text-[10px]">{seg}</Badge>)
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              s.status === "active"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                : s.status === "unsubscribed"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-orange-100 text-orange-700"
                            }
                          >
                            {s.status === "active" ? "Activo" : s.status === "unsubscribed" ? "Desuscrito" : "Bounce"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {s.status === "active" && (
                            <Button size="sm" variant="ghost" onClick={() => unsubscribe(s.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Historial de campañas</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No has enviado ninguna campaña todavía</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Segmentos</TableHead>
                      <TableHead>Enviadas</TableHead>
                      <TableHead>Fallidas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.subject}</TableCell>
                        <TableCell>
                          {c.segments.length === 0 ? <span className="text-xs text-muted-foreground">todos</span> : (
                            <div className="flex gap-1 flex-wrap">
                              {c.segments.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{c.sent_count}</TableCell>
                        <TableCell>{c.failed_count > 0 ? <span className="text-orange-500">{c.failed_count}</span> : 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.sent_at || c.created_at).toLocaleString("es-CL")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
