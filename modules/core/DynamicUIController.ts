import { ModuleRegistry } from './ModuleRegistry.js';
import { IndustryType } from './types.js';
import { UserSession } from './ModuleAwareAuth.js';

export interface UIComponent {
  id: string;
  type: 'navigation' | 'dashboard' | 'form' | 'modal' | 'widget';
  moduleId: string;
  component: string;
  props?: Record<string, any>;
  permissions?: string[];
  position?: {
    section: string;
    order: number;
  };
  responsive?: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
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

export class DynamicUIController {
  private moduleRegistry: ModuleRegistry;

  constructor() {
    this.moduleRegistry = ModuleRegistry.getInstance();
  }

  // Generate navigation menu based on enabled modules and user permissions
  async generateNavigation(session: UserSession): Promise<NavigationItem[]> {
    const navigation: NavigationItem[] = [];

    // Core navigation items (always present)
    navigation.push({
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      path: '/dashboard',
      moduleId: 'core'
    });

    // Module-specific navigation
    for (const moduleId of session.enabledModules) {
      const moduleNav = await this.getModuleNavigation(moduleId, session);
      if (moduleNav.length > 0) {
        navigation.push(...moduleNav);
      }
    }

    // Settings and admin (for appropriate roles)
    if (session.role === 'owner' || session.role === 'admin') {
      navigation.push({
        id: 'settings',
        label: 'Settings',
        icon: '⚙️',
        path: '/settings',
        moduleId: 'core',
        children: [
          {
            id: 'business-profile',
            label: 'Business Profile',
            icon: '🏢',
            path: '/settings/business',
            moduleId: 'core'
          },
          {
            id: 'modules',
            label: 'Modules',
            icon: '🧩',
            path: '/settings/modules',
            moduleId: 'core',
            permissions: ['modules:configure']
          },
          {
            id: 'users',
            label: 'Users & Roles',
            icon: '👥',
            path: '/settings/users',
            moduleId: 'core',
            permissions: ['users:read']
          }
        ]
      });
    }

    return this.filterNavigationByPermissions(navigation, session);
  }

  // Get navigation items for specific module
  private async getModuleNavigation(moduleId: string, session: UserSession): Promise<NavigationItem[]> {
    const moduleNavigation: Record<string, NavigationItem[]> = {
      salon: [
        {
          id: 'salon-bookings',
          label: 'Bookings',
          icon: '📅',
          path: '/salon/bookings',
          moduleId: 'salon',
          permissions: ['salon:bookings:read']
        },
        {
          id: 'salon-staff',
          label: 'Staff',
          icon: '👨‍💼',
          path: '/salon/staff',
          moduleId: 'salon',
          permissions: ['salon:staff:read']
        },
        {
          id: 'salon-services',
          label: 'Services',
          icon: '✂️',
          path: '/salon/services',
          moduleId: 'salon',
          permissions: ['salon:services:read']
        },
        {
          id: 'salon-customers',
          label: 'Customers',
          icon: '👥',
          path: '/salon/customers',
          moduleId: 'salon',
          permissions: ['salon:customers:read']
        }
      ],
      restaurant: [
        {
          id: 'restaurant-reservations',
          label: 'Reservations',
          icon: '🍽️',
          path: '/restaurant/reservations',
          moduleId: 'restaurant',
          permissions: ['restaurant:reservations:read']
        },
        {
          id: 'restaurant-tables',
          label: 'Tables',
          icon: '🪑',
          path: '/restaurant/tables',
          moduleId: 'restaurant',
          permissions: ['restaurant:tables:read']
        },
        {
          id: 'restaurant-menu',
          label: 'Menu',
          icon: '📋',
          path: '/restaurant/menu',
          moduleId: 'restaurant',
          permissions: ['restaurant:menu:read']
        }
      ],
      realestate: [
        {
          id: 'realestate-properties',
          label: 'Properties',
          icon: '🏠',
          path: '/realestate/properties',
          moduleId: 'realestate',
          permissions: ['realestate:properties:read']
        },
        {
          id: 'realestate-viewings',
          label: 'Viewings',
          icon: '👁️',
          path: '/realestate/viewings',
          moduleId: 'realestate',
          permissions: ['realestate:viewings:read']
        },
        {
          id: 'realestate-leads',
          label: 'Leads',
          icon: '🎯',
          path: '/realestate/leads',
          moduleId: 'realestate',
          permissions: ['realestate:leads:read']
        }
      ],
      eventmanagement: [
        {
          id: 'events-bookings',
          label: 'Event Bookings',
          icon: '🎉',
          path: '/events/bookings',
          moduleId: 'eventmanagement',
          permissions: ['events:bookings:read']
        },
        {
          id: 'events-venues',
          label: 'Venues',
          icon: '🏛️',
          path: '/events/venues',
          moduleId: 'eventmanagement',
          permissions: ['events:venues:read']
        },
        {
          id: 'events-coordinators',
          label: 'Coordinators',
          icon: '👨‍💼',
          path: '/events/coordinators',
          moduleId: 'eventmanagement',
          permissions: ['events:coordinators:read']
        }
      ],
      retail: [
        {
          id: 'retail-appointments',
          label: 'Appointments',
          icon: '📅',
          path: '/retail/appointments',
          moduleId: 'retail',
          permissions: ['retail:appointments:read']
        },
        {
          id: 'retail-products',
          label: 'Products',
          icon: '👕',
          path: '/retail/products',
          moduleId: 'retail',
          permissions: ['retail:products:read']
        },
        {
          id: 'retail-customers',
          label: 'Customers',
          icon: '👥',
          path: '/retail/customers',
          moduleId: 'retail',
          permissions: ['retail:customers:read']
        }
      ],
      professionalservices: [
        {
          id: 'professional-consultations',
          label: 'Consultations',
          icon: '⚖️',
          path: '/professional/consultations',
          moduleId: 'professionalservices',
          permissions: ['professional:consultations:read']
        },
        {
          id: 'professional-clients',
          label: 'Clients',
          icon: '👥',
          path: '/professional/clients',
          moduleId: 'professionalservices',
          permissions: ['professional:clients:read']
        },
        {
          id: 'professional-cases',
          label: 'Cases',
          icon: '📁',
          path: '/professional/cases',
          moduleId: 'professionalservices',
          permissions: ['professional:cases:read']
        }
      ],
      ai: [
        {
          id: 'ai-insights',
          label: 'AI Insights',
          icon: '🤖',
          path: '/ai/insights',
          moduleId: 'ai',
          permissions: ['ai:insights:read'],
          badge: {
            type: 'new',
            value: 'NEW',
            color: 'primary'
          }
        },
        {
          id: 'ai-recommendations',
          label: 'Recommendations',
          icon: '💡',
          path: '/ai/recommendations',
          moduleId: 'ai',
          permissions: ['ai:recommendations:read']
        }
      ]
    };

    return moduleNavigation[moduleId] || [];
  }

  // Generate dashboard layout based on enabled modules
  async generateDashboard(session: UserSession): Promise<{
    widgets: DashboardWidget[];
    layout: {
      mobile: DashboardWidget[];
      tablet: DashboardWidget[];
      desktop: DashboardWidget[];
    };
  }> {
    const widgets: DashboardWidget[] = [];

    // Core dashboard widgets
    widgets.push({
      id: 'business-overview',
      title: 'Business Overview',
      moduleId: 'core',
      component: 'BusinessOverviewWidget',
      size: 'medium',
      position: { row: 0, col: 0, width: 6, height: 4 },
      configurable: true
    });

    // Module-specific widgets
    for (const moduleId of session.enabledModules) {
      const moduleWidgets = await this.getModuleWidgets(moduleId, session);
      widgets.push(...moduleWidgets);
    }

    // Generate responsive layouts
    const layout = {
      mobile: this.generateMobileLayout(widgets),
      tablet: this.generateTabletLayout(widgets),
      desktop: this.generateDesktopLayout(widgets)
    };

    return { widgets, layout };
  }

  // Get widgets for specific module
  private async getModuleWidgets(moduleId: string, session: UserSession): Promise<DashboardWidget[]> {
    const moduleWidgets: Record<string, DashboardWidget[]> = {
      salon: [
        {
          id: 'salon-today-bookings',
          title: "Today's Bookings",
          moduleId: 'salon',
          component: 'SalonBookingsWidget',
          size: 'medium',
          position: { row: 0, col: 6, width: 6, height: 4 },
          permissions: ['salon:bookings:read'],
          refreshInterval: 60000,
          configurable: true
        },
        {
          id: 'salon-staff-performance',
          title: 'Staff Performance',
          moduleId: 'salon',
          component: 'SalonStaffWidget',
          size: 'small',
          position: { row: 1, col: 0, width: 4, height: 3 },
          permissions: ['salon:staff:read'],
          configurable: true
        }
      ],
      restaurant: [
        {
          id: 'restaurant-reservations',
          title: "Today's Reservations",
          moduleId: 'restaurant',
          component: 'RestaurantReservationsWidget',
          size: 'medium',
          position: { row: 0, col: 6, width: 6, height: 4 },
          permissions: ['restaurant:reservations:read'],
          refreshInterval: 30000,
          configurable: true
        },
        {
          id: 'restaurant-table-status',
          title: 'Table Status',
          moduleId: 'restaurant',
          component: 'RestaurantTablesWidget',
          size: 'small',
          position: { row: 1, col: 4, width: 4, height: 3 },
          permissions: ['restaurant:tables:read'],
          refreshInterval: 15000,
          configurable: true
        }
      ],
      ai: [
        {
          id: 'ai-recommendations',
          title: 'AI Recommendations',
          moduleId: 'ai',
          component: 'AIRecommendationsWidget',
          size: 'large',
          position: { row: 2, col: 0, width: 8, height: 4 },
          permissions: ['ai:recommendations:read'],
          refreshInterval: 300000,
          configurable: true
        },
        {
          id: 'ai-insights',
          title: 'Business Insights',
          moduleId: 'ai',
          component: 'AIInsightsWidget',
          size: 'small',
          position: { row: 1, col: 8, width: 4, height: 3 },
          permissions: ['ai:insights:read'],
          refreshInterval: 600000,
          configurable: true
        }
      ]
    };

    return moduleWidgets[moduleId] || [];
  }

  // Generate module status notification
  async generateModuleStatusNotification(moduleId: string, status: 'enabled' | 'disabled' | 'error'): Promise<{
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    actions?: Array<{
      label: string;
      action: string;
      variant: 'primary' | 'secondary';
    }>;
  }> {
    const module = this.moduleRegistry.getAllModules().find(m => m.config.id === moduleId);
    const moduleName = module?.config.name || moduleId;

    switch (status) {
      case 'enabled':
        return {
          type: 'success',
          title: 'Module Enabled',
          message: `${moduleName} has been successfully enabled. New features are now available.`,
          actions: [
            {
              label: 'Explore Features',
              action: `navigate:/modules/${moduleId}`,
              variant: 'primary'
            }
          ]
        };

      case 'disabled':
        return {
          type: 'warning',
          title: 'Module Disabled',
          message: `${moduleName} has been disabled. Related features are no longer accessible.`,
          actions: [
            {
              label: 'Enable Module',
              action: `enable:${moduleId}`,
              variant: 'primary'
            }
          ]
        };

      case 'error':
        return {
          type: 'error',
          title: 'Module Error',
          message: `${moduleName} encountered an error and may not function properly.`,
          actions: [
            {
              label: 'Reload Module',
              action: `reload:${moduleId}`,
              variant: 'primary'
            },
            {
              label: 'Contact Support',
              action: 'contact:support',
              variant: 'secondary'
            }
          ]
        };

      default:
        return {
          type: 'info',
          title: 'Module Status',
          message: `${moduleName} status has changed.`
        };
    }
  }

  // Get available UI components for enabled modules
  async getAvailableComponents(session: UserSession): Promise<UIComponent[]> {
    const components: UIComponent[] = [];

    for (const moduleId of session.enabledModules) {
      const moduleComponents = await this.getModuleComponents(moduleId, session);
      components.push(...moduleComponents);
    }

    return this.filterComponentsByPermissions(components, session);
  }

  // Get form fields based on enabled modules and user context
  async getFormFields(formType: string, session: UserSession): Promise<Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    options?: any[];
    validation?: any;
    moduleId?: string;
    showIf?: string;
  }>> {
    const baseFields = this.getBaseFormFields(formType);
    const moduleFields: any[] = [];

    // Add module-specific fields
    for (const moduleId of session.enabledModules) {
      const fields = await this.getModuleFormFields(formType, moduleId, session);
      moduleFields.push(...fields);
    }

    return [...baseFields, ...moduleFields];
  }

  // Filter navigation items by user permissions
  private filterNavigationByPermissions(navigation: NavigationItem[], session: UserSession): NavigationItem[] {
    return navigation.filter(item => {
      if (item.permissions && item.permissions.length > 0) {
        return item.permissions.some(permission => session.permissions.includes(permission));
      }
      return true;
    }).map(item => ({
      ...item,
      children: item.children ? this.filterNavigationByPermissions(item.children, session) : undefined
    }));
  }

  // Filter components by user permissions
  private filterComponentsByPermissions(components: UIComponent[], session: UserSession): UIComponent[] {
    return components.filter(component => {
      if (component.permissions && component.permissions.length > 0) {
        return component.permissions.some(permission => session.permissions.includes(permission));
      }
      return true;
    });
  }

  // Generate responsive layouts
  private generateMobileLayout(widgets: DashboardWidget[]): DashboardWidget[] {
    return widgets.map((widget, index) => ({
      ...widget,
      position: { row: index, col: 0, width: 12, height: widget.size === 'small' ? 3 : 4 }
    }));
  }

  private generateTabletLayout(widgets: DashboardWidget[]): DashboardWidget[] {
    return widgets.map((widget, index) => ({
      ...widget,
      position: { 
        row: Math.floor(index / 2), 
        col: (index % 2) * 6, 
        width: widget.size === 'large' ? 12 : 6, 
        height: widget.size === 'small' ? 3 : 4 
      }
    }));
  }

  private generateDesktopLayout(widgets: DashboardWidget[]): DashboardWidget[] {
    // Keep original desktop positions
    return widgets;
  }

  // Placeholder methods for form fields
  private getBaseFormFields(formType: string): any[] {
    // Return base form fields based on form type
    return [];
  }

  private async getModuleFormFields(formType: string, moduleId: string, session: UserSession): Promise<any[]> {
    // Return module-specific form fields
    return [];
  }

  private async getModuleComponents(moduleId: string, session: UserSession): Promise<UIComponent[]> {
    // Return module-specific UI components
    return [];
  }
}