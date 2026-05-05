"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { logActivityClient } from "@/lib/activity-log-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { TEAM_MEMBERS, loadTasksFromStorage, saveTasksToStorage, type Task } from "./task-list"

const NONE = "__none__"

export function QuickCreateTaskDialog({
  open,
  onOpenChange,
  date,
  isDemo = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string | null
  isDemo?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [assignedTo, setAssignedTo] = useState<string>(NONE)

  useEffect(() => {
    if (open) {
      setTitle("")
      setDescription("")
      setPriority("medium")
      setAssignedTo(NONE)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    setLoading(true)

    if (isDemo) {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title,
        description: description || null,
        priority,
        due_date: date,
        assigned_to: assignedTo !== NONE ? assignedTo : null,
        status: "pending",
        created_at: new Date().toISOString(),
      }
      const current = loadTasksFromStorage([])
      saveTasksToStorage([newTask, ...current])
      window.dispatchEvent(new Event("tasks-updated"))
      onOpenChange(false)
      setLoading(false)
      router.refresh()
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error } = await supabase.from("tasks").insert({
      title,
      description: description || null,
      priority,
      due_date: date,
      assigned_to: assignedTo !== NONE ? assignedTo : null,
      user_id: user.id,
      status: "pending",
    })

    if (!error) {
      logActivityClient({ action: "task.created", entityType: "task", entityName: title, metadata: { priority, due_date: date } })
    }
    setLoading(false)
    onOpenChange(false)
    router.refresh()
  }

  const formattedDate = date ? new Date(date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>{formattedDate}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="qc-title">Título</FieldLabel>
            <Input
              id="qc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Llamar a Carmen"
              autoFocus
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="qc-description">Descripción (opcional)</FieldLabel>
            <Textarea
              id="qc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="qc-priority">Prioridad</FieldLabel>
              <Select value={priority} onValueChange={(v: "low" | "medium" | "high") => setPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="qc-assigned">Asignar a</FieldLabel>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin asignar</SelectItem>
                  {TEAM_MEMBERS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title}>
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
