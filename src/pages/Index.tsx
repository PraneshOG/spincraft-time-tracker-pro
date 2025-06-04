
import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/LoginForm';
import Dashboard from '@/components/Dashboard';
import EmployeeManagement from '@/components/EmployeeManagement';
import TimeTracking from '@/components/TimeTracking';
import CalendarView from '@/components/CalendarView';
import Reports from '@/components/Reports';
import AdminLogs from '@/components/AdminLogs';

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <EmployeeManagement />;
      case 'tracking':
        return <TimeTracking />;
      case 'calendar':
        return <CalendarView />;
      case 'reports':
        return <Reports />;
      case 'logs':
        return <AdminLogs />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 flex flex-col">
          <header className="border-b bg-background px-4 py-3 flex items-center justify-between">
            <SidebarTrigger />
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </header>
          <div className="flex-1 p-6 custom-scrollbar overflow-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
