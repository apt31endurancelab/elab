"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  StickyNote,
  Mail,
  Bell,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Phone,
  Users,
  Plus,
  Clock,
  CircleDot,
  X,
} from "lucide-react"

type Activity = {
  id: string
  client_id: string
  invoice_id: string | null
  type: string
  title: string
  description: string | null
  is_reminder: boolean
  reminder_date: string | null
  reminder_completed: boolean
  created_at: string
}

const ACTIVITIES_STORAGE_KEY = "endurancelab_activities"

function loadActivitiesFromStorage(clientId: string, fallback: Activity[]): Activity[] {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem(ACTIVITIES_STORAGE_KEY)
    if (stored) {
      const all: Activity[] = JSON.parse(stored)
      return all.filter(a => a.client_id === clientId)
    }
  } catch {}
  return fallback
}

function saveActivityToStorage(activity: Activity) {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem(ACTIVITIES_STORAGE_KEY)
    const all: Activity[] = stored ? JSON.parse(stored) : []
    all.unshift(activity)
    localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(all))
  } catch {}
}

function updateActivityInStorage(activityId: string, updates: Partial<Activity>) {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem(ACTIVITIES_STORAGE_KEY)
    const all: Activity[] = stored ? JSON.parse(stored) : []
    const updated = all.map(a => a.id === activityId ? { ...a, ...updates } : a)
    localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

const typeConfig: Record<string, { icon: typeof StickyNote; color: string; label: string }> = {
  note: { icon: StickyNote, color: "text-blue-500", label: "Nota" },
  email_sent: { icon: Send, color: "text-emerald-500", label: "Email enviado" },
  email_reminder: { icon: Mail, color: "text-orange-500", label: "Recordatorio email" },
  invoice_created: { icon: FileText, color: "text-purple-500", label: "Factura creada" },
  invoice_sent: { icon: Send, color: "text-blue-500", label: "Factura enviada" },
  invoice_paid: { icon: CheckCircle2, color: "text-emerald-500", label: "Factura pagada" },
  invoice_overdue: { icon: AlertTriangle, color: "text-red-500", label: "Factura vencida" },
  payment_reminder: { icon: Bell, color: "text-orange-500", label: "Recordatorio pago" },
  call: { icon: Phone, color: "text-sky-500", label: "Llamada" },
  meeting: { icon: Users, color: "text-indigo-500", label: "Reunión" },
  other: { icon: CircleDot, color: "text-gray-500", label: "Otro" },
}

const quickActions = [
  { type: "note", label: "Nota", icon: StickyNote },
  { type: "call", label: "Llamada", icon: Phone },
  { type: "email_sent", label: "Email", icon: Mail },
  { type: "payment_reminder", label: "Recordatorio", icon: Bell },
]

export function ClientTimeline({
  activities: initialActivities,
  clientId,
  isDemo = false,
}: {
  activities: Activity[]
  clientId: string
  isDemo?: boolean
}) {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [activityType, setActivityType] = useState("note")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isReminder, setIsReminder] = useState(false)
  const [reminderDate, setReminderDate] = useState("")

  useEffect(() => {
    if (isDemo) {
      setActivities(loadActivitiesFromStorage(clientId, initialActivities))
    }
  }, [isDemo, clientId, initialActivities])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setActivityType("note")
    setIsReminder(false)
    setReminderDate("")
    setShowForm(false)
  }

  const handleQuickAction = (type: string) => {
    setActivityType(type)
    setIsReminder(type === "payment_reminder" || type === "email_reminder")
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      client_id: clientId,
      invoice_id: null,
      type: activityType,
      title: title.trim(),
      description: description.trim() || null,
      is_reminder: isReminder,
      reminder_date: isReminder && reminderDate ? reminderDate : null,
      reminder_completed: false,
      created_at: new Date().toISOString(),
    }

    if (isDemo) {
      saveActivityToStorage(newActivity)
      setActivities(prev => [newActivity, ...prev])
      resetForm()
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { error } = await supabase.from("client_activities").insert({
      user_id: user.id,
      client_id: clientId,
      type: activityType,
      title: title.trim(),
      description: description.trim() || null,
      is_reminder: isReminder,
      reminder_date: isReminder && reminderDate ? reminderDate : null,
    })

    if (error) {
      console.error("Error creating activity:", error)
      setLoading(false)
      return
    }

    resetForm()
    setLoading(false)
    router.refresh()
  }

  const toggleReminderComplete = async (activity: Activity) => {
    const newValue = !activity.reminder_completed

    if (isDemo) {
      updateActivityInStorage(activity.id, { reminder_completed: newValue })
      setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, reminder_completed: newValue } : a))
      return
    }

    const supabase = createClient()
    await supabase
      .from("client_activities")
      .update({ reminder_completed: newValue })
      .eq("id", activity.id)
    router.refresh()
  }

  // Separate reminders from regular activities
  const pendingReminders = activities.filter(a => a.is_reminder && !a.reminder_completed)
  const timelineItems = activities

  return (
    <div className="space-y-4">
      {/* Pending reminders alert */}
      {pendingReminders.length > 0 && (
        <div className="space-y-2">
          {pendingReminders.map(reminder => {
            const isOverdue = reminder.reminder_date && new Date(reminder.reminder_date) < new Date()
            return (
              <div
                key={reminder.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-sm",
                  isOverdue
                    ? "bg-destructive/10 border-destructive/30"
                    : "bg-orange-500/10 border-orange-500/30"
                )}
              >
                <Checkbox
                  checked={reminder.reminder_completed}
                  onCheckedChange={() => toggleReminderComplete(reminder)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{reminder.title}</p>
                  {reminder.reminder_date && (
                    <p className={cn("text-xs mt-0.5", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {isOverdue ? "Vencido: " : "Para: "}
                      {new Date(reminder.reminder_date).toLocaleDateString("es-CL")}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        {quickActions.map(action => (
          <Button
            key={action.type}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction(action.type)}
            className="text-xs"
          >
            <action.icon className="h-3 w-3 mr-1" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Add activity form */}
      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Nueva actividad</p>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetForm}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la actividad..."
            className="text-sm"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)..."
            rows={2}
            className="text-sm"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isReminder}
                onCheckedChange={(v) => setIsReminder(v === true)}
              />
              Es un recordatorio
            </label>
            {isReminder && (
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="text-sm w-auto"
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancelar</Button>
            <Button size="sm" onClick={handleSubmit} disabled={loading || !title.trim()}>
              {loading ? <Clock className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {timelineItems.length > 0 && (
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
        )}

        <div className="space-y-1">
          {timelineItems.map((activity) => {
            const config = typeConfig[activity.type] || typeConfig.other
            const Icon = config.icon

            return (
              <div key={activity.id} className="relative flex gap-3 py-2">
                <div className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border", activity.is_reminder && !activity.reminder_completed ? "border-orange-500" : "border-border")}>
                  <Icon className={cn("h-3.5 w-3.5", config.color)} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm font-medium", activity.is_reminder && activity.reminder_completed && "line-through text-muted-foreground")}>
                      {activity.title}
                    </p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {config.label}
                    </Badge>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{activity.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(activity.created_at).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {activity.is_reminder && (
                  <Checkbox
                    checked={activity.reminder_completed}
                    onCheckedChange={() => toggleReminderComplete(activity)}
                    className="mt-1"
                  />
                )}
              </div>
            )
          })}
        </div>

        {timelineItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No hay actividad registrada. Añade una nota o recordatorio.
          </div>
        )}
      </div>
    </div>
  )
}
