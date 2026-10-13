export type Priority = 'critical' | 'high' | 'normal' | 'low'
export type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type Complexity = 'simple' | 'normal' | 'complex'

export interface Client {
  id: string
  user_id: string
  name: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  client_id: string
  name: string
  description?: string
  status: ProjectStatus
  start_date?: string
  end_date?: string
  notes?: string
  created_at: string
  updated_at: string
  client?: Client
}

export interface ProcessCatalog {
  id: string
  user_id: string
  name: string
  description?: string
  category?: string
  deliverable_type?: string
  base_duration_minutes: number
  complexity: Complexity
  is_required: boolean
  is_shareable: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  client_id?: string
  project_id?: string
  name: string
  description?: string
  category?: string
  deliverable_quantity: number
  entry_date: string
  deadline?: string
  planned_start?: string
  planned_end?: string
  estimated_minutes?: number
  actual_minutes: number
  priority: Priority
  priority_manual: boolean
  status: TaskStatus
  risk_level: RiskLevel
  notes?: string
  source: 'manual' | 'audio' | 'text'
  created_at: string
  updated_at: string
  client?: Client
  project?: Project
  steps?: TaskStep[]
}

export interface TaskStep {
  id: string
  task_id: string
  process_catalog_id?: string
  name: string
  description?: string
  estimated_minutes: number
  actual_minutes: number
  snapshot_process_name?: string
  snapshot_duration_minutes?: number
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'skipped'
  is_required: boolean
  order_index: number
  started_at?: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  tasksToday: Task[]
  urgentTasks: Task[]
  upcomingDeadlines: Task[]
  overdueTasks: Task[]
  tasksWithoutDeadline: Task[]
  plannedHoursToday: number
  completedHoursToday: number
  availableHoursToday: number
  riskyDeliveries: Task[]
  activeProjects: Project[]
}
