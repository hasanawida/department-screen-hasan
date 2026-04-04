export interface Department {
  id: string
  name: string
  code: string
  color: string
  created_at: string
  updated_at: string
}

export interface ScreenSettings {
  id: string
  department_id: string
  welcome_message: string
  show_date: boolean
  show_time: boolean
  transition_interval: number
  theme: 'light' | 'dark'
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  department_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  location: string | null
  day_of_week: number | null
  is_recurring: boolean
  activity_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  department_id: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TickerMessage {
  id: string
  department_id: string | null
  message: string
  is_global: boolean
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface DepartmentData {
  department: Department
  settings: ScreenSettings | null
  activities: Activity[]
  announcements: Announcement[]
  tickerMessages: TickerMessage[]
}
