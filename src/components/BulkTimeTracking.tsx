import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Calendar, Calculator, DollarSign } from 'lucide-react';
import { useEmployees, useWorkLogs, useAdminLogs } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const BulkTimeTracking = () => {
  const { employees } = useEmployees();
  // Your useWorkLogs hook already provides the 'loading' state, which is perfect.
  const { workLogs, fetchWorkLogs, loading: workLogsLoading } = useWorkLogs();
  const { addAdminLog } = useAdminLogs();
  const { admin } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeHours, setEmployeeHours] = useState({});
  const [salaryStartDate, setSalaryStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryEndDate, setSalaryEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryResults, setSalaryResults] = useState([]);
  const [showSalaryResults, setShowSalaryResults] = useState(false);

  // --- START: CORE FIX FOR DATA LOADING AND EDITING ---

  // Effect 1: Reacts to DATE CHANGE.
  // This effect runs only when `selectedDate` changes. It clears the old
  // form data and triggers a fetch for the new date's data.
  useEffect(() => {
    // Clear out old hours to indicate a loading state.
    setEmployeeHours({});
    fetchWorkLogs({ startDate: selectedDate, endDate: selectedDate });
  }, [selectedDate, fetchWorkLogs]);

  // Effect 2: Populates the form with DATA.
  // This effect runs when data changes. It waits until all necessary data
  // (`employees` and `workLogs`) has arrived before populating the form,
  // preventing the race condition on page load.
  useEffect(() => {
    // We populate only when:
    // 1. We have the list of employees.
    // 2. The form is empty (cleared by Effect 1, ready for new data).
    // 3. The workLogs are NOT currently being fetched. This is the key check.
    if (employees.length > 0 && Object.keys(employeeHours).length === 0 && !workLogsLoading) {
      const newHours = {};
      employees.forEach(emp => {
        const log = workLogs.find(l => l.employee_id === emp.id && l.date === selectedDate);
        if (log) {
          newHours[emp.id] = { hours: log.total_hours, status: log.status };
        } else {
          newHours[emp.id] = { hours: 0, status: 'present' };
        }
      });
      setEmployeeHours(newHours);
    }
  }, [employees, workLogs, employeeHours, selectedDate, workLogsLoading]);

  // --- END: CORE FIX ---

  const updateEmployeeHours = (employeeId, value) => {
    // Allow an empty string for better UX, but treat it as 0 for calculations.
    const hours = value === '' ? '' : parseFloat(value);
    setEmployeeHours(prev => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] || { status: 'present' }), hours }
    }));
  };

  const updateEmployeeStatus = (employeeId, status) => {
    setEmployeeHours(prev => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] || { hours: 0 }), status }
    }));
  };

  const handleSaveAll = async () => {
    try {
      const changedEntries = Object.entries(employeeHours).filter(([empId, data]) => {
        const originalLog = workLogs.find(l => l.employee_id === empId && l.date === selectedDate);
        const currentHours = typeof data.hours === 'number' ? data.hours : 0;
        
        if (originalLog) {
          return originalLog.total_hours !== currentHours || originalLog.status !== data.status;
        }
        // If no original log, save if hours are entered or status is changed from default.
        return currentHours > 0 || data.status !== 'present';
      });

      if (changedEntries.length === 0) {
        toast({
          title: "No Changes",
          description: "No hours or status changes to save.",
        });
        return;
      }

      let updatedCount = 0;
      let insertedCount = 0;

      for (const [employeeId, data] of changedEntries) {
        const existingLog = workLogs.find(log => log.employee_id === employeeId && log.date === selectedDate);
        const logData = {
          employee_id: employeeId,
          date: selectedDate,
          total_hours: (typeof data.hours === 'number' ? data.hours : 0),
          status: data.status || 'present',
          created_by: admin?.id || 'admin'
        };

        if (existingLog) {
          const { error } = await supabase.from('work_logs').update(logData).eq('id', existingLog.id);
          if (error) throw error;
          updatedCount++;
        } else {
          const { error } = await supabase.from('work_logs').insert([logData]);
          if (error) throw error;
          insertedCount++;
        }
      }

      await addAdminLog(
        'BULK_TIME_TRACKING',
        `Updated ${updatedCount} and added ${insertedCount} time logs for ${selectedDate}`,
        admin?.id || 'admin'
      );

      toast({
        title: "Time Logs Saved",
        description: `Updated ${updatedCount} and added ${insertedCount} time logs.`,
      });
      
      // Refetch to keep local state consistent after saving.
      fetchWorkLogs({ startDate: selectedDate, endDate: selectedDate });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save time logs: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleCalculateSalary = async () => {
    try {
      if (!salaryStartDate || !salaryEndDate) {
        toast({ title: "Missing Dates", description: "Please select both start and end dates.", variant: "destructive" });
        return;
      }

      if (new Date(salaryStartDate) > new Date(salaryEndDate)) {
        toast({ title: "Invalid Date Range", description: "Start date must be before or equal to end date.", variant: "destructive" });
        return;
      }

      const { data: workLogsForSalary, error } = await supabase
        .from('work_logs')
        .select('*, employees (id, name, salary_per_hour)')
        .gte('date', salaryStartDate)
        .lte('date', salaryEndDate)
        .eq('status', 'present');

      if (error) throw error;

      const employeeTotals = workLogsForSalary?.reduce((acc, log) => {
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

      const calculations = Object.values(employeeTotals || {}).map(emp => ({ ...emp, total_salary: emp.total_hours * emp.hourly_rate }));

      setSalaryResults(calculations);
      setShowSalaryResults(true);

      toast({
        title: "Salary Calculated",
        description: `Calculated salary for ${calculations.length} employees from ${formatDate(salaryStartDate)} to ${formatDate(salaryEndDate)}.`,
      });
    } catch (error) {
      toast({ title: "Error", description: `Failed to calculate salary: ${error.message}`, variant: "destructive" });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isFormLoading = Object.keys(employeeHours).length === 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Bulk Time Tracking</h1>
          <p className="text-lg text-muted-foreground">Log hours for all employees at once</p>
        </div>
        
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl"><Calendar className="w-6 h-6" />Select Date</CardTitle>
            <div className="flex gap-6 items-center flex-wrap">
              <div className="flex items-center gap-3">
                <Label htmlFor="date" className="text-base font-medium">Date:</Label>
                <Input id="date" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto min-w-48 text-base"/>
              </div>
              <Button onClick={handleSaveAll} size="lg" className="ml-auto" disabled={isFormLoading}>
                <Save className="w-5 h-5 mr-2" />Save All
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl"><DollarSign className="w-6 h-6" />Salary Calculation</CardTitle>
            <div className="flex gap-6 items-center flex-wrap">
              <div className="flex items-center gap-3">
                <Label htmlFor="salary-start-date" className="text-base font-medium">From:</Label>
                <Input id="salary-start-date" type="date" value={salaryStartDate} onChange={e => setSalaryStartDate(e.target.value)} className="w-auto min-w-48 text-base"/>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="salary-end-date" className="text-base font-medium">To:</Label>
                <Input id="salary-end-date" type="date" value={salaryEndDate} onChange={e => setSalaryEndDate(e.target.value)} className="w-auto min-w-48 text-base"/>
              </div>
              <Button onClick={handleCalculateSalary} variant="outline" size="lg"><Calculator className="w-5 h-5 mr-2" />Calculate Salary</Button>
            </div>
          </CardHeader>
        </Card>

        {showSalaryResults && salaryResults.length > 0 && (
          <Card className="border-4 border-green-300 bg-green-50/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-green-800 text-2xl">💰 Salary Calculation Results</CardTitle>
              <p className="text-muted-foreground text-lg">Period: <strong>{formatDate(salaryStartDate)}</strong> to <strong>{formatDate(salaryEndDate)}</strong></p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Employee Name</TableHead><TableHead>Total Hours</TableHead><TableHead>Hourly Rate</TableHead><TableHead>Total Salary</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {salaryResults.map((result, index) => (
                      <TableRow key={index} className="hover:bg-green-100/50">
                        <TableCell className="font-medium">{result.employee_name}</TableCell>
                        <TableCell className="text-center">{result.total_hours} hours</TableCell>
                        <TableCell className="text-center">₹{result.hourly_rate}</TableCell>
                        <TableCell className="font-bold text-green-700 text-lg">₹{result.total_salary.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-8 p-6 bg-green-100 border-2 border-green-400 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-semibold text-green-800">Grand Total Amount:</span>
                    <span className="text-3xl font-bold text-green-800">₹{salaryResults.reduce((sum, r) => sum + r.total_salary, 0).toFixed(2)}</span>
                  </div>
                  <div className="text-base text-green-600 mt-3">Total employees: {salaryResults.length} | Total hours: {salaryResults.reduce((sum, r) => sum + r.total_hours, 0)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-2">
          <CardHeader className="pb-4"><CardTitle className="text-xl">Employee Hours for {formatDate(selectedDate)}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Hours</TableHead><TableHead>Status</TableHead><TableHead>Hourly Rate</TableHead><TableHead>Total Pay</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employees.map(employee => {
                    const hours = employeeHours[employee.id]?.hours ?? '';
                    const status = employeeHours[employee.id]?.status || 'present';
                    const totalPay = (typeof hours === 'number' ? hours : 0) * (employee.salary_per_hour || 0);
                    return (
                      <TableRow key={employee.id} className="hover:bg-accent/50">
                        <TableCell className="font-medium text-base">{employee.name}</TableCell>
                        <TableCell><Input type="number" step="0.5" min="0" max="24" value={hours} onChange={e => updateEmployeeHours(employee.id, e.target.value)} className="w-24 text-base" disabled={isFormLoading} /></TableCell>
                        <TableCell>
                          <Select value={status} onValueChange={value => updateEmployeeStatus(employee.id, value)} disabled={isFormLoading}>
                            <SelectTrigger className="w-36 text-base"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem><SelectItem value="absent">Absent</SelectItem><SelectItem value="overtime">Overtime</SelectItem><SelectItem value="holiday">Holiday</SelectItem>
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
