import { createClient } from "@/lib/supabase/client"

export type ActivityAction =
  | 'user.login' | 'user.logout'
  | 'task.created' | 'task.updated' | 'task.completed'
  | 'client.created' | 'client.updated'
  | 'invoice.created' | 'invoice.sent' | 'invoice.paid'
  | 'affiliate.created' | 'affiliate.updated'
  | 'user.invited' | 'user.role_changed'

export type EntityType = 'task' | 'client' | 'invoice' | 'affiliate' | 'user'

export async function logActivityClient(params: {
  action: ActivityAction
  entityType: EntityType
  entityId?: string
  entityName?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      entity_name: params.entityName ?? null,
      metadata: params.metadata ?? {},
    })
  } catch {
    // Non-blocking
  }
}
