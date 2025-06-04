import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useEmployees, useWorkLogs, useAdminLogs } from '@/hooks/useSupabaseData';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const TimeTracking = () => {
  const { employees } = useEmployees();
  const { workLogs, addWorkLog, updateWorkLog, deleteWorkLog, fetchWorkLogs } = useWorkLogs();
  const { addAdminLog } = useAdminLogs();
  const { admin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    total_hours: 0,
    status: 'present' as 'present' | 'absent' | 'overtime' | 'holiday',
    notes: '',
  });

  useEffect(() => {
    fetchWorkLogs({
      employeeId: selectedEmployee === 'all' ? undefined : selectedEmployee,
      startDate: selectedDate ? selectedDate : undefined,
    });
  }, [selectedEmployee, selectedDate, fetchWorkLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const logData = {
        ...formData,
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
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground">Track employee working hours</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Work Log
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-sm">
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
                        {employee.name} - {employee.employee_id}
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
                  placeholder="8"
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
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
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
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by employee" />
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
            
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{log.employees?.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {log.employees?.employee_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(log.date).toLocaleDateString()} • {log.total_hours}h
                    </p>
                    {log.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                    )}
                  </div>
                  <Badge className={`${getStatusColor(log.status)} text-white`}>
                    {log.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(log)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(log)}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No work logs found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeTracking;
