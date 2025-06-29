import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, WorkLog, AdminLog } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      // Cast the data to Employee[] to fix the type error
      setEmployees((data as Employee[]) || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Create the data object that matches the database schema
      const dataToInsert = {
        name: employeeData.name,
        gender: employeeData.gender,
        joining_date: employeeData.joining_date,
        salary_per_hour: employeeData.salary_per_hour,
        is_active: true
      };

      const { data, error } = await supabase
        .from('employees')
        .insert([dataToInsert])
        .select()
        .single();
      
      if (error) throw error;
      await fetchEmployees();
      return data;
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      await fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      await fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  };

  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees
  };
};

export const useWorkLogs = () => {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkLogs = useCallback(async (filters?: { employeeId?: string; startDate?: string; endDate?: string }) => {
    console.log('=== FETCHING WORK LOGS ===');
    console.log('Filters:', filters);
    
    setLoading(true);
    try {
      // Build the query - always fetch with employee data
      let query = supabase
        .from('work_logs')
        .select(`
          *,
          employees (
            name,
            id
          )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      // Only apply server-side filters if they are specifically requested and not default values
      if (filters?.employeeId && filters.employeeId !== 'all') {
        console.log('Applying employee filter:', filters.employeeId);
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.startDate && filters?.endDate) {
        console.log('Applying date range filter:', filters.startDate, 'to', filters.endDate);
        query = query.gte('date', filters.startDate).lte('date', filters.endDate);
      } else if (filters?.startDate) {
        console.log('Applying start date filter:', filters.startDate);
        query = query.gte('date', filters.startDate);
      } else if (filters?.endDate) {
        console.log('Applying end date filter:', filters.endDate);
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Raw data from Supabase:', data?.length || 0, 'records');
      
      // Process and validate the data with proper number conversion
      const processedData = (data || []).map(log => {
        // Convert total_hours to number - handle both string and number inputs
        let totalHours = 0;
        if (log.total_hours !== null && log.total_hours !== undefined) {
          if (typeof log.total_hours === 'string') {
            totalHours = parseFloat(log.total_hours) || 0;
          } else {
            totalHours = Number(log.total_hours) || 0;
          }
        }
        
        const processedLog = {
          ...log,
          total_hours: totalHours,
          status: log.status || 'present',
          notes: log.notes || '',
          employees: log.employees || { name: 'Unknown', id: log.employee_id }
        };
        
        console.log(`Processing log ${log.id}: raw_hours="${log.total_hours}" (${typeof log.total_hours}) -> processed_hours=${processedLog.total_hours} (${typeof processedLog.total_hours})`);
        return processedLog;
      });
      
      console.log('Processed work logs:', processedData.length, 'records');
      console.log('Sample processed data:', processedData.slice(0, 3).map(log => ({
        id: log.id,
        date: log.date,
        employee: log.employees?.name,
        hours: log.total_hours,
        hours_type: typeof log.total_hours,
        status: log.status
      })));
      
      setWorkLogs(processedData as WorkLog[]);
      
      console.log('Work logs state updated successfully');
    } catch (error) {
      console.error('Error fetching work logs:', error);
      toast({
        title: "Error",
        description: `Failed to fetch work logs: ${error.message}`,
        variant: "destructive",
      });
      setWorkLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addWorkLog = async (workLogData: Omit<WorkLog, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('=== ADDING WORK LOG ===');
      console.log('Input data:', workLogData);
      
      // Ensure total_hours is properly converted to number
      let totalHours = 0;
      if (workLogData.total_hours !== null && workLogData.total_hours !== undefined) {
        if (typeof workLogData.total_hours === 'string') {
          totalHours = parseFloat(workLogData.total_hours) || 0;
        } else {
          totalHours = Number(workLogData.total_hours) || 0;
        }
      }
      
      const dataToInsert = {
        ...workLogData,
        total_hours: totalHours,
        status: workLogData.status || 'present'
      };
      
      console.log('Data to insert:', dataToInsert);
      console.log('Total hours being inserted:', totalHours, typeof totalHours);
      
      const { data, error } = await supabase
        .from('work_logs')
        .insert([dataToInsert])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding work log:', error);
        throw error;
      }
      
      console.log('Work log added successfully:', data);
      return data;
    } catch (error) {
      console.error('Error adding work log:', error);
      throw error;
    }
  };

  const updateWorkLog = async (id: string, updates: Partial<WorkLog>) => {
    try {
      console.log('=== UPDATING WORK LOG ===');
      console.log('ID:', id);
      console.log('Updates:', updates);
      
      // Ensure total_hours is properly converted to number
      let totalHours = updates.total_hours;
      if (totalHours !== null && totalHours !== undefined) {
        if (typeof totalHours === 'string') {
          totalHours = parseFloat(totalHours) || 0;
        } else {
          totalHours = Number(totalHours) || 0;
        }
      }
      
      const updateData = { 
        ...updates, 
        updated_at: new Date().toISOString(),
        total_hours: totalHours
      };
      
      console.log('Final update data:', updateData);
      console.log('Total hours being updated:', totalHours, typeof totalHours);
      
      const { error } = await supabase
        .from('work_logs')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating work log:', error);
        throw error;
      }
      
      console.log('Work log updated successfully');
    } catch (error) {
      console.error('Error updating work log:', error);
      throw error;
    }
  };

  const deleteWorkLog = async (id: string) => {
    try {
      console.log('=== DELETING WORK LOG ===');
      console.log('ID:', id);
      
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting work log:', error);
        throw error;
      }
      
      console.log('Work log deleted successfully');
    } catch (error) {
      console.error('Error deleting work log:', error);
      throw error;
    }
  };

  const addBulkWorkLogs = async (workLogs: Omit<WorkLog, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const dataToInsert = workLogs.map(log => {
        // Ensure total_hours is properly converted to number
        let totalHours = 0;
        if (log.total_hours !== null && log.total_hours !== undefined) {
          if (typeof log.total_hours === 'string') {
            totalHours = parseFloat(log.total_hours) || 0;
          } else {
            totalHours = Number(log.total_hours) || 0;
          }
        }
        
        return {
          ...log,
          total_hours: totalHours,
          status: log.status || 'present'
        };
      });
      
      const { error } = await supabase
        .from('work_logs')
        .insert(dataToInsert);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error adding bulk work logs:', error);
      throw error;
    }
  };

  return {
    workLogs,
    loading,
    addWorkLog,
    updateWorkLog,
    deleteWorkLog,
    addBulkWorkLogs,
    fetchWorkLogs
  };
};

export const useAdminLogs = () => {
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setAdminLogs(data || []);
    } catch (error) {
      console.error('Error fetching admin logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAdminLog = async (action: string, details: string, adminId: string) => {
    try {
      const { error } = await supabase
        .from('admin_logs')
        .insert([{ action, details, admin_id: adminId }]);
      
      if (error) throw error;
      await fetchAdminLogs();
    } catch (error) {
      console.error('Error adding admin log:', error);
    }
  };

  useEffect(() => {
    fetchAdminLogs();
  }, []);

  return {
    adminLogs,
    loading,
    addAdminLog,
    refetch: fetchAdminLogs
  };
};

// Hook for salary calculations
export const useSalaryCalculations = () => {
  const [salaryCalculations, setSalaryCalculations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSalaryCalculations = async () => {
    try {
      const { data, error } = await supabase
        .from('salary_calculations')
        .select(`
          *,
          employees (
            name
          )
        `)
        .order('calculation_date', { ascending: false });
      
      if (error) throw error;
      setSalaryCalculations(data || []);
    } catch (error) {
      console.error('Error fetching salary calculations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch salary calculations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSalaryForPeriod = async (startDate: string, endDate: string) => {
    try {
      // Get all work logs for the period with status 'present'
      const { data: workLogs, error: workLogsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          employees (
            id,
            name,
            salary_per_hour
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'present');

      if (workLogsError) throw workLogsError;

      // Group by employee and calculate totals
      const employeeTotals = workLogs?.reduce((acc: any, log: any) => {
        const empId = log.employee_id;
        if (!acc[empId]) {
          acc[empId] = {
            employee_id: empId,
            employee: log.employees,
            total_hours: 0,
            hourly_rate: log.employees?.salary_per_hour || 0
          };
        }
        
        // Properly convert hours to number
        let hours = 0;
        if (log.total_hours !== null && log.total_hours !== undefined) {
          if (typeof log.total_hours === 'string') {
            hours = parseFloat(log.total_hours) || 0;
          } else {
            hours = Number(log.total_hours) || 0;
          }
        }
        
        acc[empId].total_hours += hours;
        return acc;
      }, {});

      // Create salary calculation records
      const salaryCalculations = Object.values(employeeTotals || {}).map((emp: any) => ({
        employee_id: emp.employee_id,
        calculation_date: new Date().toISOString().split('T')[0],
        start_date: startDate,
        end_date: endDate,
        total_hours: emp.total_hours,
        hourly_rate: emp.hourly_rate,
        total_salary: emp.total_hours * emp.hourly_rate,
        status: 'pending'
      }));

      if (salaryCalculations.length > 0) {
        const { error } = await supabase
          .from('salary_calculations')
          .insert(salaryCalculations);
        
        if (error) throw error;
        await fetchSalaryCalculations();
      }

      return salaryCalculations;
    } catch (error) {
      console.error('Error calculating salary:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSalaryCalculations();
  }, []);

  return {
    salaryCalculations,
    loading,
    fetchSalaryCalculations,
    calculateSalaryForPeriod
  };
};