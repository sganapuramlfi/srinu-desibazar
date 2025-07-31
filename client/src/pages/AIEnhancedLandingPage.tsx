import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Search,
  Scissors,
  UtensilsCrossed,
  Calendar,
  Home,
  Store,
  Briefcase,
  MapPin,
  Sparkles,
  Zap,
} from "lucide-react";
import { AISearchBoxWrapper, AIAssistantWidgetWrapper, useAIStatusWrapper } from "@/components/AIIntegration";
import type { Business } from "../types/db";

const industries = [
  { id: "salon", icon: Scissors, name: "Salon & Spa" },
  { id: "restaurant", icon: UtensilsCrossed, name: "Restaurant & Cafés" },
  { id: "event", icon: Calendar, name: "Event Management" },
  { id: "realestate", icon: Home, name: "Real Estate" },
  { id: "retail", icon: Store, name: "Retail Stores" },
  { id: "professional", icon: Briefcase, name: "Professional Services" },
];

export default function AIEnhancedLandingPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState(false);
  
  // Check AI availability
  const { status: aiStatus } = useAIStatusWrapper();

  const { data: businesses, isLoading } = useQuery<Business[]>({
    queryKey: ["/api/businesses", selectedIndustry],
    enabled: true,
  });

  const filteredBusinesses = businesses?.filter((business) =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (selectedIndustry) params.set("industry", selectedIndustry);
    navigate(`/search?${params.toString()}`);
  };

  const handleAIResultSelect = (result: any) => {
    // Navigate to the selected business or handle the AI suggestion
    navigate(`/business/${result.id}`);
  };

  const featuredBusinesses = businesses?.slice(0, 6) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section with AI-Enhanced Search */}
      <section className="relative px-6 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Discover Amazing Local Businesses
              {aiStatus?.enabled && (
                <span className="flex items-center justify-center gap-2 text-3xl text-purple-600 mt-2">
                  <Sparkles className="w-8 h-8" />
                  Powered by AI
                </span>
              )}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find and book services from salons to restaurants, events to real estate.
              {aiStatus?.enabled && " Ask our AI assistant anything!"}
            </p>
          </div>

          {/* Search Section */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-8">
            {/* Toggle between AI and Normal Search */}
            {aiStatus?.enabled && (
              <div className="flex justify-center mb-4">
                <div className="bg-gray-100 p-1 rounded-lg flex">
                  <button
                    onClick={() => setAiMode(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      !aiMode 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Search className="w-4 h-4 inline mr-2" />
                    Normal Search
                  </button>
                  <button
                    onClick={() => setAiMode(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      aiMode 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 inline mr-2" />
                    AI Search
                  </button>
                </div>
              </div>
            )}

            {/* AI Search Mode */}
            {aiMode && aiStatus?.enabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600 justify-center mb-4">
                  <Zap className="w-5 h-5" />
                  <span className="font-medium">AI-Powered Smart Search</span>
                </div>
                <AISearchBoxWrapper
                  placeholder="Ask me anything! 'Find hair salons with good reviews near me' or 'Book a table for 4 tonight'"
                  onResultSelect={handleAIResultSelect}
                  industry={selectedIndustry || undefined}
                />
                <p className="text-sm text-gray-500 text-center">
                  Try: "Find me a romantic restaurant for anniversary dinner" or "Need a haircut tomorrow morning"
                </p>
              </div>
            ) : (
              /* Normal Search Mode */
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Search for businesses, services, or locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} size="lg" className="px-8">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Industry Categories */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {industries.map((industry) => {
              const Icon = industry.icon;
              const isSelected = selectedIndustry === industry.id;
              return (
                <button
                  key={industry.id}
                  onClick={() => setSelectedIndustry(isSelected ? null : industry.id)}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <Icon className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">{industry.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Features Banner */}
      {aiStatus?.enabled && (
        <section className="py-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <span className="font-medium">Smart Search</span>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6" />
                <span className="font-medium">Instant Booking</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6" />
                <span className="font-medium">Location Aware</span>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white">
                ABRAKADABRA AI Genie
              </Badge>
            </div>
          </div>
        </section>
      )}

      {/* Featured Businesses */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Featured Businesses
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-48 rounded-t-lg"></div>
                  <div className="bg-white p-4 rounded-b-lg border">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredBusinesses.map((business) => (
                <Card 
                  key={business.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/business/${business.id}`)}
                >
                  <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center">
                    <Store className="w-12 h-12 text-gray-400" />
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {business.name}
                      <Badge variant="outline">
                        {industries.find(i => i.id === business.industry)?.name || business.industry}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {business.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm">
                      {business.description?.slice(0, 100)}...
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI Assistant Widget - Only show if AI is enabled */}
      {aiStatus?.enabled && <AIAssistantWidgetWrapper />}
    </div>
  );
}