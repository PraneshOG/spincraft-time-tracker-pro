import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useEmployees, useAdminLogs } from '@/hooks/useSupabaseData';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const EmployeeManagement = () => {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { addAdminLog } = useAdminLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const { admin } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    employee_id: '',
    contact_no: '',
    joining_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData);
        await addAdminLog('UPDATE_EMPLOYEE', `Updated employee: ${formData.name} (ID: ${formData.employee_id})`, admin?.id || 'admin');
        toast({
          title: "Employee Updated",
          description: `${formData.name} has been successfully updated.`,
        });
      } else {
        await addEmployee({
          ...formData,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
        await addAdminLog('ADD_EMPLOYEE', `Added new employee: ${formData.name} (ID: ${formData.employee_id})`, admin?.id || 'admin');
        toast({
          title: "Employee Added",
          description: `${formData.name} has been successfully added.`,
        });
      }

      setFormData({ name: '', employee_id: '', contact_no: '', joining_date: '' });
      setEditingEmployee(null);
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save employee",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      employee_id: employee.employee_id,
      contact_no: employee.contact_no,
      joining_date: employee.joining_date,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (employee: any) => {
    try {
      await deleteEmployee(employee.id);
      await addAdminLog('DELETE_EMPLOYEE', `Deactivated employee: ${employee.name} (ID: ${employee.employee_id})`, admin?.id || 'admin');
      toast({
        title: "Employee Deactivated",
        description: `${employee.name} has been deactivated.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate employee",
        variant: "destructive",
      });
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.contact_no.includes(searchTerm)
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading employees...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">Manage your workforce</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Update employee information' : 'Enter employee details to add them to the system'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  value={formData.employee_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                  placeholder="Enter employee ID"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact_no">Contact Number</Label>
                <Input
                  id="contact_no"
                  value={formData.contact_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_no: e.target.value }))}
                  placeholder="Enter contact number"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="joining_date">Joining Date</Label>
                <Input
                  id="joining_date"
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, joining_date: e.target.value }))}
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingEmployee(null);
                    setFormData({ name: '', employee_id: '', contact_no: '', joining_date: '' });
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
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            Manage your team members
          </CardDescription>
          
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="mobile-hide">Employee ID</TableHead>
                  <TableHead className="mobile-hide">Contact</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="mobile-hide">{employee.employee_id}</TableCell>
                    <TableCell className="mobile-hide">{employee.contact_no}</TableCell>
                    <TableCell>{new Date(employee.joining_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(employee)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(employee)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No employees found
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

export default EmployeeManagement;
