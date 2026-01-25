import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check if user has admin authentication
    const checkAdminAuth = async () => {
      try {
        const response = await fetch('/api/admin/status', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          // Not authenticated as admin, redirect to admin login
          setLocation('/admin/login');
          return;
        }
        
        const data = await response.json();
        if (!data.authenticated || data.user?.role !== 'admin') {
          setLocation('/admin/login');
          return;
        }
      } catch (error) {
        // Error checking auth, redirect to admin login
        setLocation('/admin/login');
      }
    };

    checkAdminAuth();
  }, [setLocation]);

  return <>{children}</>;
}

// Higher-order component for protecting admin routes
export function withAdminAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AdminProtectedComponent(props: P) {
    return (
      <AdminRouteGuard>
        <Component {...props} />
      </AdminRouteGuard>
    );
  };
}