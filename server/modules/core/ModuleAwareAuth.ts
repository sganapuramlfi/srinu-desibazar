export interface UserSession {
  userId: number;
  businessId: number;
  role: string;
  industry: string;
  enabledModules: string[];
  permissions: string[];
  moduleSubscriptions: any[];
}

export class ModuleAwareAuth {
  async authenticateUser(credentials: { email: string; password: string }) {
    // This method is not used anymore - authentication is handled by simplified-auth.ts
    // Returning failure to prevent any accidental usage
    return {
      success: false,
      message: "Please use /api/simple/login for authentication",
      session: null,
      availableModules: []
    };
  }

  async getUserStatus(userId: number) {
    // This method is not used anymore - user status is retrieved from req.user
    // Returning unauthenticated to prevent any accidental usage
    return {
      authenticated: false,
      user: null,
      enabledModules: [],
      permissions: []
    };
  }

  requireModuleAccess(moduleId: string) {
    return (req: any, res: any, next: any) => {
      // Check if user is authenticated
      if (!req.user || !req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const user = req.user as any;
      const enabledModules = user.primaryBusiness ? [user.primaryBusiness.industryType] : [];
      
      // Check if user has access to the requested module
      if (!enabledModules.includes(moduleId)) {
        return res.status(403).json({ error: `Access to module '${moduleId}' denied` });
      }
      
      next();
    };
  }

  requirePermission(permission: string) {
    return (req: any, res: any, next: any) => {
      // Check if user is authenticated
      if (!req.user || !req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const user = req.user as any;
      const permissions = user.primaryBusiness ? ['read', 'write'] : ['read'];
      
      // Check if user has the required permission
      if (!permissions.includes(permission)) {
        return res.status(403).json({ error: `Permission '${permission}' denied` });
      }
      
      next();
    };
  }
}