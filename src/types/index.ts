
export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  contactNo: string;
  joiningDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLog {
  id: string;
  employeeId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  totalHours: number;
  status: 'present' | 'absent' | 'overtime' | 'holiday';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AdminLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  adminId: string;
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
