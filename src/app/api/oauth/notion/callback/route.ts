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

  const clientId = process.env.NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_CLIENT_SECRET
  const redirectUri = `${req.nextUrl.origin}/api/oauth/notion/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/oauth/callback?service=notion&error=not_configured', req.url))
  }

  // Troca code por access_token
  const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || !tokenData.access_token) {
    return NextResponse.redirect(new URL(`/oauth/callback?service=notion&error=${encodeURIComponent(tokenData.error || 'token_error')}`, req.url))
  }

  const workspaceName = tokenData.workspace_name || 'Notion'

  // Salva token
  await supabase.from('user_integrations').upsert([
    { user_id: user.id, key: 'notion_token', value: tokenData.access_token },
    { user_id: user.id, key: 'notion_workspace', value: workspaceName },
  ], { onConflict: 'user_id,key' })

  return NextResponse.redirect(new URL(`/oauth/callback?service=notion&code=ok&message=${encodeURIComponent(`Notion conectado: ${workspaceName}`)}`, req.url))
}
