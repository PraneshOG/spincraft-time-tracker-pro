import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Calendar, Calculator } from 'lucide-react';
import { useEmployees, useWorkLogs, useAdminLogs, useSalaryCalculations } from '@/hooks/useSupabaseData';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const BulkTimeTracking = () => {
  const { employees } = useEmployees();
  const { addBulkWorkLogs, workLogs, fetchWorkLogs } = useWorkLogs();
  const { addAdminLog } = useAdminLogs();
  const { calculateSalaryForPeriod } = useSalaryCalculations();
  const { admin } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeHours, setEmployeeHours] = useState<Record<string, { hours: number; status: 'present' | 'absent' | 'overtime' | 'holiday' }>>({});

  useEffect(() => {
    // Initialize employee hours state
    const initialHours: Record<string, { hours: number; status: 'present' | 'absent' | 'overtime' | 'holiday' }> = {};
    employees.forEach(emp => {
      initialHours[emp.id] = { hours: 0, status: 'present' };
    });
    setEmployeeHours(initialHours);
  }, [employees]);

  useEffect(() => {
    // Fetch existing work logs for the selected date
    fetchWorkLogs({ startDate: selectedDate, endDate: selectedDate });
  }, [selectedDate, fetchWorkLogs]);

  useEffect(() => {
    // Update employee hours based on existing work logs
    const updatedHours = { ...employeeHours };
    employees.forEach(emp => {
      const existingLog = workLogs.find(log => log.employee_id === emp.id && log.date === selectedDate);
      if (existingLog) {
        updatedHours[emp.id] = {
          hours: existingLog.total_hours,
          status: existingLog.status as 'present' | 'absent' | 'overtime' | 'holiday'
        };
      } else if (!updatedHours[emp.id]) {
        updatedHours[emp.id] = { hours: 0, status: 'present' };
      }
    });
    setEmployeeHours(updatedHours);
  }, [workLogs, selectedDate, employees]);

  const updateEmployeeHours = (employeeId: string, hours: number) => {
    setEmployeeHours(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], hours }
    }));
  };

  const updateEmployeeStatus = (employeeId: string, status: 'present' | 'absent' | 'overtime' | 'holiday') => {
    setEmployeeHours(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], status }
    }));
  };

  const handleSaveAll = async () => {
    try {
      const workLogsToSave = employees
        .filter(emp => employeeHours[emp.id]?.hours > 0 || employeeHours[emp.id]?.status !== 'present')
        .map(emp => ({
          employee_id: emp.id,
          date: selectedDate,
          total_hours: employeeHours[emp.id]?.hours || 0,
          status: employeeHours[emp.id]?.status || 'present',
          created_by: admin?.id || 'admin'
        }));

      if (workLogsToSave.length === 0) {
        toast({
          title: "No Changes",
          description: "No hours or status changes to save.",
        });
        return;
      }

      await addBulkWorkLogs(workLogsToSave);
      await addAdminLog('BULK_TIME_TRACKING', `Added time logs for ${workLogsToSave.length} employees on ${selectedDate}`, admin?.id || 'admin');
      
      toast({
        title: "Time Logs Saved",
        description: `Successfully saved time logs for ${workLogsToSave.length} employees.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save time logs",
        variant: "destructive",
      });
    }
  };

  const handleCalculateSalary = async () => {
    try {
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      const startDate = new Date(today.getTime() - (15 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      
      const calculations = await calculateSalaryForPeriod(startDate, endDate);
      
      toast({
        title: "Salary Calculated",
        description: `Calculated salary for ${calculations.length} employees for the last 15 days.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to calculate salary",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'overtime': return 'bg-orange-500';
      case 'holiday': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bulk Time Tracking</h1>
          <p className="text-muted-foreground">Log hours for all employees at once</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Date
            </CardTitle>
            <div className="flex gap-4 items-center">
              <Label htmlFor="date">Date:</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button onClick={handleSaveAll} className="ml-auto">
                <Save className="w-4 h-4 mr-2" />
                Save All
              </Button>
              <Button onClick={handleCalculateSalary} variant="outline">
                <Calculator className="w-4 h-4 mr-2" />
                Calculate 15-Day Salary
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Hours for {formatDate(selectedDate)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead>Total Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const hours = employeeHours[employee.id]?.hours || 0;
                    const status = employeeHours[employee.id]?.status || 'present';
                    const totalPay = hours * (employee.salary_per_hour || 0);
                    
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={hours}
                            onChange={(e) => updateEmployeeHours(employee.id, parseFloat(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={status}
                            onValueChange={(value: any) => updateEmployeeStatus(employee.id, value)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="overtime">Overtime</SelectItem>
                              <SelectItem value="holiday">Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>₹{employee.salary_per_hour}</TableCell>
                        <TableCell className="font-semibold">₹{totalPay.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BulkTimeTracking;
