"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from "lucide-react"
import { type Task, TEAM_MEMBERS, loadTasksFromStorage, saveTasksToStorage } from "./task-list"

export function CreateTaskDialog({ isDemo = false }: { isDemo?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [dueDate, setDueDate] = useState("")
  const [assignedTo, setAssignedTo] = useState<string>("")

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setPriority("medium")
    setDueDate("")
    setAssignedTo("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isDemo) {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title,
        description: description || null,
        priority,
        due_date: dueDate || null,
        assigned_to: (assignedTo && assignedTo !== "none") ? assignedTo : null,
        status: "pending",
        created_at: new Date().toISOString(),
      }
      const current = loadTasksFromStorage([])
      saveTasksToStorage([newTask, ...current])
      window.dispatchEvent(new Event("tasks-updated"))
      setOpen(false)
      resetForm()
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase.from("tasks").insert({
      title,
      description: description || null,
      priority,
      due_date: dueDate || null,
      assigned_to: (assignedTo && assignedTo !== "none") ? assignedTo : null,
      user_id: user.id,
      status: "pending",
    })

    if (error) {
      console.error("Error creating task:", error)
      setLoading(false)
      return
    }

    setOpen(false)
    resetForm()
    setLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Tarea
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nueva Tarea</DialogTitle>
          <DialogDescription>
            Anade una nueva tarea para el equipo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="title">Titulo</FieldLabel>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Revisar inventario"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Descripcion (opcional)</FieldLabel>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="priority">Prioridad</FieldLabel>
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
              <FieldLabel htmlFor="due_date">Fecha limite</FieldLabel>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="assigned_to">Asignar a</FieldLabel>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {TEAM_MEMBERS.map((member) => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title}>
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Crear Tarea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
