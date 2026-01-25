import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Users, Calendar, MessageSquare } from 'lucide-react';
import { AIInsightsDashboardWrapper, useAIStatusWrapper } from './AIIntegration';

interface AIBusinessDashboardProps {
  businessId: number;
}

export function AIBusinessDashboard({ businessId }: AIBusinessDashboardProps) {
  const { status: aiStatus } = useAIStatusWrapper();

  if (!aiStatus?.enabled) {
    return null; // Don't render anything if AI is not enabled
  }

  return (
    <div className="space-y-6">
      {/* AI Features Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Sparkles className="w-6 h-6" />
            ABRAKADABRA AI Assistant
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {aiStatus.features?.smartSearch && (
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Smart Search
              </div>
            )}
            {aiStatus.features?.bookingAssistant && (
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Booking Assistant
              </div>
            )}
            {aiStatus.features?.businessInsights && (
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Business Insights
              </div>
            )}
            {aiStatus.features?.messageAI && (
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Message AI
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Dashboard */}
      {aiStatus.features?.businessInsights && (
        <AIInsightsDashboardWrapper businessId={businessId} />
      )}

      {/* AI-Powered Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Optimize Schedule</h4>
              <p className="text-sm text-gray-600">AI suggests optimal staff scheduling</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Users className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Customer Insights</h4>
              <p className="text-sm text-gray-600">Understand your customer patterns</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Calendar className="w-8 h-8 text-orange-600 mb-2" />
              <h4 className="font-medium text-gray-900">Booking Optimization</h4>
              <p className="text-sm text-gray-600">Smart booking recommendations</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Auto Responses</h4>
              <p className="text-sm text-gray-600">AI handles customer queries</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">AI Search Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+25%</div>
            <p className="text-sm text-gray-600">More bookings via AI search</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">2.3s</div>
            <p className="text-sm text-gray-600">Average AI response time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">94%</div>
            <p className="text-sm text-gray-600">Happy with AI assistance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}