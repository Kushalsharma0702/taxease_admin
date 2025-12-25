import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, PERMISSIONS } from '@/types';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isSuperAdmin: () => boolean;
}

interface AdminLoginResponse {
  user: {
    // Backend may return either `user_id` (docs) or `id` (current impl)
    user_id?: string;
    id?: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
    is_active?: boolean;
    isActive?: boolean;
  };
  token: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
  session_id: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map backend role to frontend role
const mapRole = (backendRole: string): UserRole => {
  const roleMap: Record<string, UserRole> = {
    'superadmin': 'superadmin',
    'super_admin': 'superadmin',
    'admin': 'admin',
  };
  return roleMap[backendRole.toLowerCase()] || 'admin';
};

// Map backend permissions to frontend permissions
const mapPermissions = (backendPermissions: string[], role: string): string[] => {
  // If superadmin, grant all permissions
  if (role === 'superadmin' || role === 'super_admin') {
    return Object.values(PERMISSIONS);
  }
  
  // Map backend permission strings to frontend permission constants
  const permissionMap: Record<string, string> = {
    'read': PERMISSIONS.REQUEST_DOCUMENTS,
    'write': PERMISSIONS.ADD_EDIT_CLIENT,
    'delete': PERMISSIONS.REQUEST_DOCUMENTS,
    'manage_clients': PERMISSIONS.ADD_EDIT_CLIENT,
    'manage_documents': PERMISSIONS.REQUEST_DOCUMENTS,
    'manage_payments': PERMISSIONS.ADD_EDIT_PAYMENT,
    'view_analytics': PERMISSIONS.VIEW_ANALYTICS,
  };
  
  const mappedPermissions = backendPermissions
    .map(p => permissionMap[p])
    .filter(Boolean);
  
  // Add some default permissions for admins
  if (role === 'admin') {
    mappedPermissions.push(
      PERMISSIONS.ADD_EDIT_CLIENT,
      PERMISSIONS.REQUEST_DOCUMENTS,
      PERMISSIONS.UPDATE_WORKFLOW
    );
  }
  
  return [...new Set(mappedPermissions)]; // Remove duplicates
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const loadSession = async () => {
      const token = apiClient.getAuthToken();
      const savedUser = localStorage.getItem('user_data');
      
      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          
          // Optionally verify token is still valid
          try {
            const response = await apiClient.get<AdminLoginResponse['user']>(API_ENDPOINTS.ADMIN_AUTH.ME);
            if (response.data) {
              // Update user data if needed
              const updatedUser: User = {
                id: response.data.user_id || response.data.id || '',
                email: response.data.email,
                name: response.data.name,
                role: mapRole(response.data.role),
                permissions: mapPermissions(response.data.permissions || [], response.data.role),
                isActive: (response.data.is_active ?? response.data.isActive) !== false,
                createdAt: new Date(),
              };
              setUser(updatedUser);
              localStorage.setItem('user_data', JSON.stringify(updatedUser));
            }
          } catch {
            // Token might be expired, but we keep the user logged in with cached data
            console.log('Could not verify session, using cached data');
          }
        } catch {
          // Invalid saved user data
          apiClient.clearAuth();
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
      try {
        await apiClient.post(API_ENDPOINTS.ADMIN_AUTH.REFRESH_SESSION);
      } catch {
        console.log('Session refresh failed');
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.post<AdminLoginResponse>(
        API_ENDPOINTS.ADMIN_AUTH.LOGIN,
        { email, password }
      );

      if (response.data && response.data.token) {
        const { user: userData, token, session_id } = response.data;
        
        // Set auth token
        apiClient.setAuthToken(token.access_token);
        apiClient.setSessionId(session_id);
        
        // Create user object
        const loggedInUser: User = {
          id: userData.user_id || userData.id || '',
          email: userData.email,
          name: userData.name,
          role: mapRole(userData.role),
          permissions: mapPermissions(userData.permissions || [], userData.role),
          isActive: (userData.is_active ?? userData.isActive) !== false,
          createdAt: new Date(),
        };
        
        setUser(loggedInUser);
        localStorage.setItem('user_data', JSON.stringify(loggedInUser));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.ADMIN_AUTH.LOGOUT);
    } catch {
      // Ignore logout errors
    }
    
    setUser(null);
    apiClient.clearAuth();
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
