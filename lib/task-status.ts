import { Circle, Clock, CheckCircle2, AlertCircle, type LucideIcon } from "lucide-react"

export type TaskStatus = "pending" | "in_progress" | "stuck" | "completed"

export const TASK_STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "stuck", "completed"]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  stuck: "Estancada",
  completed: "Completada",
}

export const TASK_STATUS_GROUP_LABELS: Record<TaskStatus, string> = {
  pending: "Pendientes",
  in_progress: "En Progreso",
  stuck: "Estancadas",
  completed: "Completadas",
}

export const TASK_STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
  pending: Circle,
  in_progress: Clock,
  stuck: AlertCircle,
  completed: CheckCircle2,
}

// Card style: left border colour stripe + subtle bg tint, so each column reads at a glance.
export function taskStatusCardClass(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "border-l-4 border-l-slate-400 dark:border-l-slate-600"
    case "in_progress":
      return "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
    case "stuck":
      return "border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/20"
    case "completed":
      return "border-l-4 border-l-emerald-500"
  }
}

// Used in headers, badges, icon colours.
export function taskStatusAccentClass(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "text-slate-500 dark:text-slate-400"
    case "in_progress":
      return "text-blue-600 dark:text-blue-400"
    case "stuck":
      return "text-orange-600 dark:text-orange-400"
    case "completed":
      return "text-emerald-600 dark:text-emerald-400"
  }
}

// Outline-style badge override for status pills.
export function taskStatusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
    case "in_progress":
      return "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
    case "stuck":
      return "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300"
    case "completed":
      return "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
  }
}

export function taskStatusLabel(status: TaskStatus | string): string {
  return TASK_STATUS_LABELS[status as TaskStatus] || status
}

export function taskStatusGroupLabel(status: TaskStatus | string): string {
  return TASK_STATUS_GROUP_LABELS[status as TaskStatus] || status
}
