import React, { useState, useEffect } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
  Input, Label, Button, Table, TableHeader, TableBody,
  TableRow, TableHead, TableCell,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui"; // Update imports based on your project structure
import { Calendar, Save, DollarSign, Calculator } from "lucide-react";

const SalaryManager = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [salaryStartDate, setSalaryStartDate] = useState("");
  const [salaryEndDate, setSalaryEndDate] = useState("");
  const [employeeHours, setEmployeeHours] = useState({});
  const [showSalaryResults, setShowSalaryResults] = useState(false);
  const [salaryResults, setSalaryResults] = useState([]);

  // Dummy employee list
  const employees = [
    { id: 1, name: "John", salary_per_hour: 100 },
    { id: 2, name: "Alice", salary_per_hour: 120 },
    { id: 3, name: "Bob", salary_per_hour: 80 },
  ];

  // Initialize employeeHours on first render or when employees change
  useEffect(() => {
    const initial = {};
    employees.forEach(emp => {
      initial[emp.id] = {
        hours: 0,
        status: "present"
      };
    });
    setEmployeeHours(initial);
  }, [employees]);

  const updateEmployeeHours = (id, newHours) => {
    setEmployeeHours(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        hours: newHours,
      },
    }));
  };

  const updateEmployeeStatus = (id, newStatus) => {
    setEmployeeHours(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status: newStatus,
      },
    }));
  };

  const handleSaveAll = () => {
    console.log("Saved", employeeHours);
  };

  const handleCalculateSalary = () => {
    const results = employees.map(emp => {
      const { hours = 0 } = employeeHours[emp.id] || {};
      const total_salary = hours * emp.salary_per_hour;
      return {
        employee_name: emp.name,
        total_hours: hours,
        hourly_rate: emp.salary_per_hour,
        total_salary,
      };
    });
    setSalaryResults(results);
    setShowSalaryResults(true);
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Date Selector */}
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
                onChange={e => setSelectedDate(e.target.value)}
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

      {/* Salary Calculation */}
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
                onChange={e => setSalaryStartDate(e.target.value)}
                className="w-auto min-w-48 text-base"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="salary-end-date" className="text-base font-medium">To:</Label>
              <Input
                id="salary-end-date"
                type="date"
                value={salaryEndDate}
                onChange={e => setSalaryEndDate(e.target.value)}
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

      {/* Salary Results */}
      {showSalaryResults && salaryResults.length > 0 && (
        <Card className="border-4 border-green-300 bg-green-50/70">
          <CardHeader className="pb-4">
            <CardTitle className="text-green-800 text-2xl">💰 Salary Calculation Results</CardTitle>
            <p className="text-muted-foreground text-lg">
              Period: <strong>{formatDate(salaryStartDate)}</strong> to <strong>{formatDate(salaryEndDate)}</strong>
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
                      <TableCell className="text-center text-base">{result.total_hours} hrs</TableCell>
                      <TableCell className="text-center text-base">₹{result.hourly_rate}</TableCell>
                      <TableCell className="font-bold text-green-700 text-lg">₹{result.total_salary.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-8 p-6 bg-green-100 border-2 border-green-400 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold text-green-800">Grand Total Amount:</span>
                  <span className="text-3xl font-bold text-green-800">
                    ₹{salaryResults.reduce((sum, r) => sum + r.total_salary, 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-base text-green-600 mt-3">
                  Total employees: {salaryResults.length} | Total hours: {salaryResults.reduce((sum, r) => sum + r.total_hours, 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Hours Entry */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Employee Hours for {selectedDate ? formatDate(selectedDate) : "Selected Date"}</CardTitle>
        </CardHeader>
        <CardContent>
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
                {employees.map(emp => {
                  const data = employeeHours[emp.id] || {};
                  const totalPay = (data.hours || 0) * emp.salary_per_hour;

                  return (
                    <TableRow key={emp.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium text-base">{emp.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={data.hours ?? 0}
                          onChange={e => updateEmployeeHours(emp.id, parseFloat(e.target.value) || 0)}
                          className="w-24 text-base"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={data.status}
                          onValueChange={val => updateEmployeeStatus(emp.id, val)}
                        >
                          <SelectTrigger className="w-36 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="overtime">Overtime</SelectItem>
                            <SelectItem value="holiday">Holiday</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-base">₹{emp.salary_per_hour}</TableCell>
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
  );
};

export default SalaryManager;
