
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Employee, AdminLog } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useLocalStorage<Employee[]>('spincraft_employees', []);
  const [adminLogs, setAdminLogs] = useLocalStorage<AdminLog[]>('spincraft_admin_logs', []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const { admin } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    contactNo: '',
    joiningDate: '',
  });

  const addAdminLog = (action: string, details: string) => {
    const log: AdminLog = {
      id: Date.now().toString(),
      action,
      details,
      timestamp: new Date().toISOString(),
      adminId: admin?.id || 'unknown',
    };
    setAdminLogs(prev => [log, ...prev]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingEmployee) {
      // Update existing employee
      const updatedEmployee: Employee = {
        ...editingEmployee,
        ...formData,
        updatedAt: new Date().toISOString(),
      };
      
      setEmployees(prev => prev.map(emp => 
        emp.id === editingEmployee.id ? updatedEmployee : emp
      ));
      
      addAdminLog('UPDATE_EMPLOYEE', `Updated employee: ${formData.name} (ID: ${formData.employeeId})`);
      toast({
        title: "Employee Updated",
        description: `${formData.name} has been successfully updated.`,
      });
    } else {
      // Add new employee
      const newEmployee: Employee = {
        id: Date.now().toString(),
        ...formData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setEmployees(prev => [...prev, newEmployee]);
      addAdminLog('ADD_EMPLOYEE', `Added new employee: ${formData.name} (ID: ${formData.employeeId})`);
      toast({
        title: "Employee Added",
        description: `${formData.name} has been successfully added.`,
      });
    }

    setFormData({ name: '', employeeId: '', contactNo: '', joiningDate: '' });
    setEditingEmployee(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      employeeId: employee.employeeId,
      contactNo: employee.contactNo,
      joiningDate: employee.joiningDate,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (employee: Employee) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employee.id ? { ...emp, isActive: false, updatedAt: new Date().toISOString() } : emp
    ));
    addAdminLog('DELETE_EMPLOYEE', `Deactivated employee: ${employee.name} (ID: ${employee.employeeId})`);
    toast({
      title: "Employee Deactivated",
      description: `${employee.name} has been deactivated.`,
    });
  };

  const filteredEmployees = employees.filter(emp => 
    emp.isActive && (
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.contactNo.includes(searchTerm)
    )
  );

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
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                  placeholder="Enter employee ID"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactNo">Contact Number</Label>
                <Input
                  id="contactNo"
                  value={formData.contactNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactNo: e.target.value }))}
                  placeholder="Enter contact number"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="joiningDate">Joining Date</Label>
                <Input
                  id="joiningDate"
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
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
                    setFormData({ name: '', employeeId: '', contactNo: '', joiningDate: '' });
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
                    <TableCell className="mobile-hide">{employee.employeeId}</TableCell>
                    <TableCell className="mobile-hide">{employee.contactNo}</TableCell>
                    <TableCell>{new Date(employee.joiningDate).toLocaleDateString()}</TableCell>
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
