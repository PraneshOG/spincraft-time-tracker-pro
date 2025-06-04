
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, Calendar, TrendingUp } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Employee, WorkLog } from '@/types';

const Dashboard = () => {
  const [employees] = useLocalStorage<Employee[]>('spincraft_employees', []);
  const [workLogs] = useLocalStorage<WorkLog[]>('spincraft_worklogs', []);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const stats = {
    totalEmployees: employees.filter(emp => emp.isActive).length,
    presentToday: workLogs.filter(log => log.date === today && log.status === 'present').length,
    totalHoursThisMonth: workLogs
      .filter(log => log.date.startsWith(thisMonth))
      .reduce((sum, log) => sum + log.totalHours, 0),
    overtimeHours: workLogs
      .filter(log => log.date.startsWith(thisMonth) && log.status === 'overtime')
      .reduce((sum, log) => sum + Math.max(0, log.totalHours - 8), 0),
  };

  const statCards = [
    {
      title: "Total Employees",
      value: stats.totalEmployees,
      description: "Active employees",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Present Today",
      value: stats.presentToday,
      description: "Employees working today",
      icon: Clock,
      color: "text-green-600",
    },
    {
      title: "Hours This Month",
      value: Math.round(stats.totalHoursThisMonth),
      description: "Total hours logged",
      icon: Calendar,
      color: "text-purple-600",
    },
    {
      title: "Overtime Hours",
      value: Math.round(stats.overtimeHours),
      description: "Extra hours this month",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Spincraft Time Tracker Pro
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest employee time logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workLogs
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((log) => {
                  const employee = employees.find(emp => emp.id === log.employeeId);
                  return (
                    <div key={log.id} className="flex items-center space-x-4">
                      <div className={`w-2 h-2 rounded-full ${
                        log.status === 'present' ? 'bg-green-500' :
                        log.status === 'overtime' ? 'bg-orange-500' :
                        log.status === 'absent' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{employee?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.date} - {log.totalHours}h ({log.status})
                        </p>
                      </div>
                    </div>
                  );
                })}
              {workLogs.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <p className="font-medium">Add New Employee</p>
                <p className="text-sm text-muted-foreground">Register a new team member</p>
              </div>
              <div className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <p className="font-medium">Log Work Hours</p>
                <p className="text-sm text-muted-foreground">Record today's attendance</p>
              </div>
              <div className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <p className="font-medium">Generate Report</p>
                <p className="text-sm text-muted-foreground">Export time tracking data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
