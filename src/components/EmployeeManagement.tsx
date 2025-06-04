import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
    gender: 'male' as 'male' | 'female',
    joining_date: '',
  });

  const getSalaryPerHour = (gender: 'male' | 'female') => {
    return gender === 'female' ? 41.25 : 55;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const employeeData = {
        ...formData,
        salary_per_hour: getSalaryPerHour(formData.gender),
      };

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeData);
        await addAdminLog('UPDATE_EMPLOYEE', `Updated employee: ${formData.name} (ID: ${formData.employee_id})`, admin?.id || 'admin');
        toast({
          title: "Employee Updated",
          description: `${formData.name} has been successfully updated.`,
        });
      } else {
        await addEmployee({
          ...employeeData,
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

      setFormData({ name: '', employee_id: '', gender: 'male', joining_date: '' });
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
      gender: employee.gender,
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
    emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading employees...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">Manage your workforce</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Update employee information' : 'Enter employee details'}
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
              
              <div className="space-y-3">
                <Label>Gender</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value: 'male' | 'female') => setFormData(prev => ({ ...prev, gender: value }))}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male (₹55/hr)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female (₹41.25/hr)</Label>
                  </div>
                </RadioGroup>
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
                    setFormData({ name: '', employee_id: '', gender: 'male', joining_date: '' });
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
          
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{employee.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {employee.employee_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {employee.gender} • ₹{employee.salary_per_hour || getSalaryPerHour(employee.gender)}/hr
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Joined: {new Date(employee.joining_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(employee)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(employee)}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No employees found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManagement;
