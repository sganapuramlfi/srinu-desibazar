import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  Activity, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Mail,
  Send,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  industry: string;
  enabled: boolean;
  features: string[];
  dependencies: string[];
}

interface ModuleStatus {
  total: number;
  enabled: number;
  disabled: number;
  modules: ModuleInfo[];
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  hasCredentials: boolean;
  isConnected: boolean;
}

interface EmailDevSettings {
  enableOtpVerification: boolean;
  skipEmailSending: boolean;
  mockOtp: string;
}

export function ModuleAdminPanel() {
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus | null>(null);
  const [moduleHealth, setModuleHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  
  // Email configuration state
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [emailDevSettings, setEmailDevSettings] = useState<EmailDevSettings | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Email form state
  const [smtpForm, setSmtpForm] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'DesiBazaar Platform',
    secure: false
  });

  useEffect(() => {
    loadModuleData();
    loadEmailConfig();
  }, []);

  const loadModuleData = async () => {
    try {
      setLoading(true);
      
      const [statusResponse, healthResponse] = await Promise.all([
        fetch('/api/admin/modules/status'),
        fetch('/api/admin/modules/health')
      ]);

      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setModuleStatus(status);
      }

      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setModuleHealth(health);
      }
    } catch (error) {
      console.error('Failed to load module data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (moduleId: string, enabled: boolean) => {
    try {
      setToggling(moduleId);
      
      const response = await fetch(`/api/admin/modules/${moduleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        await loadModuleData(); // Refresh data
      } else {
        throw new Error('Failed to toggle module');
      }
    } catch (error) {
      console.error('Failed to toggle module:', error);
    } finally {
      setToggling(null);
    }
  };

  // Email configuration functions
  const loadEmailConfig = async () => {
    try {
      setEmailLoading(true);
      
      const response = await fetch('/api/admin/email/config', {
        headers: {
          'Authorization': 'Basic ' + btoa('admin:admin123')
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmailConfig(data.data.config);
        setEmailDevSettings(data.data.developmentSettings);
        
        // Update form with current config
        setSmtpForm({
          smtpHost: data.data.config.smtpHost,
          smtpPort: data.data.config.smtpPort,
          smtpUser: '', // Don't populate sensitive fields
          smtpPassword: '',
          fromEmail: data.data.config.fromEmail,
          fromName: data.data.config.fromName,
          secure: data.data.config.secure
        });
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
      setEmailMessage({ type: 'error', text: 'Failed to load email configuration' });
    } finally {
      setEmailLoading(false);
    }
  };

  const saveEmailConfig = async () => {
    try {
      setEmailSaving(true);
      setEmailMessage(null);
      
      const response = await fetch('/api/admin/email/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('admin:admin123')
        },
        body: JSON.stringify(smtpForm)
      });

      if (response.ok) {
        const data = await response.json();
        setEmailConfig(data.data);
        setEmailMessage({ type: 'success', text: 'Email configuration saved successfully' });
        setTimeout(() => setEmailMessage(null), 3000);
      } else {
        const error = await response.json();
        setEmailMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
      }
    } catch (error) {
      setEmailMessage({ type: 'error', text: 'Failed to save email configuration' });
    } finally {
      setEmailSaving(false);
    }
  };

  const testEmailConfig = async () => {
    try {
      setEmailLoading(true);
      setEmailMessage(null);
      
      const testEmail = prompt('Enter test email address:');
      if (!testEmail) return;
      
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('admin:admin123')
        },
        body: JSON.stringify({ testEmail })
      });

      const data = await response.json();
      if (data.success) {
        setEmailMessage({ type: 'success', text: `Test email sent successfully (${data.data.mode})` });
      } else {
        setEmailMessage({ type: 'error', text: data.message || 'Test email failed' });
      }
    } catch (error) {
      setEmailMessage({ type: 'error', text: 'Failed to send test email' });
    } finally {
      setEmailLoading(false);
    }
  };

  const toggleOtpVerification = async (enabled: boolean) => {
    try {
      setEmailLoading(true);
      
      const response = await fetch('/api/admin/email/dev/toggle-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('admin:admin123')
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        const data = await response.json();
        setEmailDevSettings(data.data.settings);
        setEmailMessage({ 
          type: 'success', 
          text: `OTP verification ${enabled ? 'enabled' : 'disabled'}` 
        });
        setTimeout(() => setEmailMessage(null), 3000);
      }
    } catch (error) {
      setEmailMessage({ type: 'error', text: 'Failed to toggle OTP verification' });
    } finally {
      setEmailLoading(false);
    }
  };

  if (loading && !moduleStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading modules...</span>
      </div>
    );
  }

  const getIndustryColor = (industry: string) => {
    const colors = {
      salon: 'bg-pink-100 text-pink-800',
      restaurant: 'bg-orange-100 text-orange-800',
      realestate: 'bg-blue-100 text-blue-800',
      event: 'bg-purple-100 text-purple-800',
      retail: 'bg-green-100 text-green-800',
      professional: 'bg-gray-100 text-gray-800'
    };
    return colors[industry as keyof typeof colors] || colors.professional;
  };

  const getHealthStatus = (moduleId: string) => {
    if (!moduleHealth?.modules?.[moduleId]) return null;
    const health = moduleHealth.modules[moduleId];
    
    if (health.status === 'healthy') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (health.status === 'unhealthy') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Module Management</h1>
          <p className="text-gray-600">Manage pluggable industry modules</p>
        </div>
        <Button onClick={loadModuleData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {moduleStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moduleStatus.total}</div>
              <p className="text-xs text-muted-foreground">
                Available industry modules
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enabled Modules</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{moduleStatus.enabled}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`text-2xl font-bold ${
                  moduleHealth?.status === 'healthy' ? 'text-green-600' : 
                  moduleHealth?.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {moduleHealth?.status === 'healthy' ? '✓' : 
                   moduleHealth?.status === 'degraded' ? '⚠' : '✗'}
                </div>
                <span className="capitalize">{moduleHealth?.status || 'Unknown'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Module Management Tabs */}
      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
          <TabsTrigger value="email">Email Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          <div className="grid gap-4">
            {moduleStatus?.modules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {module.name}
                          {getHealthStatus(module.id)}
                          <Badge className={getIndustryColor(module.industry)}>
                            {module.industry}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          Module ID: {module.id} • Version: {module.version}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={module.enabled}
                        onCheckedChange={(enabled) => toggleModule(module.id, enabled)}
                        disabled={toggling === module.id}
                      />
                      {toggling === module.id && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Features */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Features</h4>
                      <div className="flex flex-wrap gap-1">
                        {module.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Dependencies */}
                    {module.dependencies.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Dependencies</h4>
                        <div className="flex flex-wrap gap-1">
                          {module.dependencies.map((dep) => (
                            <Badge key={dep} variant="secondary" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Health Info */}
                    {moduleHealth?.modules?.[module.id] && (
                      <div className="text-xs text-gray-500 grid grid-cols-3 gap-2">
                        <span>Routes: {moduleHealth.modules[module.id].routes || 0}</span>
                        <span>Endpoints: {moduleHealth.modules[module.id].endpoints || 0}</span>
                        <span>Features: {moduleHealth.modules[module.id].features || 0}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>System Health Check</CardTitle>
            </CardHeader>
            <CardContent>
              {moduleHealth ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Overall Status:</span>
                    <Badge className={
                      moduleHealth.status === 'healthy' ? 'bg-green-100 text-green-800' :
                      moduleHealth.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {moduleHealth.status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Last checked: {new Date(moduleHealth.timestamp).toLocaleString()}
                  </div>

                  <div className="grid gap-3">
                    {Object.entries(moduleHealth.modules).map(([moduleId, health]: [string, any]) => (
                      <div key={moduleId} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-2">
                          {health.status === 'healthy' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium">{moduleId}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {health.status === 'healthy' ? (
                            `${health.features} features, ${health.routes} routes, ${health.endpoints} endpoints`
                          ) : (
                            health.error
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>No health data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <div className="space-y-6">
            {/* Alert messages */}
            {emailMessage && (
              <Alert className={emailMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription className={emailMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {emailMessage.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Development Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Development Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">OTP Verification</Label>
                    <p className="text-sm text-gray-600">
                      Enable/disable OTP verification for testing. When disabled, email verification is automatic.
                    </p>
                  </div>
                  <Switch
                    checked={emailDevSettings?.enableOtpVerification || false}
                    onCheckedChange={toggleOtpVerification}
                    disabled={emailLoading}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-sm text-gray-600">Mock OTP</Label>
                    <p className="text-lg font-mono">{emailDevSettings?.mockOtp || '12345678'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Skip Email Sending</Label>
                    <p className="text-sm">{emailDevSettings?.skipEmailSending ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SMTP Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  SMTP Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Connection Status</p>
                    <p className="text-sm text-gray-600">
                      {emailConfig?.isConnected ? 'Connected' : 'Not Connected'} • 
                      {emailConfig?.hasCredentials ? ' Has Credentials' : ' No Credentials'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {emailConfig?.isConnected ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <Button onClick={testEmailConfig} size="sm" disabled={emailLoading}>
                      <Send className="w-4 h-4 mr-2" />
                      Test Email
                    </Button>
                  </div>
                </div>

                {/* SMTP Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={smtpForm.smtpHost}
                      onChange={(e) => setSmtpForm(prev => ({ ...prev, smtpHost: e.target.value }))}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={smtpForm.smtpPort}
                      onChange={(e) => setSmtpForm(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                      placeholder="587"
                    />
                  </div>

                  <div>
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={smtpForm.smtpUser}
                      onChange={(e) => setSmtpForm(prev => ({ ...prev, smtpUser: e.target.value }))}
                      placeholder="your-email@gmail.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <div className="relative">
                      <Input
                        id="smtpPassword"
                        type={showPassword ? "text" : "password"}
                        value={smtpForm.smtpPassword}
                        onChange={(e) => setSmtpForm(prev => ({ ...prev, smtpPassword: e.target.value }))}
                        placeholder="your-app-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      value={smtpForm.fromEmail}
                      onChange={(e) => setSmtpForm(prev => ({ ...prev, fromEmail: e.target.value }))}
                      placeholder="noreply@desibazaar.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      value={smtpForm.fromName}
                      onChange={(e) => setSmtpForm(prev => ({ ...prev, fromName: e.target.value }))}
                      placeholder="DesiBazaar Platform"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="secure"
                    checked={smtpForm.secure}
                    onCheckedChange={(checked) => setSmtpForm(prev => ({ ...prev, secure: checked }))}
                  />
                  <Label htmlFor="secure">Use SSL/TLS (port 465)</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={saveEmailConfig} 
                    disabled={emailSaving}
                    className="flex-1"
                  >
                    {emailSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Settings className="w-4 h-4 mr-2" />
                    )}
                    Save Configuration
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={loadEmailConfig}
                    disabled={emailLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${emailLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Setup Guide */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Setup Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>For Gmail:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                    <li>Host: smtp.gmail.com, Port: 587 (or 465 with SSL)</li>
                    <li>Username: your-gmail@gmail.com</li>
                    <li>Password: Generate an App Password in Gmail settings</li>
                    <li>Enable 2-factor authentication first</li>
                  </ul>
                  
                  <p><strong>For Development:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                    <li>Disable OTP verification for easy testing</li>
                    <li>Leave SMTP credentials empty to use mock mode</li>
                    <li>Use the test email feature to verify configuration</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}