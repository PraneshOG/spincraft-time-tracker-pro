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
  const { calculateSalaries } = useSalaryCalculations();
  const { admin } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeHours, setEmployeeHours] = useState({});
  const [salaryStartDate, setSalaryStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryEndDate, setSalaryEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryResults, setSalaryResults] = useState([]);
  const [showSalaryResults, setShowSalaryResults] = useState(false);

  useEffect(() => {
    fetchWorkLogs({ startDate: selectedDate, endDate: selectedDate });
  }, [selectedDate]);

  useEffect(() => {
    if (!employees.length) return;
    const newHours = {};
    employees.forEach(emp => {
      const log = workLogs.find(l => l.employee_id === emp.id && l.date === selectedDate);
      newHours[emp.id] = {
        hours: log?.total_hours || '',
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
    const updates = await Promise.all(
      employees.map(async emp => {
        const { hours, status } = employeeHours[emp.id] || {};
        if (hours === '') return null;
        const { error } = await supabase
          .from('work_logs')
          .upsert({
            employee_id: emp.id,
            date: selectedDate,
            total_hours: parseFloat(hours),
            status
          });

        if (error) {
          toast({
            title: 'Error saving data',
            description: `Failed to save for ${emp.name}: ${error.message}`,
            variant: 'destructive'
          });
          return error;
        }

        return null;
      })
    );

    const anyError = updates.some(error => error !== null);

    if (!anyError) {
      await addAdminLog({
        action: `Updated hours for ${selectedDate}`,
        admin_id: admin?.id || 'unknown'
      });

      toast({
        title: 'Saved!',
        description: 'All work logs updated.'
      });
    }
  };

  const calculateSalary = async () => {
    const { data, error } = await calculateSalaries({
      startDate: salaryStartDate,
      endDate: salaryEndDate
    });
    if (!error) {
      setSalaryResults(data);
      setShowSalaryResults(true);
    } else {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Log Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={employeeHours[emp.id]?.hours || ''}
                      onChange={e => updateEmployeeHours(emp.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={employeeHours[emp.id]?.status || 'present'}
                      onValueChange={value => updateEmployeeStatus(emp.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="leave">Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={saveAll} className="mt-4">
            <Save className="mr-2 h-4 w-4" /> Save All
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" /> Calculate Salary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col w-full">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={salaryStartDate}
                onChange={e => setSalaryStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col w-full">
              <Label>End Date</Label>
              <Input
                type="date"
                value={salaryEndDate}
                onChange={e => setSalaryEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={calculateSalary}>
            <DollarSign className="mr-2 h-4 w-4" /> Calculate
          </Button>

          {showSalaryResults && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Salary Results</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Salary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryResults.map(result => (
                    <TableRow key={result.employee_id}>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>{result.total_hours}</TableCell>
                      <TableCell>₹{result.salary}</TableCell>
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
