import { ModuleRegistry } from './ModuleRegistry.js';
import { IndustryType } from './types.js';

export interface UserSession {
  userId: number;
  businessId: number;
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'customer';
  industry: IndustryType;
  enabledModules: string[];
  permissions: string[];
  moduleSubscriptions: Array<{
    moduleId: string;
    status: 'active' | 'suspended' | 'trial';
    expiresAt: Date;
  }>;
}

export class ModuleAwareAuth {
  private moduleRegistry: ModuleRegistry;

  constructor() {
    this.moduleRegistry = ModuleRegistry.getInstance();
  }

  // Authenticate user and build module-aware session
  async authenticateUser(credentials: {
    email: string;
    password: string;
  }): Promise<{
    success: boolean;
    session?: UserSession;
    message?: string;
    availableModules?: Array<{
      moduleId: string;
      name: string;
      isEnabled: boolean;
      hasAccess: boolean;
    }>;
  }> {
    try {
      // Mock user authentication - replace with actual auth logic
      const user = await this.validateUserCredentials(credentials);
      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Get user's business information
      const business = await this.getUserBusiness(user.id);
      if (!business) {
        return { success: false, message: 'No business associated with user' };
      }

      // Check which modules are enabled for this business
      const enabledModules = this.moduleRegistry.getEnabledModules();
      const userModules = enabledModules.filter(module => 
        this.hasModuleAccess(user, business, module.config.id)
      );

      // Build user permissions based on enabled modules
      const permissions = await this.buildUserPermissions(user, business, userModules.map(m => m.config.id));

      // Get module subscriptions
      const moduleSubscriptions = await this.getModuleSubscriptions(business.id);

      const session: UserSession = {
        userId: user.id,
        businessId: business.id,
        role: user.role,
        industry: business.industry,
        enabledModules: userModules.map(m => m.config.id),
        permissions,
        moduleSubscriptions
      };

      // Get available modules for frontend
      const availableModules = await this.getAvailableModulesForUser(session);

      return {
        success: true,
        session,
        availableModules
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  // Check if user has access to specific module
  hasModuleAccess(user: any, business: any, moduleId: string): boolean {
    // Check if module is enabled globally
    const module = this.moduleRegistry.getEnabledModules().find(m => m.config.id === moduleId);
    if (!module) {
      return false;
    }

    // Check if business industry matches module
    if (module.config.industry !== business.industry && module.config.industry !== 'ai') {
      return false;
    }

    // Check if business has subscription to this module
    return this.hasActiveSubscription(business.id, moduleId);
  }

  // Build user permissions based on role and enabled modules
  async buildUserPermissions(user: any, business: any, enabledModules: string[]): Promise<string[]> {
    const permissions: string[] = [];

    // Base permissions for all users
    permissions.push('profile:read', 'business:read');

    // Role-based permissions
    switch (user.role) {
      case 'owner':
        permissions.push(
          'business:update', 'business:delete',
          'users:create', 'users:read', 'users:update', 'users:delete',
          'modules:enable', 'modules:disable', 'modules:configure',
          'billing:read', 'billing:update'
        );
        break;
      case 'admin':
        permissions.push(
          'business:update',
          'users:create', 'users:read', 'users:update',
          'modules:configure'
        );
        break;
      case 'manager':
        permissions.push(
          'users:read', 'users:update',
          'bookings:create', 'bookings:read', 'bookings:update'
        );
        break;
      case 'staff':
        permissions.push(
          'bookings:read', 'bookings:update',
          'customers:read'
        );
        break;
      case 'customer':
        permissions.push(
          'bookings:create', 'bookings:read'
        );
        break;
    }

    // Module-specific permissions
    for (const moduleId of enabledModules) {
      const modulePermissions = this.getModulePermissions(moduleId, user.role);
      permissions.push(...modulePermissions);
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  // Get module-specific permissions
  private getModulePermissions(moduleId: string, role: string): string[] {
    const modulePermissionMap: Record<string, Record<string, string[]>> = {
      salon: {
        owner: ['salon:staff:manage', 'salon:services:manage', 'salon:analytics:read'],
        admin: ['salon:staff:read', 'salon:services:manage', 'salon:bookings:manage'],
        manager: ['salon:bookings:manage', 'salon:customers:read'],
        staff: ['salon:bookings:read', 'salon:bookings:update'],
        customer: ['salon:bookings:create', 'salon:services:read']
      },
      restaurant: {
        owner: ['restaurant:tables:manage', 'restaurant:menu:manage', 'restaurant:analytics:read'],
        admin: ['restaurant:tables:read', 'restaurant:menu:manage', 'restaurant:reservations:manage'],
        manager: ['restaurant:reservations:manage', 'restaurant:tables:read'],
        staff: ['restaurant:reservations:read', 'restaurant:reservations:update'],
        customer: ['restaurant:reservations:create', 'restaurant:menu:read']
      },
      realestate: {
        owner: ['realestate:properties:manage', 'realestate:agents:manage', 'realestate:analytics:read'],
        admin: ['realestate:properties:manage', 'realestate:leads:manage'],
        manager: ['realestate:viewings:manage', 'realestate:leads:read'],
        staff: ['realestate:viewings:read', 'realestate:viewings:update'],
        customer: ['realestate:viewings:create', 'realestate:properties:read']
      },
      eventmanagement: {
        owner: ['events:venues:manage', 'events:coordinators:manage', 'events:analytics:read'],
        admin: ['events:venues:read', 'events:bookings:manage'],
        manager: ['events:bookings:manage', 'events:equipment:read'],
        staff: ['events:bookings:read', 'events:bookings:update'],
        customer: ['events:bookings:create', 'events:venues:read']
      },
      retail: {
        owner: ['retail:products:manage', 'retail:shoppers:manage', 'retail:analytics:read'],
        admin: ['retail:products:manage', 'retail:appointments:manage'],
        manager: ['retail:appointments:manage', 'retail:customers:read'],
        staff: ['retail:appointments:read', 'retail:appointments:update'],
        customer: ['retail:appointments:create', 'retail:products:read']
      },
      professionalservices: {
        owner: ['professional:consultants:manage', 'professional:cases:manage', 'professional:analytics:read'],
        admin: ['professional:consultants:read', 'professional:consultations:manage'],
        manager: ['professional:consultations:manage', 'professional:clients:read'],
        staff: ['professional:consultations:read', 'professional:consultations:update'],
        customer: ['professional:consultations:create', 'professional:consultants:read']
      },
      ai: {
        owner: ['ai:config:manage', 'ai:features:manage', 'ai:analytics:read'],
        admin: ['ai:features:manage', 'ai:insights:read'],
        manager: ['ai:insights:read', 'ai:recommendations:read'],
        staff: ['ai:recommendations:read'],
        customer: ['ai:chatbot:use']
      }
    };

    return modulePermissionMap[moduleId]?.[role] || [];
  }

  // Check if user has specific permission
  hasPermission(session: UserSession, permission: string): boolean {
    return session.permissions.includes(permission);
  }

  // Check if business has active subscription to module
  private hasActiveSubscription(businessId: number, moduleId: string): boolean {
    // Mock subscription check - replace with actual subscription logic
    // For now, return true for basic modules, false for premium
    const freeModules = ['salon', 'ai'];
    return freeModules.includes(moduleId);
  }

  // Get module subscriptions for business
  private async getModuleSubscriptions(businessId: number): Promise<Array<{
    moduleId: string;
    status: 'active' | 'suspended' | 'trial';
    expiresAt: Date;
  }>> {
    // Mock subscription data - replace with actual database query
    return [
      {
        moduleId: 'salon',
        status: 'active',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      {
        moduleId: 'ai',
        status: 'trial',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
      }
    ];
  }

  // Get available modules for user
  private async getAvailableModulesForUser(session: UserSession): Promise<Array<{
    moduleId: string;
    name: string;
    isEnabled: boolean;
    hasAccess: boolean;
  }>> {
    const allModules = this.moduleRegistry.getAllModules();
    
    return allModules.map(module => ({
      moduleId: module.config.id,
      name: module.config.name,
      isEnabled: session.enabledModules.includes(module.config.id),
      hasAccess: this.hasModuleAccess(
        { id: session.userId, role: session.role },
        { id: session.businessId, industry: session.industry },
        module.config.id
      )
    }));
  }

  // Middleware for protecting routes based on module access
  requireModuleAccess(moduleId: string) {
    return (req: any, res: any, next: any) => {
      const session = req.session as UserSession;
      
      if (!session) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!session.enabledModules.includes(moduleId)) {
        return res.status(403).json({ 
          error: `Access denied: ${moduleId} module is not enabled for your business`,
          code: 'MODULE_DISABLED',
          moduleId,
          availableModules: session.enabledModules
        });
      }

      next();
    };
  }

  // Middleware for checking specific permissions
  requirePermission(permission: string) {
    return (req: any, res: any, next: any) => {
      const session = req.session as UserSession;
      
      if (!session) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!this.hasPermission(session, permission)) {
        return res.status(403).json({ 
          error: `Permission denied: ${permission} required`,
          code: 'PERMISSION_DENIED',
          required: permission,
          userPermissions: session.permissions
        });
      }

      next();
    };
  }

  // Get user status with module information
  async getUserStatus(userId: number): Promise<{
    user: any;
    business: any;
    moduleStatus: Array<{
      moduleId: string;
      name: string;
      enabled: boolean;
      hasAccess: boolean;
      subscription: {
        status: 'active' | 'suspended' | 'trial' | 'none';
        expiresAt?: Date;
      };
    }>;
    notifications: Array<{
      type: 'warning' | 'info' | 'error';
      message: string;
      moduleId?: string;
    }>;
  }> {
    const user = await this.getUser(userId);
    const business = await this.getUserBusiness(userId);
    
    if (!user || !business) {
      throw new Error('User or business not found');
    }

    const allModules = this.moduleRegistry.getAllModules();
    const moduleSubscriptions = await this.getModuleSubscriptions(business.id);
    
    const moduleStatus = allModules.map(module => {
      const subscription = moduleSubscriptions.find(s => s.moduleId === module.config.id);
      const hasAccess = this.hasModuleAccess(user, business, module.config.id);
      
      return {
        moduleId: module.config.id,
        name: module.config.name,
        enabled: this.moduleRegistry.isModuleEnabled(module.config.id),
        hasAccess,
        subscription: {
          status: subscription?.status || 'none',
          expiresAt: subscription?.expiresAt
        }
      };
    });

    // Generate notifications
    const notifications = this.generateModuleNotifications(moduleStatus);

    return {
      user,
      business,
      moduleStatus,
      notifications
    };
  }

  // Generate notifications about module status
  private generateModuleNotifications(moduleStatus: any[]): Array<{
    type: 'warning' | 'info' | 'error';
    message: string;
    moduleId?: string;
  }> {
    const notifications: Array<{
      type: 'warning' | 'info' | 'error';
      message: string;
      moduleId?: string;
    }> = [];

    moduleStatus.forEach(module => {
      // Trial expiring soon
      if (module.subscription.status === 'trial' && module.subscription.expiresAt) {
        const daysLeft = Math.ceil((module.subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7) {
          notifications.push({
            type: 'warning',
            message: `Your ${module.name} trial expires in ${daysLeft} days`,
            moduleId: module.moduleId
          });
        }
      }

      // Module disabled
      if (!module.enabled && module.hasAccess) {
        notifications.push({
          type: 'info',
          message: `${module.name} module is currently disabled`,
          moduleId: module.moduleId
        });
      }

      // Subscription suspended
      if (module.subscription.status === 'suspended') {
        notifications.push({
          type: 'error',
          message: `${module.name} subscription is suspended`,
          moduleId: module.moduleId
        });
      }
    });

    return notifications;
  }

  // Mock database methods - replace with actual implementations
  private async validateUserCredentials(credentials: { email: string; password: string }): Promise<any> {
    // Mock user validation
    return {
      id: 1,
      email: credentials.email,
      role: 'owner',
      name: 'Test User'
    };
  }

  private async getUser(userId: number): Promise<any> {
    return {
      id: userId,
      email: 'user@example.com',
      role: 'owner',
      name: 'Test User'
    };
  }

  private async getUserBusiness(userId: number): Promise<any> {
    return {
      id: 1,
      name: 'Test Business',
      industry: 'salon' as IndustryType,
      ownerId: userId
    };
  }
}