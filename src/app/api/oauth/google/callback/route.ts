import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getUser(req: NextRequest) {
  const cookie = req.cookies.get('byond_user')
  if (!cookie) return null
  try { return JSON.parse(Buffer.from(cookie.value, 'base64').toString('utf8')) }
  catch { return null }
}

export async function GET(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.redirect(new URL('/conectar?error=auth', req.url))

  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/oauth/callback?error=no_code', req.url))

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${req.nextUrl.origin}/api/oauth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/oauth/callback?service=google&error=not_configured', req.url))
  }

  // Troca code por tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.refresh_token) {
    return NextResponse.redirect(new URL(`/oauth/callback?service=google&error=${encodeURIComponent(tokenData.error || 'no_refresh_token')}`, req.url))
  }

  // Busca info do usuário
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const userInfo = await userRes.json()

  // Salva tokens
  await supabase.from('user_integrations').upsert([
    { user_id: user.id, key: 'google_refresh_token', value: tokenData.refresh_token },
    { user_id: user.id, key: 'google_client_id', value: clientId },
    { user_id: user.id, key: 'google_client_secret', value: clientSecret },
    { user_id: user.id, key: 'google_calendar_id', value: userInfo.email || 'primary' },
    { user_id: user.id, key: 'google_account_email', value: userInfo.email || '' },
  ], { onConflict: 'user_id,key' })

  return NextResponse.redirect(new URL(`/oauth/callback?service=google&code=ok&message=${encodeURIComponent(`Google conectado: ${userInfo.email}`)}`, req.url))
}
