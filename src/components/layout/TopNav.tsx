'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'

const navItems = [
  { href: '/home',          label: '⊞ Clientes' },
  { href: '/inicio',        label: 'Módulos' },
  { href: '/tarefas',       label: 'Tarefas' },
  { href: '/calendario',    label: 'Calendário' },
  { href: '/assistente',    label: 'Assistente IA' },
  { href: '/tempo',         label: 'Tempo' },
  { href: '/processos',     label: 'Processos' },
  { href: '/configuracoes', label: 'Config.' },
]

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const navRef = useRef<HTMLDivElement>(null)
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 })
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const activeIndex = navItems.findIndex(
      item => pathname === item.href || pathname.startsWith(item.href + '/')
    )
    if (activeIndex === -1) return
    const el = itemRefs.current[activeIndex]
    const nav = navRef.current
    if (!el || !nav) return
    const navRect = nav.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    setPillStyle({ left: elRect.left - navRect.left, width: elRect.width, opacity: 1 })
  }, [pathname])

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-sm border-b border-black/8">
        <div className="flex items-center gap-6 px-6 h-14">

          {/* Logo */}
          <Link href="/inicio" className="flex-shrink-0 text-black/80 hover:opacity-70 transition-opacity" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '15px', letterSpacing: '0.15em' }}>
            LEVEL
          </Link>

          {/* Desktop nav */}
          <div className="w-px h-4 bg-black/10 flex-shrink-0 hidden md:block" />
          <div ref={navRef} className="relative items-center gap-1 flex-1 hidden md:flex">
            <div
              className="absolute top-1/2 -translate-y-1/2 h-7 bg-black rounded-lg pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ left: pillStyle.left, width: pillStyle.width, opacity: pillStyle.opacity }}
            />
            {navItems.map((item, i) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={el => { itemRefs.current[i] = el }}
                  className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
                    isActive ? 'text-white' : 'text-black/40 hover:text-black/80'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Desktop logout */}
          <button onClick={handleLogout} className="text-black/30 hover:text-black/70 transition-colors ml-auto hidden md:block flex-shrink-0">
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile: hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="ml-auto text-black/40 hover:text-black transition-colors md:hidden"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-white flex flex-col pt-14 border-b border-black/8" onClick={() => setMobileOpen(false)}>
          <nav className="flex flex-col px-6 py-6 gap-1">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive ? 'bg-black text-white' : 'text-black/50 hover:text-black hover:bg-black/5'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="px-4 py-3 rounded-xl text-sm text-black/30 hover:text-black text-left mt-4 transition-colors"
            >
              Sair
            </button>
          </nav>
        </div>
      )}
    </>
  )
}
