"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Plus, Pencil, Trash2, HelpCircle, Search } from "lucide-react"

export type FaqEntry = {
  id: string
  question: string
  answer: string
  category: string | null
  tags: string[]
  source: string | null
  is_published: boolean
  asked_count: number
  created_at: string
  updated_at: string
}

const ALL = "__all__"

export function FaqWorkspace({ entries }: { entries: FaqEntry[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>(ALL)
  const [editing, setEditing] = useState<FaqEntry | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [draft, setDraft] = useState<{ question: string; answer: string; category: string; tags: string; source: string; is_published: boolean }>({
    question: "", answer: "", category: "", tags: "", source: "", is_published: true,
  })

  const categories = Array.from(new Set(entries.map(e => e.category).filter(Boolean) as string[])).sort()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      if (category !== ALL && e.category !== category) return false
      if (q && !e.question.toLowerCase().includes(q) && !e.answer.toLowerCase().includes(q) && !e.tags.some(t => t.toLowerCase().includes(q))) return false
      return true
    })
  }, [entries, search, category])

  const grouped = useMemo(() => {
    const m = new Map<string, FaqEntry[]>()
    for (const e of filtered) {
      const cat = e.category || "Sin categoría"
      m.set(cat, [...(m.get(cat) ?? []), e])
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const openNew = () => {
    setEditing(null)
    setDraft({ question: "", answer: "", category: "", tags: "", source: "", is_published: true })
    setOpen(true)
  }

  const openEdit = (e: FaqEntry) => {
    setEditing(e)
    setDraft({
      question: e.question,
      answer: e.answer,
      category: e.category || "",
      tags: e.tags.join(", "),
      source: e.source || "",
      is_published: e.is_published,
    })
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          question: draft.question,
          answer: draft.answer,
          category: draft.category || null,
          tags: draft.tags.split(",").map(t => t.trim()).filter(Boolean),
          source: draft.source || null,
          is_published: draft.is_published,
        }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta entrada?")) return
    await fetch(`/api/faq?id=${id}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-medium">Knowledge Base</CardTitle>
          <CardDescription>
            Pregunta + respuesta indexadas por categoría/tag. Esta tabla alimentará al bot de venta/postventa cuando esté listo.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva entrada
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pregunta, respuesta o tag…" className="pl-8" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las categorías</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} de {entries.length}</span>
        </div>

        {grouped.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <HelpCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm">No hay entradas todavía</p>
            <p className="text-xs">Empieza con preguntas frecuentes que recibe Carlos o que estudia Jorge.</p>
          </div>
        ) : (
          grouped.map(([cat, list]) => (
            <div key={cat} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{cat}</h3>
              <Accordion type="multiple" className="space-y-2">
                {list.map(e => (
                  <AccordionItem key={e.id} value={e.id} className="border rounded-md px-3">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-start gap-2 flex-1 text-left">
                        <span className="font-medium text-sm">{e.question}</span>
                        {!e.is_published && <Badge variant="outline" className="ml-2 text-[10px]">Borrador</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm whitespace-pre-wrap">{e.answer}</p>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {e.tags.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                          {e.source && <span className="text-muted-foreground">Fuente: {e.source}</span>}
                          <span className="text-muted-foreground">Preguntado {e.asked_count} vez{e.asked_count === 1 ? "" : "es"}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(e.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar entrada" : "Nueva entrada"}</DialogTitle>
            <DialogDescription>
              Una pregunta concreta + su respuesta canónica. Usa categoría y tags para que el bot pueda recuperarla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>Pregunta</FieldLabel>
              <Input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="¿Cada cuánto hay que calibrar la cinta?" />
            </Field>
            <Field>
              <FieldLabel>Respuesta</FieldLabel>
              <Textarea rows={6} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} placeholder="Recomendamos calibración cada..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Categoría</FieldLabel>
                <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Calibración" />
              </Field>
              <Field>
                <FieldLabel>Fuente</FieldLabel>
                <Input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="Jorge / paper:VO2-2024.pdf" />
              </Field>
            </div>
            <Field>
              <FieldLabel>Tags (separados por coma)</FieldLabel>
              <Input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="cinta, mantenimiento, periodicidad" />
            </Field>
            <div className="flex items-center gap-2">
              <Switch checked={draft.is_published} onCheckedChange={(v) => setDraft({ ...draft, is_published: v })} />
              <Label>Publicada (visible para el bot)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !draft.question || !draft.answer}>
              {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {editing ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
