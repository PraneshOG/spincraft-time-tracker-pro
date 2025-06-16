import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Calendar, Calculator, DollarSign } from 'lucide-react';
import { useEmployees, useWorkLogs, useAdminLogs, useSalaryCalculations } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
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
  const [salaryStartDate, setSalaryStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryEndDate, setSalaryEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryResults, setSalaryResults] = useState<any[]>([]);
  const [showSalaryResults, setShowSalaryResults] = useState(false);

  const [isEditable, setIsEditable] = useState(false);

  // Ref to prevent reinitializing employeeHours when editing is enabled
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isEditable) {
      // Only sync employeeHours from fetched workLogs when NOT editing
      const updatedHours: Record<string, { hours: number; status: 'present' | 'absent' | 'overtime' | 'holiday' }> = {};
      employees.forEach(emp => {
        const existingLog = workLogs.find(log => log.employee_id === emp.id && log.date === selectedDate);
        if (existingLog) {
          updatedHours[emp.id] = {
            hours: existingLog.total_hours,
            status: existingLog.status as 'present' | 'absent' | 'overtime' | 'holiday'
          };
        } else {
          updatedHours[emp.id] = { hours: 0, status: 'present' };
        }
      });
      setEmployeeHours(updatedHours);
      initializedRef.current = false; // reset to allow init next edit session
    }
  }, [workLogs, selectedDate, employees, isEditable]);

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

  // Called when toggling editing mode
  const onToggleEdit = () => {
    if (!isEditable && !initializedRef.current) {
      // On enabling edit, initialize if employeeHours empty
      if (Object.keys(employeeHours).length === 0) {
        const initialHours: Record<string, { hours: number; status: 'present' | 'absent' | 'overtime' | 'holiday' }> = {};
        employees.forEach(emp => {
          const existingLog = workLogs.find(log => log.employee_id === emp.id && log.date === selectedDate);
          if (existingLog) {
            initialHours[emp.id] = {
              hours: existingLog.total_hours,
              status: existingLog.status as 'present' | 'absent' | 'overtime' | 'holiday'
            };
          } else {
            initialHours[emp.id] = { hours: 0, status: 'present' };
          }
        });
        setEmployeeHours(initialHours);
      }
      initializedRef.current = true;
    }
    setIsEditable(!isEditable);
  };

  const handleSaveAll = async () => {
    try {
      const existingLogsMap = new Map<string, { total_hours: number; status: string }>();
      workLogs.forEach(log => {
        existingLogsMap.set(log.employee_id, { total_hours: log.total_hours, status: log.status });
      });

      const workLogsToSave = employees.reduce((acc, emp) => {
        const edited = employeeHours[emp.id];
        if (!edited) return acc;

        const existing = existingLogsMap.get(emp.id);
        const hoursChanged = !existing || existing.total_hours !== edited.hours;
        const statusChanged = !existing || existing.status !== edited.status;

        if ((hoursChanged || statusChanged) && (edited.hours > 0 || edited.status !== 'present')) {
          acc.push({
            employee_id: emp.id,
            date: selectedDate,
            total_hours: edited.hours,
            status: edited.status,
            created_by: admin?.id || 'admin'
          });
        }
        return acc;
      }, [] as Array<{ employee_id: string; date: string; total_hours: number; status: string; created_by: string }>);

      if (workLogsToSave.length === 0) {
        toast({
          title: "No Changes",
          description: "No updated hours or status to save.",
        });
        return;
      }

      await addBulkWorkLogs(workLogsToSave);
      await addAdminLog('BULK_TIME_TRACKING', `Added/Updated time logs for ${workLogsToSave.length} employees on ${selectedDate}`, admin?.id || 'admin');

      toast({
        title: "Time Logs Saved",
        description: `Successfully saved time logs for ${workLogsToSave.length} employees.`,
      });
      setIsEditable(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save time logs",
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Bulk Time Tracking</h1>
          <p className="text-lg text-muted-foreground">Log hours for all employees at once</p>
        </div>

        <Card className="border-2">
          <CardHeader className="pb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <Label htmlFor="date" className="text-base font-medium">Date:</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto min-w-48 text-base"
                disabled={!isEditable}
              />
            </div>
            <Button onClick={onToggleEdit} variant={isEditable ? 'outline' : 'default'} size="lg" className="ml-auto">
              {isEditable ? 'Disable Editing' : 'Change Values'}
            </Button>
            <Button onClick={handleSaveAll} size="lg" disabled={!isEditable}>
              <Save className="w-5 h-5 mr-2" />
              Save All
            </Button>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Employee Hours for {formatDate(selectedDate)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-base">Employee</TableHead>
                    <TableHead className="font-bold text-base">Hours</TableHead>
                    <TableHead className="font-bold text-base">Status</TableHead>
                    <TableHead className="font-bold text-base">Hourly Rate</TableHead>
                    <TableHead className="font-bold text-base">Total Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(employee => {
                    const hours = employeeHours[employee.id]?.hours || 0;
                    const status = employeeHours[employee.id]?.status || 'present';
                    const totalPay = hours * (employee.salary_per_hour || 0);

                    return (
                      <TableRow key={employee.id} className="hover:bg-accent/50">
                        <TableCell className="font-medium text-base">{employee.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={hours}
                            onChange={e => {
                              if (!isEditable) return;
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0 && val <= 24) {
                                updateEmployeeHours(employee.id, val);
                              }
                            }}
                            className="w-24 text-base"
                            disabled={!isEditable}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={status}
                            onValueChange={value => {
                              if (!isEditable) return;
                              updateEmployeeStatus(employee.id, value as any);
                            }}
                            disabled={!isEditable}
                          >
                            <SelectTrigger className="w-36 text-base">
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
                        <TableCell className="text-base">₹{employee.salary_per_hour}</TableCell>
                        <TableCell className="font-semibold text-base">₹{totalPay.toFixed(2)}</TableCell>
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
