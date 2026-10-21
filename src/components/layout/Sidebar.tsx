'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  Bot,
  Clock,
  LogOut,
  GitBranch,
  Kanban,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/tarefas',       label: 'Tarefas',          icon: CheckSquare },
  { href: '/processos',     label: 'Processos',        icon: GitBranch },
  { href: '/calendario',    label: 'Calendário',       icon: Calendar },
  { href: '/assistente',    label: 'Assistente IA',    icon: Bot },
  { href: '/tempo',         label: 'Controle de Tempo', icon: Clock },
  { href: '/sobre',         label: 'Sobre',            icon: UserCircle },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-black border-r border-white/10 flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-b border-white/10">
        <img
          src="/byondlab-logo.jpg"
          alt="Level"
          className="h-10 w-auto invert opacity-90"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-white text-black font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 w-full transition-all">
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
