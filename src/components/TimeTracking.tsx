import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Plus, Edit, Trash2, Search } from 'lucide-react';
import { useEmployees, useWorkLogs, useAdminLogs } from '@/hooks/useSupabaseData';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const TimeTracking = () => {
  const { employees } = useEmployees();
  const { workLogs, addWorkLog, updateWorkLog, deleteWorkLog, fetchWorkLogs } = useWorkLogs();
  const { addAdminLog } = useAdminLogs();
  const { admin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    total_hours: 0,
    status: 'present' as 'present' | 'absent' | 'overtime' | 'holiday',
    notes: '',
  });

  useEffect(() => {
    fetchWorkLogs({
      employeeId: selectedEmployee || undefined,
      startDate: selectedDate ? selectedDate : undefined,
    });
  }, [selectedEmployee, selectedDate, fetchWorkLogs]);

  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const calculatedHours = formData.start_time && formData.end_time 
        ? calculateHours(formData.start_time, formData.end_time)
        : formData.total_hours;

      const logData = {
        ...formData,
        total_hours: calculatedHours,
        created_by: admin?.id || 'admin',
      };

      if (editingLog) {
        await updateWorkLog(editingLog.id, logData);
        await addAdminLog('UPDATE_WORKLOG', `Updated work log for ${editingLog.employees?.name} on ${formData.date}`, admin?.id || 'admin');
        toast({
          title: "Work Log Updated",
          description: "Work log has been successfully updated.",
        });
      } else {
        await addWorkLog(logData);
        const employee = employees.find(emp => emp.id === formData.employee_id);
        await addAdminLog('ADD_WORKLOG', `Added work log for ${employee?.name} on ${formData.date}`, admin?.id || 'admin');
        toast({
          title: "Work Log Added",
          description: "Work log has been successfully added.",
        });
      }

      setFormData({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        total_hours: 0,
        status: 'present',
        notes: '',
      });
      setEditingLog(null);
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save work log",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (log: any) => {
    setEditingLog(log);
    setFormData({
      employee_id: log.employee_id,
      date: log.date,
      start_time: log.start_time || '',
      end_time: log.end_time || '',
      total_hours: log.total_hours,
      status: log.status,
      notes: log.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (log: any) => {
    try {
      await deleteWorkLog(log.id);
      await addAdminLog('DELETE_WORKLOG', `Deleted work log for ${log.employees?.name} on ${log.date}`, admin?.id || 'admin');
      toast({
        title: "Work Log Deleted",
        description: "Work log has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete work log",
        variant: "destructive",
      });
    }
  };

  const filteredLogs = workLogs.filter(log => 
    !searchTerm || 
    log.employees?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.employees?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground">Track employee working hours</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Work Log
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLog ? 'Edit Work Log' : 'Add Work Log'}
              </DialogTitle>
              <DialogDescription>
                {editingLog ? 'Update work log information' : 'Record employee working hours'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} - {employee.employeeId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        start_time: newStartTime,
                        total_hours: newStartTime && prev.end_time ? calculateHours(newStartTime, prev.end_time) : prev.total_hours
                      }));
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => {
                      const newEndTime = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        end_time: newEndTime,
                        total_hours: prev.start_time && newEndTime ? calculateHours(prev.start_time, newEndTime) : prev.total_hours
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalHours">Total Hours</Label>
                <Input
                  id="totalHours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={formData.total_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_hours: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="overtime">Overtime</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  {editingLog ? 'Update' : 'Add'} Log
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingLog(null);
                    setFormData({
                      employee_id: '',
                      date: new Date().toISOString().split('T')[0],
                      start_time: '',
                      end_time: '',
                      total_hours: 0,
                      status: 'present',
                      notes: '',
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Logs</CardTitle>
          <CardDescription>Employee time tracking records</CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Filter by employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-sm"
            />
          </div>
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
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(log)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(log)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No work logs found
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

export default TimeTracking;
