import { NextResponse, type NextRequest } from 'next/server'

// Rotas que NÃO precisam de autenticação
const PUBLIC_PATHS = ['/login', '/api/auth', '/oauth']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redireciona raiz para /inicio
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/inicio', request.url))
  }

  // APIs verificam auth internamente — deixa passar
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Arquivos estáticos — deixa passar
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Rotas públicas — deixa passar
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // Rotas protegidas — verifica sessão
  const session = request.cookies.get('byond_session')
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-|apple-touch|manifest|ambient).*)'],
}
