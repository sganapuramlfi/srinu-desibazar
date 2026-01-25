import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  Zap,
  Eye,
  Phone,
  Mail,
  Calendar,
  PieChart,
  RefreshCw
} from 'lucide-react';

interface BusinessAlertsTabProps {
  businessId: number;
}

interface AlertDashboard {
  timeRange: string;
  activeCommunications: Communication[];
  stats: {
    totalActive: number;
    highPriority: number;
    needsResponse: number;
    constraintViolations: Array<{ violationType: string; count: number }>;
    aiSuggestions: {
      totalSuggestions: number;
      acceptedSuggestions: number;
      avgConfidence: number;
      totalRevenue: number;
    };
    responseMetrics: {
      avgResponseTime: number;
      unrespondedCount: number;
      totalCommunications: number;
    };
  };
  recentFailures: Array<{
    id: number;
    operationType: string;
    constraintViolations: any;
    createdAt: string;
    operationData: any;
  }>;
  lastUpdated: string;
}

interface Communication {
  id: number;
  threadId: string;
  subject: string;
  communicationType: string;
  priority: number;
  status: string;
  customerName: string;
  customerPhone?: string;
  createdAt: string;
  businessRespondedAt?: string;
  constraintViolations: any[];
  aiResolutionAttempted: boolean;
}

interface UrgentAlerts {
  urgentAlerts: Array<Communication & { minutesSinceCreated: number }>;
  count: number;
  criticalCount: number;
}

const BusinessAlertsTab: React.FC<BusinessAlertsTabProps> = ({ businessId }) => {
  const [dashboard, setDashboard] = useState<AlertDashboard | null>(null);
  const [urgentAlerts, setUrgentAlerts] = useState<UrgentAlerts | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  const fetchDashboard = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const [dashboardRes, urgentRes] = await Promise.all([
        fetch(`/api/businesses/${businessId}/alerts/dashboard?timeRange=${timeRange}`, {
          credentials: 'include',
          signal: controller.signal
        }),
        fetch(`/api/businesses/${businessId}/alerts/urgent`, {
          credentials: 'include',
          signal: controller.signal
        })
      ]);
      
      clearTimeout(timeoutId);

      if (dashboardRes.ok && urgentRes.ok) {
        const dashboardData = await dashboardRes.json();
        const urgentData = await urgentRes.json();
        
        if (isMounted) {
          setDashboard(dashboardData);
          setUrgentAlerts(urgentData);
        }
      } else {
        console.error('API Error:', {
          dashboard: { status: dashboardRes.status, statusText: dashboardRes.statusText },
          urgent: { status: urgentRes.status, statusText: urgentRes.statusText }
        });
        // Set empty data so component doesn't hang
        setDashboard({
          timeRange,
          activeCommunications: [],
          stats: {
            totalActive: 0,
            highPriority: 0,
            needsResponse: 0,
            constraintViolations: [],
            aiSuggestions: {
              totalSuggestions: 0,
              acceptedSuggestions: 0,
              avgConfidence: 0,
              totalRevenue: 0
            },
            responseMetrics: {
              avgResponseTime: 0,
              unrespondedCount: 0,
              totalCommunications: 0
            }
          },
          recentFailures: [],
          lastUpdated: new Date().toISOString()
        });
        if (isMounted) {
          setUrgentAlerts({ urgentAlerts: [], count: 0, criticalCount: 0 });
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error fetching alerts dashboard:', error);
      // Set empty data to prevent hanging
      if (isMounted) {
        setDashboard({
        timeRange,
        activeCommunications: [],
        stats: {
          totalActive: 0,
          highPriority: 0,
          needsResponse: 0,
          constraintViolations: [],
          aiSuggestions: {
            totalSuggestions: 0,
            acceptedSuggestions: 0,
            avgConfidence: 0,
            totalRevenue: 0
          },
          responseMetrics: {
            avgResponseTime: 0,
            unrespondedCount: 0,
            totalCommunications: 0
          }
        },
        recentFailures: [],
        lastUpdated: new Date().toISOString()
      });
        setUrgentAlerts({ urgentAlerts: [], count: 0, criticalCount: 0 });
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const acknowledgeAlert = async (communicationId: number) => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/alerts/${communicationId}/acknowledge`, {
        method: 'POST'
      });

      if (response.ok) {
        // Refresh dashboard
        await fetchDashboard();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const bulkAcknowledge = async (communicationIds: number[]) => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/alerts/bulk-acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communicationIds })
      });

      if (response.ok) {
        await fetchDashboard();
      }
    } catch (error) {
      console.error('Error bulk acknowledging alerts:', error);
    }
  };

  const snoozeAlert = async (communicationId: number, minutes: number) => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/alerts/${communicationId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes })
      });

      if (response.ok) {
        await fetchDashboard();
      }
    } catch (error) {
      console.error('Error snoozing alert:', error);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [businessId, timeRange]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, 60000); // Refresh every 60 seconds (less aggressive)
      return () => clearInterval(interval);
    }
  }, [autoRefresh, businessId, timeRange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'destructive';
      case 2: return 'default';
      case 3: return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Critical';
      case 2: return 'High';
      case 3: return 'Medium';
      default: return 'Low';
    }
  };

  const getCommunicationTypeIcon = (type: string) => {
    switch (type) {
      case 'large_party': return <Users className="h-4 w-4" />;
      case 'off_hours_request': return <Clock className="h-4 w-4" />;
      case 'capacity_issue': return <AlertTriangle className="h-4 w-4" />;
      case 'constraint_violation': return <XCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading alerts dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Business Alerts</h2>
          <p className="text-muted-foreground">
            Monitor constraint violations, customer communications, and revenue opportunities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button size="sm" onClick={fetchDashboard}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Urgent Alerts Banner */}
      {urgentAlerts && urgentAlerts.count > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{urgentAlerts.count} urgent alerts</strong> need your immediate attention.
            {urgentAlerts.criticalCount > 0 && (
              <span className="ml-2 font-semibold">
                {urgentAlerts.criticalCount} are critical priority.
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => {
                const urgentIds = urgentAlerts.urgentAlerts.map(a => a.id);
                bulkAcknowledge(urgentIds);
              }}
            >
              Acknowledge All
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      {dashboard && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Communications</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.stats.totalActive}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.stats.needsResponse} need response
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dashboard.stats.highPriority}</div>
              <p className="text-xs text-muted-foreground">
                Critical & urgent issues
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Suggestions</CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.stats.aiSuggestions.totalSuggestions}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.stats.aiSuggestions.acceptedSuggestions} accepted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(dashboard.stats.responseMetrics.avgResponseTime || 0)}m
              </div>
              <p className="text-xs text-muted-foreground">
                Average response time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Alerts</TabsTrigger>
          <TabsTrigger value="urgent">Urgent</TabsTrigger>
          <TabsTrigger value="violations">Constraint Violations</TabsTrigger>
          <TabsTrigger value="ai">AI Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {dashboard?.activeCommunications.map((comm) => (
            <Card key={comm.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getCommunicationTypeIcon(comm.communicationType)}
                    <CardTitle className="text-lg">{comm.subject}</CardTitle>
                    <Badge variant={getPriorityColor(comm.priority)}>
                      {getPriorityLabel(comm.priority)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {formatTimeAgo(comm.createdAt)}
                    </span>
                    {!comm.businessRespondedAt && (
                      <Button size="sm" onClick={() => acknowledgeAlert(comm.id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {comm.customerName}
                    </span>
                    {comm.customerPhone && (
                      <span className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {comm.customerPhone}
                      </span>
                    )}
                    <Badge variant="outline">
                      {comm.communicationType.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comm.constraintViolations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Constraint Violations:</h4>
                    {comm.constraintViolations.map((violation: any, idx: number) => (
                      <div key={idx} className="bg-red-50 p-3 rounded border border-red-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-red-800">{violation.message}</span>
                          <Badge variant="destructive">{violation.constraintName}</Badge>
                        </div>
                        {violation.suggestedAction && (
                          <p className="text-sm text-red-600 mt-1">
                            💡 {violation.suggestedAction}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {comm.aiResolutionAttempted && (
                  <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="flex items-center text-blue-800">
                      <Zap className="h-4 w-4 mr-2" />
                      <span className="font-medium">AI suggestions generated</span>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      AbrakadabraAI has created personalized suggestions for this customer.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Thread
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      View AI Suggestions
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => snoozeAlert(comm.id, 60)}
                    >
                      Snooze 1h
                    </Button>
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Customer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="urgent" className="space-y-4">
          {urgentAlerts?.urgentAlerts.map((alert) => (
            <Card key={alert.id} className="border-red-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-lg text-red-800">{alert.subject}</CardTitle>
                    <Badge variant="destructive">
                      {getPriorityLabel(alert.priority)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {Math.round(alert.minutesSinceCreated)}m
                    </div>
                    <div className="text-xs text-muted-foreground">unresponded</div>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {alert.customerName}
                    </span>
                    {alert.customerPhone && (
                      <span className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {alert.customerPhone}
                      </span>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={() => acknowledgeAlert(alert.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Acknowledge
                  </Button>
                  <Button size="sm" variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Respond Now
                  </Button>
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Customer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          {dashboard && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Constraint Violations</CardTitle>
                  <CardDescription>Most common booking issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboard.stats.constraintViolations.map((violation, idx) => (
                      <div key={violation.violationType} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            idx === 0 ? 'bg-red-500' : 
                            idx === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                          }`} />
                          <span className="capitalize">
                            {violation.violationType?.replace('_', ' ') || 'Unknown'}
                          </span>
                        </div>
                        <Badge variant="outline">{violation.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Booking Failures</CardTitle>
                  <CardDescription>Failed booking attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboard.recentFailures.slice(0, 5).map((failure) => (
                      <div key={failure.id} className="flex items-center justify-between text-sm">
                        <span>{formatTimeAgo(failure.createdAt)}</span>
                        <Badge variant="outline" className="text-xs">
                          {failure.operationType}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {dashboard && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-blue-500" />
                    AI Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <span className="text-2xl font-bold">
                        {dashboard.stats.aiSuggestions.totalSuggestions}
                      </span>
                      <p className="text-xs text-muted-foreground">Suggestions generated</p>
                    </div>
                    <div>
                      <span className="text-lg font-semibold text-green-600">
                        {Math.round((dashboard.stats.aiSuggestions.acceptedSuggestions / 
                          Math.max(dashboard.stats.aiSuggestions.totalSuggestions, 1)) * 100)}%
                      </span>
                      <p className="text-xs text-muted-foreground">Acceptance rate</p>
                    </div>
                    <div>
                      <span className="text-lg font-semibold">
                        {Math.round((dashboard.stats.aiSuggestions.avgConfidence || 0) * 100)}%
                      </span>
                      <p className="text-xs text-muted-foreground">Avg confidence</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue Impact</CardTitle>
                  <CardDescription>AI-powered revenue recovery</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-8">
                    <div>
                      <span className="text-3xl font-bold text-green-600">
                        ${dashboard.stats.aiSuggestions.totalRevenue || 0}
                      </span>
                      <p className="text-sm text-muted-foreground">Revenue recovered</p>
                    </div>
                    <div>
                      <span className="text-xl font-semibold">
                        {dashboard.stats.aiSuggestions.acceptedSuggestions}
                      </span>
                      <p className="text-sm text-muted-foreground">Successful interventions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessAlertsTab;