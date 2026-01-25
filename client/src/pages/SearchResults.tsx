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
  Search,
  MapPin,
  Star,
  Clock,
  ArrowRight,
  Filter,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { AbrakadabraIcon } from "@/components/AbrakadabraIcon";
import { useAISearch } from "@/hooks/useAISearch";

interface SearchResultBusiness {
  id: number;
  name: string;
  description?: string;
  industryType: string;
  logoUrl?: string;
  contactInfo?: {
    address?: string;
    phone?: string;
    email?: string;
  };
  slug?: string;
  averageRating?: number;
  reviewCount?: number;
  publishedSections?: string[];
  storefrontSettings?: any;
}

interface SearchResultsProps {
  searchQuery?: string;
  industry?: string;
  location?: string;
}

export default function SearchResults({ searchQuery, industry, location }: SearchResultsProps) {
  const [, navigate] = useLocation();
  const [localQuery, setLocalQuery] = useState(searchQuery || "");
  const [selectedIndustry, setSelectedIndustry] = useState(industry || "");
  const [locationFilter, setLocationFilter] = useState(location || "");
  const { analyzeQuery, searchSuggestions, isAnalyzing } = useAISearch();

  // Fetch search results
  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/businesses/search", localQuery, selectedIndustry, locationFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (localQuery) params.append("q", localQuery);
      if (selectedIndustry) params.append("industry", selectedIndustry);
      if (locationFilter) params.append("location", locationFilter);
      params.append("limit", "50");

      const response = await fetch(`/api/businesses/search?${params}`);
      if (!response.ok) {
        throw new Error("Failed to search businesses");
      }
      return response.json();
    },
    enabled: !!(localQuery || selectedIndustry || locationFilter),
  });

  const handleSearch = () => {
    refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const industries = [
    { id: "", name: "All Industries" },
    { id: "salon", name: "Salon & Spa" },
    { id: "restaurant", name: "Restaurant & Cafés" },
    { id: "event", name: "Event Management" },
    { id: "realestate", name: "Real Estate" },
    { id: "retail", name: "Retail Stores" },
    { id: "professional", name: "Professional Services" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-primary"
            >
              ← Back to Home
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-1 rounded-full">
              <Sparkles className="h-4 w-4" />
              AI Assistant Active
            </div>
          </div>

          {/* Search Controls */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Search businesses, services, or keywords..."
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-lg"
                  />
                </div>
                <div>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                  >
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={handleSearch} size="lg">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Results Header */}
          {searchResults && (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Search Results
                  {localQuery && (
                    <span className="text-primary ml-2">for "{localQuery}"</span>
                  )}
                </h1>
                <p className="text-gray-600 mt-1">
                  Found {searchResults.total} businesses
                  {selectedIndustry && ` in ${industries.find(i => i.id === selectedIndustry)?.name}`}
                  {locationFilter && ` near ${locationFilter}`}
                </p>
              </div>
              {localQuery && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-purple-800 mb-3">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      {isAnalyzing ? "AI is analyzing your search..." : "AI Enhanced Search Results"}
                    </span>
                  </div>
                  {searchSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-purple-700 font-medium">Related suggestions:</div>
                      <div className="flex flex-wrap gap-2">
                        {searchSuggestions.slice(0, 3).map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setLocalQuery(suggestion.text);
                              if (suggestion.industryType) {
                                setSelectedIndustry(suggestion.industryType);
                              }
                              handleSearch();
                            }}
                            className="text-xs bg-white text-purple-700 px-2 py-1 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
                          >
                            {suggestion.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-gray-600">Searching businesses...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Failed to search businesses. Please try again.</p>
                <Button onClick={handleSearch} className="mt-4">
                  Retry Search
                </Button>
              </div>
            </div>
          )}

          {/* No Results */}
          {searchResults && searchResults.businesses.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No businesses found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search terms or browse by category
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                Browse All Categories
              </Button>
            </div>
          )}

          {/* Results Grid */}
          {searchResults && searchResults.businesses.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.businesses.map((business: SearchResultBusiness) => (
                <Card 
                  key={business.id} 
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    if (business.slug) {
                      navigate(`/storefront/${business.slug}`);
                    } else {
                      navigate(`/business/${business.id}`);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {business.logoUrl ? (
                          <img
                            src={business.logoUrl}
                            alt={`${business.name} logo`}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-bold">
                              {business.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {business.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {business.industryType}
                            </Badge>
                            {business.averageRating && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{business.averageRating}</span>
                                {business.reviewCount && (
                                  <span className="text-gray-400">({business.reviewCount})</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <CardDescription className="mb-4 line-clamp-2">
                      {business.description || "Professional services and quality experience."}
                    </CardDescription>
                    
                    {business.contactInfo?.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{business.contactInfo.address}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Available today</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="group-hover:bg-primary group-hover:text-white transition-colors"
                      >
                        View Details
                        <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AbrakadabraAI Assistant - Clean floating popup */}
      <AbrakadabraIcon context="directory" />
    </div>
  );
}