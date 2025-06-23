import { useState, useEffect } from 'react';
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
  const { workLogs, fetchWorkLogs } = useWorkLogs();
  const { addAdminLog } = useAdminLogs();
  const { admin } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeHours, setEmployeeHours] = useState({});
  const [salaryStartDate, setSalaryStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryEndDate, setSalaryEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryResults, setSalaryResults] = useState([]);
  const [showSalaryResults, setShowSalaryResults] = useState(false);

  useEffect(() => {
    fetchWorkLogs({ startDate: selectedDate, endDate: selectedDate });
  }, [selectedDate, fetchWorkLogs]);

  useEffect(() => {
    if (!employees.length) return;
    const newHours = {};
    employees.forEach(emp => {
      const log = workLogs.find(l => l.employee_id === emp.id && l.date === selectedDate);
      newHours[emp.id] = {
        hours: log?.total_hours || 0,
        status: log?.status || 'present'
      };
    });
    setEmployeeHours(newHours);
  }, [employees, selectedDate, workLogs]);

  const updateEmployeeHours = (employeeId, hours) => {
    setEmployeeHours(prev => ({
      ...prev,
      [employeeId]: {
        hours,
        status: prev[employeeId]?.status || 'present'
      }
    }));
  };

  const updateEmployeeStatus = (employeeId, status) => {
    setEmployeeHours(prev => ({
      ...prev,
      [employeeId]: {
        hours: prev[employeeId]?.hours || 0,
        status
      }
    }));
  };

  const saveAll = async () => {
    const updates = employees.map(async emp => {
      const log = employeeHours[emp.id];
      if (!log || log.hours === '') return null;
      const { error } = await supabase.from('work_logs').upsert({
        employee_id: emp.id,
        date: selectedDate,
        total_hours: parseFloat(log.hours),
        status: log.status,
        created_by: admin?.id || 'system'
      });
      if (error) {
        toast({ title: `Failed to save for ${emp.name}`, description: error.message });
      }
      return null;
    });
    await Promise.all(updates);
    toast({ title: 'Saved successfully!' });
    addAdminLog(`Saved time tracking for ${selectedDate}`);
    fetchWorkLogs({ startDate: selectedDate, endDate: selectedDate });
  };

  const calculateSalaries = async () => {
    const { data, error } = await useSalaryCalculations(salaryStartDate, salaryEndDate);
    if (error) {
      toast({ title: 'Error calculating salaries', description: error.message });
      return;
    }
    setSalaryResults(data);
    setShowSalaryResults(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar size={18} /> Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Save size={18} /> Log Work Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.name}</TableCell>
                  <TableCell>
                    <Select value={employeeHours[emp.id]?.status} onValueChange={value => updateEmployeeStatus(emp.id, value)}>
                      <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="leave">Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={employeeHours[emp.id]?.hours || ''}
                      onChange={e => updateEmployeeHours(emp.id, e.target.value)}
                      placeholder="Hours"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button className="mt-4" onClick={saveAll}>Save All</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator size={18} /> Calculate Salary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={salaryStartDate} onChange={e => setSalaryStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={salaryEndDate} onChange={e => setSalaryEndDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={calculateSalaries}><DollarSign size={16} className="mr-2" /> Calculate</Button>
          {showSalaryResults && (
            <div>
              <h3 className="font-semibold mt-4">Salary Results</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Salary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryResults.map(result => (
                    <TableRow key={result.employee_id}>
                      <TableCell>{result.employee_name}</TableCell>
                      <TableCell>{result.total_hours}</TableCell>
                      <TableCell>{result.hourly_rate}</TableCell>
                      <TableCell>₹{result.total_salary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkTimeTracking;
