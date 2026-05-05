"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logActivityClient } from "@/lib/activity-log-client"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { type Task, TEAM_MEMBERS } from "./task-list"
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, type TaskStatus } from "@/lib/task-status"

const NONE = "__none__"

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onSaved,
  isDemo = false,
}: {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: Task) => void
  isDemo?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>("pending")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [dueDate, setDueDate] = useState("")
  const [assignedTo, setAssignedTo] = useState<string>(NONE)

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? "")
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(task.due_date ?? "")
    setAssignedTo(task.assigned_to ?? NONE)
  }, [task])

  if (!task) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const updated: Task = {
      ...task,
      title,
      description: description || null,
      status,
      priority,
      due_date: dueDate || null,
      assigned_to: assignedTo && assignedTo !== NONE ? assignedTo : null,
    }

    if (isDemo) {
      onSaved(updated)
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("tasks")
      .update({
        title: updated.title,
        description: updated.description,
        status: updated.status,
        priority: updated.priority,
        due_date: updated.due_date,
        assigned_to: updated.assigned_to,
      })
      .eq("id", task.id)

    if (error) {
      console.error("Error updating task:", error)
      setLoading(false)
      return
    }

    logActivityClient({
      action: status === "completed" && task.status !== "completed" ? "task.completed" : "task.updated",
      entityType: "task",
      entityId: task.id,
      entityName: title,
      metadata: { new_status: status },
    })

    onSaved(updated)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tarea</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la tarea y guarda los cambios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="edit-title">Título</FieldLabel>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-description">Descripción</FieldLabel>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="edit-status">Estado</FieldLabel>
              <Select value={status} onValueChange={(v: TaskStatus) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-priority">Prioridad</FieldLabel>
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="edit-due-date">Fecha límite</FieldLabel>
              <Input
                id="edit-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-assigned">Asignar a</FieldLabel>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin asignar</SelectItem>
                  {TEAM_MEMBERS.map((member) => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
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
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
