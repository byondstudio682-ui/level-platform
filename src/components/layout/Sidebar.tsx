'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CheckSquare,
  Settings2,
  Calendar,
  Bot,
  Clock,
  LogOut,
  Clapperboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/projetos', label: 'Projetos', icon: FolderOpen },
  { href: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { href: '/processos', label: 'Processos', icon: Settings2 },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/assistente', label: 'Assistente IA', icon: Bot },
  { href: '/tempo', label: 'Controle de Tempo', icon: Clock },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <Clapperboard className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">AudioVisual IA</p>
          <p className="text-zinc-500 text-xs">Gestão inteligente</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-violet-600/20 text-violet-400 font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 w-full transition-colors">
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
