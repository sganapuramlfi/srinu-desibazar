import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from '../hooks/use-toast';

export interface UserSession {
  userId: number;
  businessId: number;
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'customer';
  industry: string;
  enabledModules: string[];
  permissions: string[];
  moduleSubscriptions: Array<{
    moduleId: string;
    status: 'active' | 'suspended' | 'trial';
    expiresAt: Date;
  }>;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  moduleId: string;
  permissions?: string[];
  children?: NavigationItem[];
  badge?: {
    type: 'count' | 'status' | 'new';
    value: string | number;
    color?: 'primary' | 'success' | 'warning' | 'error';
  };
}

export interface DashboardWidget {
  id: string;
  title: string;
  moduleId: string;
  component: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: {
    row: number;
    col: number;
    width: number;
    height: number;
  };
  permissions?: string[];
  refreshInterval?: number;
  configurable: boolean;
}

interface ModularAuthContextType {
  session: UserSession | null;
  navigation: NavigationItem[];
  dashboard: {
    widgets: DashboardWidget[];
    layout: {
      mobile: DashboardWidget[];
      tablet: DashboardWidget[];
      desktop: DashboardWidget[];
    };
  } | null;
  availableModules: Array<{
    moduleId: string;
    name: string;
    isEnabled: boolean;
    hasAccess: boolean;
  }>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ModularAuthContext = createContext<ModularAuthContextType | undefined>(undefined);

export function ModularAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [dashboard, setDashboard] = useState<ModularAuthContextType['dashboard']>(null);
  const [availableModules, setAvailableModules] = useState<ModularAuthContextType['availableModules']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session on app load
    checkExistingSession();
  }, []);

  useEffect(() => {
    // Load navigation and dashboard when session changes
    if (session) {
      loadUserInterface();
    }
  }, [session]);

  const checkExistingSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/modular/auth/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userStatus = await response.json();
        setSession({
          ...userStatus.user,
          enabledModules: userStatus.enabledModules || [],
          permissions: userStatus.permissions || [],
          moduleSubscriptions: userStatus.moduleSubscriptions || []
        });
        setAvailableModules(userStatus.availableModules || []);
      }
    } catch (err) {
      console.log('No existing session found');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/modular/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSession({
          userId: data.user.userId,
          businessId: data.user.businessId,
          role: data.user.role,
          industry: data.user.industry,
          enabledModules: data.enabledModules,
          permissions: data.permissions,
          moduleSubscriptions: []
        });
        setAvailableModules(data.availableModules);
        
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        
        return true;
      } else {
        setError(data.message || 'Login failed');
        toast({
          title: "Login Failed",
          description: data.message || 'Please check your credentials',
          variant: "destructive"
        });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/modular/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setSession(null);
      setNavigation([]);
      setDashboard(null);
      setAvailableModules([]);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
    }
  };

  const refreshSession = async (): Promise<void> => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/modular/auth/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userStatus = await response.json();
        setSession(prev => prev ? {
          ...prev,
          enabledModules: userStatus.enabledModules || prev.enabledModules,
          permissions: userStatus.permissions || prev.permissions,
          moduleSubscriptions: userStatus.moduleSubscriptions || prev.moduleSubscriptions
        } : null);
      }
    } catch (err) {
      console.error('Failed to refresh session:', err);
    }
  };

  const loadUserInterface = async (): Promise<void> => {
    if (!session) return;

    try {
      // Load navigation
      const navResponse = await fetch('/api/modular/ui/navigation', {
        credentials: 'include'
      });
      
      if (navResponse.ok) {
        const navData = await navResponse.json();
        setNavigation(navData.navigation);
      }

      // Load dashboard
      const dashResponse = await fetch('/api/modular/ui/dashboard', {
        credentials: 'include'
      });
      
      if (dashResponse.ok) {
        const dashData = await dashResponse.json();
        setDashboard(dashData);
      }
    } catch (err) {
      console.error('Failed to load user interface:', err);
    }
  };

  const value: ModularAuthContextType = {
    session,
    navigation,
    dashboard,
    availableModules,
    login,
    logout,
    refreshSession,
    loading,
    error
  };

  return (
    <ModularAuthContext.Provider value={value}>
      {children}
    </ModularAuthContext.Provider>
  );
}

export function useModularAuth() {
  const context = useContext(ModularAuthContext);
  if (context === undefined) {
    throw new Error('useModularAuth must be used within a ModularAuthProvider');
  }
  return context;
}

// Hook to check if user has specific permission
export function usePermission(permission: string) {
  const { session } = useModularAuth();
  return session?.permissions.includes(permission) || false;
}

// Hook to check if module is enabled for current user
export function useModuleAccess(moduleId: string) {
  const { session, availableModules } = useModularAuth();
  const module = availableModules.find(m => m.moduleId === moduleId);
  return {
    isEnabled: session?.enabledModules.includes(moduleId) || false,
    hasAccess: module?.hasAccess || false,
    isAvailable: module?.isEnabled || false
  };
}