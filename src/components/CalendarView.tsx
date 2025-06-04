import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useEmployees, useWorkLogs } from '@/hooks/useSupabaseData';
import { CalendarDay } from '@/types';

const CalendarView = () => {
  const { employees } = useEmployees();
  const { workLogs, fetchWorkLogs } = useWorkLogs();
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDayLog, setSelectedDayLog] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  useEffect(() => {
    const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    
    fetchWorkLogs({
      employeeId: selectedEmployee === 'all' ? undefined : selectedEmployee,
      startDate,
      endDate,
    });
  }, [selectedEmployee, currentMonth, currentYear, fetchWorkLogs]);

  const getDayStatus = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const log = workLogs.find(log => 
      log.date === dateStr && 
      (selectedEmployee === 'all' || log.employee_id === selectedEmployee)
    );
    return log;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'overtime': return 'bg-orange-500';
      case 'holiday': return 'bg-blue-500';
      default: return 'bg-gray-200';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: CalendarDay[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({
        date: prevDate.toISOString().split('T')[0],
        isToday: false,
        isCurrentMonth: false,
      });
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const log = getDayStatus(currentDate);
      days.push({
        date: currentDate.toISOString().split('T')[0],
        workLog: log,
        isToday: currentDate.toDateString() === new Date().toDateString(),
        isCurrentMonth: true,
      });
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.workLog) {
      setSelectedDayLog(day.workLog);
      setIsDialogOpen(true);
    }
  };

  const days = getDaysInMonth(selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar View</h1>
          <p className="text-muted-foreground">Visual time tracking calendar</p>
        </div>
        
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {monthNames[currentMonth]} {currentYear}
              </CardTitle>
              <CardDescription>
                {selectedEmployee !== 'all'
                  ? `Showing calendar for ${employees.find(e => e.id === selectedEmployee)?.name}`
                  : 'Showing calendar for all employees'
                }
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => (
              <div
                key={index}
                className={`
                  p-2 h-20 border rounded-lg cursor-pointer transition-colors
                  ${day.isCurrentMonth ? 'bg-background hover:bg-muted/50' : 'bg-muted/20'}
                  ${day.isToday ? 'ring-2 ring-primary' : ''}
                `}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex flex-col h-full">
                  <div className={`text-sm ${day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {new Date(day.date).getDate()}
                  </div>
                  {day.workLog && (
                    <div className="flex-1 flex flex-col justify-center items-center">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(day.workLog.status)}`} />
                      <div className="text-xs mt-1">{day.workLog.total_hours}h</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm">Present</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm">Absent</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm">Overtime</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm">Holiday</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Work Log Details</DialogTitle>
            <DialogDescription>
              {selectedDayLog && new Date(selectedDayLog.date).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDayLog && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Employee</h4>
                <p className="text-sm text-muted-foreground">{selectedDayLog.employees?.name}</p>
              </div>
              
              {selectedDayLog.start_time && selectedDayLog.end_time && (
                <div>
                  <h4 className="font-medium">Time</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedDayLog.start_time} - {selectedDayLog.end_time}
                  </p>
                </div>
              )}
              
              <div>
                <h4 className="font-medium">Total Hours</h4>
                <p className="text-sm text-muted-foreground">{selectedDayLog.total_hours} hours</p>
              </div>
              
              <div>
                <h4 className="font-medium">Status</h4>
                <Badge className={`${getStatusColor(selectedDayLog.status)} text-white`}>
                  {selectedDayLog.status}
                </Badge>
              </div>
              
              {selectedDayLog.notes && (
                <div>
                  <h4 className="font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedDayLog.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView;
