
import { useState, useEffect } from 'react';
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
      setEmployees(data || []);
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
      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
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
  const [loading, setLoading] = useState(true);

  const fetchWorkLogs = async (filters?: { employeeId?: string; startDate?: string; endDate?: string }) => {
    try {
      let query = supabase
        .from('work_logs')
        .select(`
          *,
          employees (
            name,
            employee_id
          )
        `)
        .order('date', { ascending: false });

      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setWorkLogs(data || []);
    } catch (error) {
      console.error('Error fetching work logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch work logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addWorkLog = async (workLogData: Omit<WorkLog, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('work_logs')
        .insert([workLogData])
        .select()
        .single();
      
      if (error) throw error;
      await fetchWorkLogs();
      return data;
    } catch (error) {
      console.error('Error adding work log:', error);
      throw error;
    }
  };

  const updateWorkLog = async (id: string, updates: Partial<WorkLog>) => {
    try {
      const { error } = await supabase
        .from('work_logs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      await fetchWorkLogs();
    } catch (error) {
      console.error('Error updating work log:', error);
      throw error;
    }
  };

  const deleteWorkLog = async (id: string) => {
    try {
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await fetchWorkLogs();
    } catch (error) {
      console.error('Error deleting work log:', error);
      throw error;
    }
  };

  return {
    workLogs,
    loading,
    addWorkLog,
    updateWorkLog,
    deleteWorkLog,
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
