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
    const { workLogs, fetchWorkLogs } = useWorkLogs();
    const { addAdminLog } = useAdminLogs();
    const { admin } = useAuth();

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [employeeHours, setEmployeeHours] = useState({});
    const [salaryStartDate, setSalaryStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [salaryEndDate, setSalaryEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [salaryResults, setSalaryResults] = useState([]);
    const [showSalaryResults, setShowSalaryResults] = useState(false);

    const [loading, setLoading] = useState(false);  // Added loading state


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); // Start loading
            await fetchWorkLogs({ startDate: selectedDate, endDate: selectedDate });
            setLoading(false); // Stop loading
        };

        fetchData();
    }, [selectedDate, fetchWorkLogs]);

    useEffect(() => {
        if (!employees.length) return;

        const initialEmployeeHours = {};
        employees.forEach(employee => {
            const workLog = workLogs.find(
                log => log.employee_id === employee.id && log.date === selectedDate
            );

            if (workLog) {
                initialEmployeeHours[employee.id] = {
                    hours: workLog.total_hours,
                    status: workLog.status
                };
            } else {
                initialEmployeeHours[employee.id] = {
                    hours: '',
                    status: 'present'
                };
            }
        });

        setEmployeeHours(initialEmployeeHours);

    }, [employees, selectedDate, workLogs]);


    const updateEmployeeHours = (employeeId, hours) => {
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
            const updates = Object.entries(employeeHours)
                .filter(([employeeId, data]) => {
                    const originalLog = workLogs.find(
                        log => log.employee_id === employeeId && log.date === selectedDate
                    );

                    if (!originalLog && data.hours === '' && data.status === 'present') {
                        return false; // Skip if no log exists and no data has been entered.
                    }
                    if (originalLog) {
                        return (
                            originalLog.total_hours !== data.hours || originalLog.status !== data.status
                        );
                    } else {
                        return data.hours !== '' || data.status !== 'present';
                    }
                })
                .map(([employeeId, data]) => ({
                    employee_id: employeeId,
                    date: selectedDate,
                    total_hours: data.hours === '' ? 0 : data.hours,
                    status: data.status,
                }));

            if (updates.length === 0) {
                toast({ title: 'No changes to save.' });
                return;
            }

            let insertedCount = 0;
            let updatedCount = 0;

            for (const update of updates) {
                const existingLog = workLogs.find(
                    log => log.employee_id === update.employee_id && log.date === selectedDate
                );

                if (existingLog) {
                    const { error } = await supabase
                        .from('work_logs')
                        .update({
                            total_hours: update.total_hours,
                            status: update.status,
                            created_by: admin?.id || 'admin',
                        })
                        .eq('id', existingLog.id);

                    if (error) {
                        console.error('Error updating work log:', error);
                        throw new Error(`Failed to update work log: ${error.message}`);
                    }
                    updatedCount++;
                } else {
                    const { error } = await supabase.from('work_logs').insert([
                        {
                            employee_id: update.employee_id,
                            date: update.date,
                            total_hours: update.total_hours,
                            status: update.status,
                            created_by: admin?.id || 'admin',
                        },
                    ]);

                    if (error) {
                        console.error('Error inserting work log:', error);
                        throw new Error(`Failed to insert work log: ${error.message}`);
                    }
                    insertedCount++;
                }
            }

            await addAdminLog(
                'BULK_TIME_TRACKING',
                `Updated ${updatedCount} and inserted ${insertedCount} time logs for ${selectedDate}`,
                admin?.id || 'admin'
            );

            toast({
                title: 'Success',
                description: `Updated ${updatedCount} and inserted ${insertedCount} work logs.`,
            });

            await fetchWorkLogs({ startDate: selectedDate, endDate: selectedDate }); // Refresh data
        } catch (error) {
            console.error('Error saving work logs:', error);
            toast({
                title: 'Error',
                description: `Failed to save work logs: ${error.message}`,
                variant: 'destructive',
            });
        }
    };

    const handleCalculateSalary = async () => {
        if (!salaryStartDate || !salaryEndDate) {
            toast({ title: 'Error', description: 'Please select both start and end dates.' });
            return;
        }

        if (new Date(salaryStartDate) > new Date(salaryEndDate)) {
            toast({ title: 'Error', description: 'Start date must be before or equal to end date.' });
            return;
        }

        try {
            const { data: workLogsForSalary, error } = await supabase
                .from('work_logs')
                .select(
                    `
            *,
            employees (
              id,
              name,
              salary_per_hour
            )
          `
                )
                .gte('date', salaryStartDate)
                .lte('date', salaryEndDate);

            if (error) {
                console.error('Error fetching work logs for salary calculation:', error);
                toast({ title: 'Error', description: 'Failed to fetch work logs.' });
                return;
            }

            if (!workLogsForSalary || workLogsForSalary.length === 0) {
                toast({ title: 'No data', description: 'No work logs found for the selected period.' });
                setSalaryResults([]);
                setShowSalaryResults(true);
                return;
            }

            const employeeTotals = workLogsForSalary.reduce((acc, log) => {
                if (log.employees === null) {
                    console.warn(`Employee data is missing for log ID: ${log.id}. Skipping.`);
                    return acc;
                }

                const employeeId = log.employee_id;
                if (!acc[employeeId]) {
                    acc[employeeId] = {
                        employee_id: employeeId,
                        employee_name: log.employees.name,
                        total_hours: 0,
                        salary_per_hour: log.employees.salary_per_hour,
                    };
                }
                acc[employeeId].total_hours += log.total_hours;
                return acc;
            }, {});

            const calculations = Object.values(employeeTotals).map((employee) => ({
                employee_id: employee.employee_id,
                employee_name: employee.employee_name,
                total_hours: employee.total_hours,
                salary_per_hour: employee.salary_per_hour,
                total_salary: employee.total_hours * employee.salary_per_hour,
            }));

            setSalaryResults(calculations);
            setShowSalaryResults(true);

            toast({
                title: 'Salary Calculated',
                description: `Calculated salary for ${calculations.length} employees from ${formatDate(
                    salaryStartDate
                )} to ${formatDate(salaryEndDate)}.`,
            });
        } catch (error) {
            console.error('Error calculating salary:', error);
            toast({ title: 'Error', description: 'Failed to calculate salary.' });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
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
                            <CardTitle className="text-green-800 text-2xl">
                                💰 Salary Calculation Results
                            </CardTitle>
                            <p className="text-muted-foreground text-lg">
                                Period: <strong>{formatDate(salaryStartDate)}</strong> to{' '}
                                <strong>{formatDate(salaryEndDate)}</strong>
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
                                                <TableCell className="text-center text-base">
                                                    {result.total_hours} hours
                                                </TableCell>
                                                <TableCell className="text-center text-base">
                                                    ₹{result.salary_per_hour}
                                                </TableCell>
                                                <TableCell className="font-bold text-green-700 text-lg">
                                                    ₹{result.total_salary.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="mt-8 p-6 bg-green-100 border-2 border-green-400 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xl font-semibold text-green-800">
                                            Grand Total Amount:
                                        </span>
                                        <span className="text-3xl font-bold text-green-800">
                                            ₹{salaryResults
                                                .reduce((sum, result) => sum + result.total_salary, 0)
                                                .toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="text-base text-green-600 mt-3">
                                        Total employees: {salaryResults.length} | Total hours:{' '}
                                        {salaryResults.reduce((sum, result) => sum + result.total_hours, 0)}
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
                        {loading ? (
                            <div>Loading...</div>
                        ) : (
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
                                            const employeeData = employeeHours[employee.id];
                                            const hours = employeeData ? employeeData.hours : '';
                                            const status = employeeData ? employeeData.status : 'present';
                                            const totalPay = (hours || 0) * (employee.salary_per_hour || 0);

                                            return (
                                                <TableRow key={employee.id} className="hover:bg-accent/50">
                                                    <TableCell className="font-medium text-base">{employee.name}</TableCell>
                                                    <TableCe
