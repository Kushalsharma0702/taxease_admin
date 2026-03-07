import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, PERMISSIONS } from '@/types';
import { getSession, setSession, clearSession, refreshSession } from '@/lib/session';
import { api } from '@/services/api';

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
    // Validate token with backend on mount — clears stale sessions automatically
    const loadSession = async () => {
      const token = localStorage.getItem('taxease_access_token');
      if (token) {
        try {
          const me = await api.getCurrentUser();
          const sessionUser = await getSession();
          const fullName = me
            ? [me.first_name, me.last_name].filter(Boolean).join(' ') || me.name || me.email
            : sessionUser?.name || '';
          setUser({
            id: me?.id || sessionUser?.id || 'unknown',
            email: me?.email || sessionUser?.email || '',
            name: fullName,
            role: (me?.role || sessionUser?.role || 'admin') as UserRole,
            permissions: me?.permissions || sessionUser?.permissions || Object.values(PERMISSIONS),
            isActive: me?.is_active ?? sessionUser?.isActive ?? true,
            createdAt: me?.created_at ? new Date(me.created_at) : new Date(),
          });
        } catch {
          // Token invalid — clear everything and stay on login
          localStorage.removeItem('taxease_access_token');
          localStorage.removeItem('taxease_refresh_token');
          localStorage.removeItem('taxease_user');
          localStorage.removeItem('taxease_session_id');
          await clearSession();
        }
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
    try {
      const response = await api.login(email, password);

      const hasToken = !!response.token?.access_token;
      const rawUser = response.user;

      if (hasToken) {
        // Backend returns first_name + last_name (no combined name field)
        const fullName = rawUser
          ? [rawUser.first_name, rawUser.last_name].filter(Boolean).join(' ') || rawUser.name || rawUser.email
          : email;

        const user: User = {
          id: rawUser?.id || 'unknown',
          email: rawUser?.email || email,
          name: fullName,
          // Backend does not return role/permissions — default to 'admin' with all permissions
          role: (rawUser?.role || 'admin') as UserRole,
          permissions: rawUser?.permissions || Object.values(PERMISSIONS),
          isActive: rawUser?.is_active ?? true,
          createdAt: rawUser?.created_at ? new Date(rawUser.created_at) : new Date(),
        };
        setUser(user);
        await setSession(user);
        return true;
      }
      console.error('Login failed: no access token in response');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Continue with local cleanup even if API fails
    }
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
