import React from 'react';
import { Link, useLocation } from 'wouter';
import { useModularAuth, NavigationItem } from './ModularAuthProvider';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ModularNavigationProps {
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

export function ModularNavigation({ className, orientation = 'vertical' }: ModularNavigationProps) {
  const { navigation, session, loading } = useModularAuth();
  const location = useLocation();

  if (loading || !session) {
    return (
      <nav className={cn("animate-pulse", className)}>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
      </nav>
    );
  }

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    const isActive = location.pathname === item.path || 
                    (item.children && item.children.some(child => location.pathname === child.path));
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className={cn("w-full", depth > 0 && "ml-4")}>
        {hasChildren ? (
          <Collapsible defaultOpen={isActive}>
            <CollapsibleTrigger className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-left rounded-md hover:bg-gray-100 transition-colors",
              isActive && "bg-blue-50 text-blue-700 font-medium",
              "group"
            )}>
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant={item.badge.color === 'primary' ? 'default' : 'secondary'}
                    className={cn(
                      "text-xs",
                      item.badge.color === 'success' && "bg-green-100 text-green-700",
                      item.badge.color === 'warning' && "bg-yellow-100 text-yellow-700",
                      item.badge.color === 'error' && "bg-red-100 text-red-700"
                    )}
                  >
                    {item.badge.value}
                  </Badge>
                )}
              </div>
              <ChevronRight className="h-4 w-4 group-data-[state=open]:rotate-90 transition-transform" />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-1 mt-1">
              {item.children.map(child => renderNavigationItem(child, depth + 1))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Link
            to={item.path}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors",
              isActive && "bg-blue-50 text-blue-700 font-medium"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge 
                variant={item.badge.color === 'primary' ? 'default' : 'secondary'}
                className={cn(
                  "text-xs",
                  item.badge.color === 'success' && "bg-green-100 text-green-700",
                  item.badge.color === 'warning' && "bg-yellow-100 text-yellow-700",
                  item.badge.color === 'error' && "bg-red-100 text-red-700"
                )}
              >
                {item.badge.value}
              </Badge>
            )}
          </Link>
        )}
      </div>
    );
  };

  if (orientation === 'horizontal') {
    return (
      <nav className={cn("flex space-x-1", className)}>
        {navigation.map(item => (
          <Link
            key={item.id}
            to={item.path}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap",
              location.pathname === item.path && "bg-blue-50 text-blue-700 font-medium"
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge.value}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn("space-y-1", className)}>
      {navigation.map(item => renderNavigationItem(item))}
    </nav>
  );
}

export function ModularNavigationSkeleton({ className }: { className?: string }) {
  return (
    <nav className={cn("space-y-2 animate-pulse", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-3 px-3 py-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded flex-1" />
        </div>
      ))}
    </nav>
  );
}