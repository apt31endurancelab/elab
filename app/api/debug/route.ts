import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated', authError })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data: permissions, error: permError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', user.id)

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile,
      profileError,
      permissions,
      permError,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) })
  }
}
