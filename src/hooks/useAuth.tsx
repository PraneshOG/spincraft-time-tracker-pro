
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Admin } from '@/types';

interface AuthContextType {
  admin: Admin | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('spincraft_admin');
    if (storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    // Hardcoded admin credentials
    if (username === 'admin' && password === 'spincraft89') {
      const adminData: Admin = {
        id: 'admin-1',
        username: 'admin',
        name: 'System Administrator'
      };
      setAdmin(adminData);
      localStorage.setItem('spincraft_admin', JSON.stringify(adminData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem('spincraft_admin');
  };

  return (
    <AuthContext.Provider value={{ 
      admin, 
      login, 
      logout, 
      isAuthenticated: !!admin 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
