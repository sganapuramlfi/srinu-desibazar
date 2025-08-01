import React, { useState, useEffect } from 'react';
import { useModularAuth } from './ModularAuthProvider';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { useToast } from '../hooks/use-toast';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Info, 
  Star,
  ExternalLink,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ModuleNotification {
  type: 'warning' | 'info' | 'error' | 'success';
  message: string;
  moduleId?: string;
  actions?: Array<{
    label: string;
    action: string;
    variant: 'primary' | 'secondary';
  }>;
}

interface ModuleStatus {
  moduleId: string;
  name: string;
  enabled: boolean;
  hasAccess: boolean;
  subscription: {
    status: 'active' | 'suspended' | 'trial' | 'none';
    expiresAt?: Date;
  };
}

export function ModuleStatusNotifications({ className }: { className?: string }) {
  const { session, availableModules, refreshSession } = useModularAuth();
  const [notifications, setNotifications] = useState<ModuleNotification[]>([]);
  const [moduleStatuses, setModuleStatuses] = useState<ModuleStatus[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    // Only load for authenticated business users, NOT for public users
    if (session && (session.role === 'owner' || session.role === 'admin' || session.role === 'manager')) {
      loadUserStatus();
    }
  }, [session]);

  const loadUserStatus = async () => {
    try {
      const response = await fetch('/api/modular/auth/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setModuleStatuses(data.moduleStatus || []);
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load user status:', error);
    }
  };

  const handleNotificationAction = async (action: string, moduleId?: string) => {
    try {
      if (action.startsWith('navigate:')) {
        const path = action.replace('navigate:', '');
        window.location.href = path;
        return;
      }

      if (action.startsWith('enable:')) {
        const moduleToEnable = action.replace('enable:', '');
        await toggleModule(moduleToEnable, true);
        return;
      }

      if (action.startsWith('reload:')) {
        const moduleToReload = action.replace('reload:', '');
        await refreshSession();
        toast({
          title: "Module Reloaded",
          description: `${moduleToReload} has been reloaded`,
        });
        return;
      }

      if (action === 'contact:support') {
        // Open support modal or navigate to support page
        toast({
          title: "Support",
          description: "Support contact feature would be implemented here",
        });
        return;
      }

      toast({
        title: "Action",
        description: `Action "${action}" would be implemented`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute action",
        variant: "destructive"
      });
    }
  };

  const toggleModule = async (moduleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/modular/modules/${moduleId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        await refreshSession();
        await loadUserStatus();
        toast({
          title: enabled ? "Module Enabled" : "Module Disabled",
          description: `${moduleId} has been ${enabled ? 'enabled' : 'disabled'}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || 'Failed to toggle module',
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle module",
        variant: "destructive"
      });
    }
  };

  const dismissNotification = (notificationIndex: number) => {
    setDismissedNotifications(prev => new Set(prev).add(notificationIndex.toString()));
  };

  const getNotificationIcon = (type: ModuleNotification['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'info':
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'trial':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      case 'none':
      default:
        return 'outline';
    }
  };

  const getDaysUntilExpiry = (expiresAt?: Date) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Only show notifications for business users, not public users or customers
  if (!session || (session.role !== 'owner' && session.role !== 'admin' && session.role !== 'manager')) {
    return null;
  }

  const visibleNotifications = notifications.filter((_, index) => 
    !dismissedNotifications.has(index.toString())
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Active Notifications */}
      {visibleNotifications.length > 0 && (
        <div className="space-y-2">
          {visibleNotifications.map((notification, index) => (
            <Alert 
              key={index}
              variant={notification.type === 'error' ? 'destructive' : 'default'}
              className="relative"
            >
              {getNotificationIcon(notification.type)}
              <AlertDescription className="flex items-center justify-between">
                <span>{notification.message}</span>
                <div className="flex items-center space-x-2 ml-4">
                  {notification.actions?.map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      size="sm"
                      variant={action.variant === 'primary' ? 'default' : 'outline'}
                      onClick={() => handleNotificationAction(action.action, notification.moduleId)}
                    >
                      {action.label}
                      {action.action.startsWith('navigate:') && (
                        <ExternalLink className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissNotification(index)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Module Status Overview */}
      {moduleStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Module Status</span>
              <Badge variant="outline">
                {moduleStatuses.filter(m => m.enabled && m.hasAccess).length} active
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid gap-3">
              {moduleStatuses.map(module => {
                const daysUntilExpiry = getDaysUntilExpiry(module.subscription.expiresAt);
                const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
                
                return (
                  <div 
                    key={module.moduleId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        module.enabled && module.hasAccess ? "bg-green-500" : "bg-gray-300"
                      )} />
                      
                      <div>
                        <div className="font-medium">{module.name}</div>
                        <div className="text-sm text-gray-500">
                          {module.enabled ? 'Enabled' : 'Disabled'} • 
                          {module.hasAccess ? ' Has Access' : ' No Access'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Subscription Status */}
                      <Badge variant={getStatusBadgeVariant(module.subscription.status)}>
                        {module.subscription.status}
                      </Badge>

                      {/* Expiry Warning */}
                      {isExpiringSoon && (
                        <Badge variant="destructive" className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{daysUntilExpiry}d left</span>
                        </Badge>
                      )}

                      {/* Trial Progress */}
                      {module.subscription.status === 'trial' && daysUntilExpiry !== null && (
                        <div className="w-20">
                          <Progress 
                            value={Math.max(0, (daysUntilExpiry / 30) * 100)}
                            className="h-2"
                          />
                        </div>
                      )}

                      {/* Quick Actions */}
                      {session.role === 'owner' && (
                        <Button
                          size="sm"
                          variant={module.enabled ? "outline" : "default"}
                          onClick={() => toggleModule(module.moduleId, !module.enabled)}
                        >
                          {module.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Recommendations */}
      {availableModules.some(m => !m.isEnabled && m.hasAccess) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Recommended Modules</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {availableModules
                .filter(m => !m.isEnabled && m.hasAccess)
                .slice(0, 3)
                .map(module => (
                <div 
                  key={module.moduleId}
                  className="flex items-center justify-between p-3 border rounded-lg bg-blue-50"
                >
                  <div>
                    <div className="font-medium">{module.name}</div>
                    <div className="text-sm text-gray-600">
                      Enhance your business with additional features
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => toggleModule(module.moduleId, true)}
                  >
                    Enable
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}