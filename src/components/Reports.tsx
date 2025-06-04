import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, Users } from 'lucide-react';
import { useEmployees, useWorkLogs } from '@/hooks/useSupabaseData';

const Reports = () => {
  const { employees } = useEmployees();
  const { workLogs, fetchWorkLogs } = useWorkLogs();
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchWorkLogs({
      employeeId: selectedEmployee === 'all' ? undefined : selectedEmployee,
      startDate,
      endDate,
    });
  }, [startDate, endDate, selectedEmployee, fetchWorkLogs]);

  const filteredLogs = workLogs.filter(log => 
    !selectedStatus || selectedStatus === 'all' || log.status === selectedStatus
  );

  const generateSummary = () => {
    const summary = {
      totalHours: 0,
      presentDays: 0,
      absentDays: 0,
      overtimeHours: 0,
      holidayDays: 0,
      employeeStats: {} as Record<string, any>,
    };

    filteredLogs.forEach(log => {
      summary.totalHours += log.total_hours;
      
      switch (log.status) {
        case 'present':
          summary.presentDays++;
          break;
        case 'absent':
          summary.absentDays++;
          break;
        case 'overtime':
          summary.presentDays++;
          summary.overtimeHours += Math.max(0, log.total_hours - 8);
          break;
        case 'holiday':
          summary.holidayDays++;
          break;
      }

      // Employee-specific stats
      const employeeName = log.employees?.name || 'Unknown';
      if (!summary.employeeStats[employeeName]) {
        summary.employeeStats[employeeName] = {
          totalHours: 0,
          presentDays: 0,
          absentDays: 0,
          overtimeHours: 0,
          holidayDays: 0,
        };
      }

      const empStats = summary.employeeStats[employeeName];
      empStats.totalHours += log.total_hours;
      
      switch (log.status) {
        case 'present':
          empStats.presentDays++;
          break;
        case 'absent':
          empStats.absentDays++;
          break;
        case 'overtime':
          empStats.presentDays++;
          empStats.overtimeHours += Math.max(0, log.total_hours - 8);
          break;
        case 'holiday':
          empStats.holidayDays++;
          break;
      }
    });

    return summary;
  };

  const summary = generateSummary();

  const exportToCSV = () => {
    const headers = ['Employee', 'Employee ID', 'Date', 'Start Time', 'End Time', 'Total Hours', 'Status', 'Notes'];
    const rows = filteredLogs.map(log => [
      log.employees?.name || '',
      log.employees?.employee_id || '',
      log.date,
      log.start_time || '',
      log.end_time || '',
      log.total_hours,
      log.status,
      log.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-tracking-report-${startDate}-to-${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and export time tracking reports</p>
        </div>
        
        <Button onClick={exportToCSV} className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Configure your report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
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
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="overtime">Overtime</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summary.totalHours * 10) / 10}</div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Days</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.presentDays}</div>
            <p className="text-xs text-muted-foreground">
              Working days recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summary.overtimeHours * 10) / 10}</div>
            <p className="text-xs text-muted-foreground">
              Extra hours worked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.absentDays}</div>
            <p className="text-xs text-muted-foreground">
              Days not worked
            </p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(summary.employeeStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Employee Summary</CardTitle>
            <CardDescription>Individual employee statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Present Days</TableHead>
                    <TableHead>Absent Days</TableHead>
                    <TableHead>Overtime Hours</TableHead>
                    <TableHead>Holiday Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(summary.employeeStats).map(([name, stats]) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{Math.round(stats.totalHours * 10) / 10}h</TableCell>
                      <TableCell>{stats.presentDays}</TableCell>
                      <TableCell>{stats.absentDays}</TableCell>
                      <TableCell>{Math.round(stats.overtimeHours * 10) / 10}h</TableCell>
                      <TableCell>{stats.holidayDays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Detailed Logs</CardTitle>
          <CardDescription>All time tracking entries in selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="mobile-hide">Time</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="mobile-hide">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{log.employees?.name}</div>
                        <div className="text-sm text-muted-foreground">{log.employees?.employee_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                    <TableCell className="mobile-hide">
                      {log.start_time && log.end_time ? `${log.start_time} - ${log.end_time}` : '-'}
                    </TableCell>
                    <TableCell>{log.total_hours}h</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(log.status)} text-white`}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="mobile-hide">
                      {log.notes && (
                        <div className="max-w-xs truncate" title={log.notes}>
                          {log.notes}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No logs found for selected criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
