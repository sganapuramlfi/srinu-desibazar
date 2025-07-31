import React, { useState, useEffect } from 'react';
import { useAISearch, useAIBooking } from './hooks.js';
import { Sparkles, Send, X, Bot, Search } from 'lucide-react';

// AI-powered search box component
export function AISearchBox({ 
  placeholder = "Ask me anything about services, bookings, or businesses...",
  onResultSelect,
  industry 
}: {
  placeholder?: string;
  onResultSelect?: (result: any) => void;
  industry?: string;
}) {
  const [query, setQuery] = useState('');
  const { search, loading, result } = useAISearch();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    await search({ query, industry });
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-50"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </form>

      {result && result.suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
          <div className="p-3 border-b border-gray-100">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              {result.aiSummary}
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {result.suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => onResultSelect?.(suggestion)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">{suggestion.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{suggestion.matchReason}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-purple-600">
                    {Math.round(suggestion.confidence * 100)}% match
                  </span>
                  <span className="text-xs text-gray-500">
                    Score: {suggestion.relevanceScore}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Floating AI Assistant Widget
export function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [input, setInput] = useState('');
  const { sendMessage, loading } = useAIBooking();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // For demo, using booking endpoint but this could be expanded
    const response = await sendMessage({
      message: userMessage,
      businessId: 0, // This would come from context
      userId: 0, // This would come from auth
      availableServices: []
    });

    if (response) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.message 
      }]);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all hover:scale-110 z-50"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-purple-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Assistant - ABRAKADABRA
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Ask me about bookings, services, or businesses!
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Hi! I'm your AI assistant.</p>
                <p className="text-sm mt-2">How can I help you today?</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// AI Insights Dashboard Component
export function AIInsightsDashboard({ businessId }: { businessId: number }) {
  const { fetchInsights, loading, insights } = useAIInsights(businessId);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    fetchInsights(timeframe);
  }, [timeframe, fetchInsights]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Business Insights
        </h3>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as any)}
          className="text-sm border border-gray-300 rounded px-3 py-1"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
        </select>
      </div>

      <div className="space-y-4">
        <div className={`p-4 rounded-lg border-l-4 ${
          insights.priority === 'high' ? 'border-red-500 bg-red-50' :
          insights.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
          'border-green-500 bg-green-50'
        }`}>
          <p className="font-medium text-gray-900">{insights.recommendation}</p>
          <p className="text-sm text-gray-600 mt-1">Priority: {insights.priority}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Booking Trend</p>
            <p className="text-lg font-semibold text-gray-900">{insights.bookingTrend}</p>
          </div>
          
          {insights.optimalHours?.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Optimal Hours</p>
              {insights.optimalHours.slice(0, 3).map((hour, idx) => (
                <p key={idx} className="text-sm">
                  {hour.time}: <span className="font-medium">{hour.demand}</span>
                </p>
              ))}
            </div>
          )}
        </div>

        {insights.insights?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Key Insights</p>
            <ul className="space-y-1">
              {insights.insights.map((insight, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}