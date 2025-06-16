import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  
  // New state for salary calculation date range
  const [salaryStartDate, setSalaryStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryEndDate, setSalaryEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryResults, setSalaryResults] = useState<any[]>([]);
  const [showSalaryResults, setShowSalaryResults] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!salaryStartDate || !salaryEndDate) {
        toast({
          title: "Missing Dates",
          description: "Please select both start and end dates for salary calculation.",
          variant: "destructive",
        });
        return;
      }

      if (new Date(salaryStartDate) > new Date(salaryEndDate)) {
        toast({
          title: "Invalid Date Range",
          description: "Start date must be before or equal to end date.",
          variant: "destructive",
        });
        return;
      }

      // Fetch work logs for the selected period
      const { data: workLogsData, error } = await supabase
        .from('work_logs')
        .select(`
          *,
          employees (
            id,
            name,
            salary_per_hour
          )
        `)
        .gte('date', salaryStartDate)
        .lte('date', salaryEndDate)
        .eq('status', 'present');

      if (error) throw error;

      // Group by employee and calculate totals
      const employeeTotals = workLogsData?.reduce((acc: any, log: any) => {
        const empId = log.employee_id;
        if (!acc[empId]) {
          acc[empId] = {
            employee_id: empId,
            employee_name: log.employees?.name || 'Unknown',
            total_hours: 0,
            hourly_rate: log.employees?.salary_per_hour || 0
          };
        }
        acc[empId].total_hours += log.total_hours;
        return acc;
      }, {});

      // Create salary calculation results
      const calculations = Object.values(employeeTotals || {}).map((emp: any) => ({
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        total_hours: emp.total_hours,
        hourly_rate: emp.hourly_rate,
        total_salary: emp.total_hours * emp.hourly_rate
      }));

      setSalaryResults(calculations);
      setShowSalaryResults(true);
      
      toast({
        title: "Salary Calculated",
        description: `Calculated salary for ${calculations.length} employees from ${formatDate(salaryStartDate)} to ${formatDate(salaryEndDate)}.`,
      });
    } catch (error) {
      console.error('Error calculating salary:', error);
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
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Bulk Time Tracking</h1>
          <p className="text-lg text-muted-foreground">Log hours for all employees at once</p>
        </div>
        
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Calendar className="w-6 h-6" />
              Select Date
            </CardTitle>
            <div className="flex gap-6 items-center flex-wrap">
              <div className="flex items-center gap-3">
                <Label htmlFor="date" className="text-base font-medium">Date:</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto min-w-48 text-base"
                />
              </div>
              <Button onClick={handleSaveAll} size="lg" className="ml-auto">
                <Save className="w-5 h-5 mr-2" />
                Save All
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <DollarSign className="w-6 h-6" />
              Salary Calculation
            </CardTitle>
            <div className="flex gap-6 items-center flex-wrap">
              <div className="flex items-center gap-3">
                <Label htmlFor="salary-start-date" className="text-base font-medium">From:</Label>
                <Input
                  id="salary-start-date"
                  type="date"
                  value={salaryStartDate}
                  onChange={(e) => setSalaryStartDate(e.target.value)}
                  className="w-auto min-w-48 text-base"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="salary-end-date" className="text-base font-medium">To:</Label>
                <Input
                  id="salary-end-date"
                  type="date"
                  value={salaryEndDate}
                  onChange={(e) => setSalaryEndDate(e.target.value)}
                  className="w-auto min-w-48 text-base"
                />
              </div>
              <Button onClick={handleCalculateSalary} variant="outline" size="lg">
                <Calculator className="w-5 h-5 mr-2" />
                Calculate Salary
              </Button>
            </div>
          </CardHeader>
        </Card>

        {showSalaryResults && salaryResults.length > 0 && (
          <Card className="border-4 border-green-300 bg-green-50/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-green-800 text-2xl">Salary Calculation Results</CardTitle>
              <p className="text-muted-foreground text-lg">
                Period: <strong>{formatDate(salaryStartDate)}</strong> to <strong>{formatDate(salaryEndDate)}</strong>
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-base">Employee Name</TableHead>
                      <TableHead className="font-bold text-base">Total Hours</TableHead>
                      <TableHead className="font-bold text-base">Hourly Rate</TableHead>
                      <TableHead className="font-bold text-base">Total Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryResults.map((result, index) => (
                      <TableRow key={index} className="hover:bg-green-100/50">
                        <TableCell className="font-medium text-base">{result.employee_name}</TableCell>
                        <TableCell className="text-center text-base">{result.total_hours} hours</TableCell>
                        <TableCell className="text-center text-base">₹{result.hourly_rate}</TableCell>
                        <TableCell className="font-bold text-green-700 text-lg">₹{result.total_salary.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-8 p-6 bg-green-100 border-2 border-green-400 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-semibold text-green-800">Grand Total Amount:</span>
                    <span className="text-3xl font-bold text-green-800">
                      ₹{salaryResults.reduce((sum, result) => sum + result.total_salary, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-base text-green-600 mt-3">
                    Total employees: {salaryResults.length} | Total hours: {salaryResults.reduce((sum, result) => sum + result.total_hours, 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  {employees.map((employee) => {
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
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0 && val <= 24) {
                                updateEmployeeHours(employee.id, val);
                              }
                            }}
                            className="w-24 text-base"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={status}
                            onValueChange={(value: any) => updateEmployeeStatus(employee.id, value)}
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

