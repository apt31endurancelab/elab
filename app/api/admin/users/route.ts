import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDefaultPermissions } from '@/lib/access/helpers'
import type { Role, SectionKey } from '@/lib/access/types'

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

export async function GET() {
  const caller = await verifySuperadmin()
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: permissions } = await admin
    .from('user_permissions')
    .select('user_id, section_key, can_write')

  const usersWithPermissions = (profiles || []).map(profile => ({
    ...profile,
    permissions: (permissions || [])
      .filter(p => p.user_id === profile.id)
      .map(p => ({ section_key: p.section_key, can_write: p.can_write })),
  }))

  return NextResponse.json(usersWithPermissions)
}

export async function POST(request: NextRequest) {
  const caller = await verifySuperadmin()
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { email, role, full_name, permissions } = body as {
    email: string
    role: Role
    full_name?: string
    permissions?: { section_key: SectionKey; can_write: boolean }[]
  }

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Invite user via Supabase Auth
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: full_name || null,
      role,
      status: 'invited',
      invited_by: caller.id,
    },
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  const userId = inviteData.user.id

  // Insert permissions
  const permsToInsert = permissions || getDefaultPermissions(role)
  if (permsToInsert.length > 0) {
    const { error: permError } = await admin
      .from('user_permissions')
      .insert(permsToInsert.map(p => ({
        user_id: userId,
        section_key: p.section_key,
        can_write: p.can_write,
      })))

    if (permError) {
      return NextResponse.json({ error: permError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, userId })
}
