import {
  CheckSquare,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Zap,
  FolderOpen,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const priorityColors = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

const priorityLabels = {
  critical: 'Crítica',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baixa',
}

// Dados mock para visualização inicial
const mockStats = {
  tasksToday: 3,
  urgentTasks: 2,
  overdueCount: 1,
  plannedHours: 6.5,
  completedHours: 2,
  availableHours: 4.5,
}

const mockTasks = [
  { id: '1', name: '3 Reels — Clínica Dental', client: 'Clínica Dental', deadline: 'Hoje', priority: 'critical' as const, estimatedMinutes: 210 },
  { id: '2', name: 'Podcast — Gemini Cast', client: 'Gemini', deadline: 'Amanhã', priority: 'high' as const, estimatedMinutes: 120 },
  { id: '3', name: 'Vídeo Institucional', client: 'Empresa XYZ', deadline: 'Sex, 17/10', priority: 'normal' as const, estimatedMinutes: 180 },
]

const modules = [
  { href: '/clientes', icon: Users, label: 'Clientes', desc: 'Cadastre e gerencie clientes', color: 'text-blue-400' },
  { href: '/projetos', icon: FolderOpen, label: 'Projetos', desc: 'Organize por projeto', color: 'text-green-400' },
  { href: '/tarefas', icon: CheckSquare, label: 'Tarefas', desc: 'Todas as demandas', color: 'text-violet-400' },
  { href: '/processos', icon: Zap, label: 'Processos', desc: 'Importe sua planilha', color: 'text-yellow-400' },
  { href: '/calendario', icon: Calendar, label: 'Calendário', desc: 'Visualização inteligente', color: 'text-pink-400' },
  { href: '/assistente', icon: Zap, label: 'Assistente IA', desc: 'Envie áudios e textos', color: 'text-cyan-400' },
]

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">Tarefas hoje</span>
              <CheckSquare className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-3xl font-bold text-white">{mockStats.tasksToday}</p>
            <p className="text-zinc-500 text-xs mt-1">{mockStats.urgentTasks} urgentes</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">Atrasadas</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-red-400">{mockStats.overdueCount}</p>
            <p className="text-zinc-500 text-xs mt-1">requer atenção</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">Horas planejadas</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{mockStats.plannedHours}h</p>
            <p className="text-zinc-500 text-xs mt-1">{mockStats.completedHours}h realizadas</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">Disponíveis</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-400">{mockStats.availableHours}h</p>
            <p className="text-zinc-500 text-xs mt-1">para novos projetos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarefas prioritárias */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              Prioridades de hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockTasks.map((task) => (
              <div key={task.id} className="flex items-start justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{task.name}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{task.client} · {Math.round(task.estimatedMinutes / 60 * 10) / 10}h estimadas</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 ml-3">
                  <Badge className={`text-xs border ${priorityColors[task.priority]}`}>
                    {priorityLabels[task.priority]}
                  </Badge>
                  <span className="text-zinc-500 text-xs">{task.deadline}</span>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-zinc-800">
              <p className="text-zinc-500 text-xs text-center">
                Conecte o Supabase para ver suas tarefas reais
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Módulos */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Módulos da plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {modules.map((mod) => {
                const Icon = mod.icon
                return (
                  <a
                    key={mod.href}
                    href={mod.href}
                    className="flex flex-col gap-1.5 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800 transition-all"
                  >
                    <Icon className={`w-5 h-5 ${mod.color}`} />
                    <p className="text-white text-sm font-medium">{mod.label}</p>
                    <p className="text-zinc-500 text-xs leading-tight">{mod.desc}</p>
                  </a>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup notice */}
      <Card className="bg-violet-950/30 border-violet-800/50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-violet-300 font-medium text-sm">Configuração necessária</p>
              <p className="text-violet-400/70 text-xs mt-1 leading-relaxed">
                Para ativar todos os recursos, configure as variáveis de ambiente do Supabase e execute a migration SQL.
                Consulte o arquivo <code className="bg-violet-900/50 px-1 rounded text-violet-300">FASE1_SUMMARY.md</code> para instruções completas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
