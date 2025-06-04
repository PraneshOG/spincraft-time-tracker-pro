
export interface Employee {
  id: string;
  name: string;
  employee_id: string;
  gender: 'male' | 'female';
  salary_per_hour: number;
  joining_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkLog {
  id: string;
  employee_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  total_hours: number;
  status: 'present' | 'absent' | 'overtime' | 'holiday';
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  employees?: {
    name: string;
    employee_id: string;
  };
}

export interface AdminLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  admin_id: string;
}

export interface Admin {
  id: string;
  username: string;
  name: string;
}

export interface CalendarDay {
  date: string;
  workLog?: WorkLog;
  isToday: boolean;
  isCurrentMonth: boolean;
}
