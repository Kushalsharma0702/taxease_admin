import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, PERMISSIONS } from '@/types';
import { getSession, setSession, clearSession, refreshSession } from '@/lib/session';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'superadmin@taxease.ca',
    name: 'John Smith',
    role: 'superadmin',
    permissions: Object.values(PERMISSIONS),
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: '2',
    email: 'admin@taxease.ca',
    name: 'Sarah Johnson',
    role: 'admin',
    permissions: [PERMISSIONS.ADD_EDIT_CLIENT, PERMISSIONS.REQUEST_DOCUMENTS, PERMISSIONS.UPDATE_WORKFLOW],
    isActive: true,
    createdAt: new Date(),
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const loadSession = async () => {
      const sessionUser = await getSession();
      if (sessionUser) {
        setUser(sessionUser);
        // Refresh session to extend expiry
        await refreshSession();
      }
      setIsLoading(false);
    };
    
    loadSession();
  }, []);

  // Refresh session every 5 minutes to keep it active
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      await refreshSession();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const foundUser = MOCK_USERS.find(u => u.email === email);
    if (foundUser && password === 'demo123') {
      setUser(foundUser);
      await setSession(foundUser);
      return true;
    }
    return false;
  };

  const logout = async () => {
    setUser(null);
    await clearSession();
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    return user.permissions.includes(permission);
  };

  const isSuperAdmin = (): boolean => {
    return user?.role === 'superadmin';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
