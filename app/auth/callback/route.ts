import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as string | null
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // Handle PKCE flow (code exchange)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await logActivity({ action: "user.login", entityType: "user" })
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Handle magic link OTP flow (token_hash)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'magiclink',
    })
    if (!error) {
      await logActivity({ action: "user.login", entityType: "user" })
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If neither code nor token_hash, try client-side handling
  // Redirect to a client page that can handle the hash fragment
  if (!code && !token_hash) {
    return NextResponse.redirect(`${origin}/auth/callback/confirm?next=${encodeURIComponent(next)}`)
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
