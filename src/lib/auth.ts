/**
 * auth.ts — Helpers de autenticação centralizados
 * Usa Supabase Auth com JWT real. Nunca expõe service_role no client.
 */
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Client com service_role — apenas em API routes, nunca no browser */
export const adminClient = createClient(SB_URL, SB_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export interface AuthUser {
  id: string          // UUID do Supabase Auth
  email: string
  name: string
  role: 'admin' | 'member'
  slug: string
}

/** Extrai e valida o JWT do cookie de sessão (server-side) */
export async function getSessionUser(req: NextRequest): Promise<AuthUser | null> {
  // Tenta JWT do cookie "sb_access_token" (Supabase Auth)
  const sbToken = req.cookies.get('sb_access_token')?.value
  if (sbToken) {
    try {
      const { data, error } = await adminClient.auth.getUser(sbToken)
      if (data?.user && !error) {
        const m = data.user.user_metadata || {}
        return {
          id: data.user.id,
          email: data.user.email!,
          name: m.name || data.user.email!.split('@')[0],
          role: m.role || 'member',
          slug: m.slug || 'user',
        }
      }
    } catch {}

    // Se access_token expirou, tentar refresh
    const refreshToken = req.cookies.get('sb_refresh_token')?.value
    if (refreshToken) {
      try {
        const { data } = await adminClient.auth.refreshSession({ refresh_token: refreshToken })
        if (data?.user) {
          const m = data.user.user_metadata || {}
          return {
            id: data.user.id,
            email: data.user.email!,
            name: m.name || data.user.email!.split('@')[0],
            role: m.role || 'member',
            slug: m.slug || 'user',
          }
        }
      } catch {}
    }
  }

  // Fallback: byond_user cookie (legado — só para compatibilidade temporária)
  const legacyCookie = req.cookies.get('byond_user')?.value
  if (legacyCookie) {
    try {
      const u = JSON.parse(Buffer.from(legacyCookie, 'base64').toString())
      // Mapeia IDs legados para UUIDs reais
      const idMap: Record<string, string> = {
        'victor-id': '8f03509e-c798-4db0-bcf0-af4cee512623',
        'paulo-id':  '57177334-9c0b-4251-a538-56de3f77038d',
      }
      return {
        id: idMap[u.id] || u.id,
        email: u.email || `${u.slug}@level.app`,
        name: u.name,
        role: u.slug === 'victor' ? 'admin' : 'member',
        slug: u.slug,
      }
    } catch {}
  }

  return null
}

/** Lista todos os usuários (admin only) */
export async function listUsers(): Promise<AuthUser[]> {
  const { data } = await adminClient.auth.admin.listUsers()
  return (data?.users || [])
    .filter(u => u.user_metadata?.name) // só usuários do Level
    .map(u => ({
      id: u.id,
      email: u.email!,
      name: u.user_metadata?.name || u.email!,
      role: (u.user_metadata?.role || 'member') as 'admin' | 'member',
      slug: u.user_metadata?.slug || u.email!.split('@')[0],
    }))
}
