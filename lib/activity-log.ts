import { createClient } from "@/lib/supabase/server"

export type ActivityAction =
  | 'user.login' | 'user.logout'
  | 'task.created' | 'task.updated' | 'task.completed'
  | 'client.created' | 'client.updated'
  | 'invoice.created' | 'invoice.sent' | 'invoice.paid'
  | 'affiliate.created' | 'affiliate.updated'
  | 'user.invited' | 'user.role_changed'
  | 'shopify.order_synced'

export type EntityType = 'task' | 'client' | 'invoice' | 'affiliate' | 'user' | 'shopify'

export async function logActivity(params: {
  action: ActivityAction
  entityType: EntityType
  entityId?: string
  entityName?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = await createClient()
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
    // Non-blocking: never let logging break the main operation
  }
}
