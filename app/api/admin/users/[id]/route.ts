import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role, SectionKey } from '@/lib/access/types'
import { logActivity } from '@/lib/activity-log'

async function verifySuperadmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superadmin') return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await verifySuperadmin()
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { role, status, permissions, full_name } = body as {
    role?: Role
    status?: 'active' | 'suspended'
    permissions?: { section_key: SectionKey; can_write: boolean }[]
    full_name?: string
  }

  const admin = createAdminClient()

  // Update profile fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (role) updates.role = role
  if (status) updates.status = status
  if (full_name !== undefined) updates.full_name = full_name

  const { error: profileError } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Update permissions if provided
  if (permissions) {
    await admin.from('user_permissions').delete().eq('user_id', id)

    if (permissions.length > 0) {
      const { error: permError } = await admin
        .from('user_permissions')
        .insert(permissions.map(p => ({
          user_id: id,
          section_key: p.section_key,
          can_write: p.can_write,
        })))

      if (permError) {
        return NextResponse.json({ error: permError.message }, { status: 500 })
      }
    }
  }

  // Get user email for logging
  const { data: targetProfile } = await admin.from('profiles').select('email').eq('id', id).single()
  if (role) {
    await logActivity({ action: "user.role_changed", entityType: "user", entityName: targetProfile?.email || id, metadata: { new_role: role } })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await verifySuperadmin()
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params

  if (id === caller.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
