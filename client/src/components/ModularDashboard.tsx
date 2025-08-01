import React, { useState, useEffect } from 'react';
import { useModularAuth, DashboardWidget } from './ModularAuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { Settings, Refresh, X, Plus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface ModularDashboardProps {
  className?: string;
}

export function ModularDashboard({ className }: ModularDashboardProps) {
  const { dashboard, session, loading, refreshSession } = useModularAuth();
  const [refreshingWidgets, setRefreshingWidgets] = useState<Set<string>>(new Set());
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    // Set up auto-refresh for widgets with refresh intervals
    const refreshIntervals: { [key: string]: NodeJS.Timeout } = {};

    dashboard?.widgets.forEach(widget => {
      if (widget.refreshInterval && !hiddenWidgets.has(widget.id)) {
        refreshIntervals[widget.id] = setInterval(() => {
          refreshWidget(widget.id);
        }, widget.refreshInterval);
      }
    });

    return () => {
      Object.values(refreshIntervals).forEach(interval => clearInterval(interval));
    };
  }, [dashboard?.widgets, hiddenWidgets]);

  const refreshWidget = async (widgetId: string) => {
    setRefreshingWidgets(prev => new Set(prev).add(widgetId));
    
    // Simulate widget refresh - in real implementation, this would call widget-specific API
    setTimeout(() => {
      setRefreshingWidgets(prev => {
        const newSet = new Set(prev);
        newSet.delete(widgetId);
        return newSet;
      });
    }, 1000);
  };

  const hideWidget = (widgetId: string) => {
    setHiddenWidgets(prev => new Set(prev).add(widgetId));
    toast({
      title: "Widget Hidden",
      description: "You can restore it from dashboard settings",
    });
  };

  const getResponsiveLayout = () => {
    if (!dashboard) return [];
    
    // Use mobile layout on small screens, tablet on medium, desktop on large
    if (window.innerWidth < 768) {
      return dashboard.layout.mobile;
    } else if (window.innerWidth < 1024) {
      return dashboard.layout.tablet;
    } else {
      return dashboard.layout.desktop;
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (hiddenWidgets.has(widget.id)) return null;

    const isRefreshing = refreshingWidgets.has(widget.id);

    return (
      <Card
        key={widget.id}
        className={cn(
          "relative transition-all duration-200",
          widget.size === 'small' && "min-h-[200px]",
          widget.size === 'medium' && "min-h-[300px]",
          widget.size === 'large' && "min-h-[400px]",
          widget.size === 'full' && "min-h-[500px]",
          isRefreshing && "opacity-75"
        )}
        style={{
          gridColumn: `span ${widget.position.width}`,
          gridRow: `span ${widget.position.height}`
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            <span>{widget.title}</span>
            <Badge variant="outline" className="text-xs">
              {widget.moduleId}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center space-x-1">
            {widget.refreshInterval && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshWidget(widget.id)}
                disabled={isRefreshing}
                className="h-6 w-6 p-0"
              >
                <Refresh className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              </Button>
            )}
            
            {widget.configurable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  toast({
                    title: "Widget Configuration",
                    description: "Configuration modal would open here",
                  });
                }}
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => hideWidget(widget.id)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <WidgetContent widget={widget} isRefreshing={isRefreshing} />
        </CardContent>
      </Card>
    );
  };

  if (loading || !session) {
    return <ModularDashboardSkeleton className={className} />;
  }

  if (!dashboard || dashboard.widgets.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <div className="text-gray-400 mb-4">
          <Plus className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-gray-900">No Dashboard Widgets</h3>
          <p className="text-sm text-gray-500">
            Enable modules to see relevant dashboard widgets
          </p>
        </div>
        
        <Button onClick={refreshSession} variant="outline">
          Refresh Dashboard
        </Button>
      </div>
    );
  }

  const visibleWidgets = dashboard.widgets.filter(w => !hiddenWidgets.has(w.id));
  const responsiveLayout = getResponsiveLayout();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">
            Welcome back! Here's what's happening with your business.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {session.enabledModules.length} modules active
          </Badge>
          <Button onClick={refreshSession} variant="outline" size="sm">
            <Refresh className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Responsive Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
        {responsiveLayout.map(widget => renderWidget(widget))}
      </div>

      {/* Hidden Widgets Notice */}
      {hiddenWidgets.size > 0 && (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            {hiddenWidgets.size} widget(s) hidden. 
            <Button variant="link" className="p-0 ml-1 h-auto text-sm">
              Restore from settings
            </Button>
          </p>
        </div>
      )}
    </div>
  );
}

// Widget Content Component - renders different content based on widget type
function WidgetContent({ widget, isRefreshing }: { widget: DashboardWidget; isRefreshing: boolean }) {
  // This would be replaced with actual widget implementations
  const getWidgetContent = () => {
    switch (widget.component) {
      case 'BusinessOverviewWidget':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">156</div>
                <div className="text-xs text-gray-500">Total Bookings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">$12,340</div>
                <div className="text-xs text-gray-500">Revenue</div>
              </div>
            </div>
          </div>
        );
        
      case 'SalonBookingsWidget':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium">Today's Appointments</div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between text-sm">
                  <span>Client {i}</span>
                  <span className="text-gray-500">{9 + i}:00 AM</span>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'RestaurantReservationsWidget':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium">Today's Reservations</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Lunch: 12</div>
              <div>Dinner: 18</div>
            </div>
          </div>
        );
        
      case 'AIRecommendationsWidget':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium">AI Insights</div>
            <div className="text-xs text-gray-600">
              📈 Peak hours: 2-4 PM<br/>
              💡 Suggest staff break at 1 PM<br/>
              🎯 Promote services during slow periods
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="text-center">
              <div className="text-lg font-medium">{widget.component}</div>
              <div className="text-xs">Widget implementation pending</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn("transition-opacity", isRefreshing && "opacity-50")}>
      {getWidgetContent()}
    </div>
  );
}

export function ModularDashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 animate-pulse", className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-64" />
        </div>
        <div className="flex space-x-2">
          <div className="h-8 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-20" />
        </div>
      </div>

      {/* Widget grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="min-h-[200px]">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}