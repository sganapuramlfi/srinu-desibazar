import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star, Users, MapPin } from "lucide-react";

export default function SimpleLanding() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/20 to-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
            DesiBazaar Hub
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your trusted marketplace for local services and businesses
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search for services, businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
              <Button className="absolute right-1 top-1 h-10">
                Search
              </Button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>12,000+ Businesses</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>4.8 Average Rating</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>50+ Cities</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Popular Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Salon & Spa", count: "2,847", color: "bg-pink-100 text-pink-600" },
              { name: "Restaurants", count: "1,234", color: "bg-orange-100 text-orange-600" },
              { name: "Events", count: "892", color: "bg-purple-100 text-purple-600" },
              { name: "Real Estate", count: "567", color: "bg-blue-100 text-blue-600" },
              { name: "Retail", count: "1,456", color: "bg-green-100 text-green-600" },
              { name: "Professional", count: "789", color: "bg-gray-100 text-gray-600" }
            ].map((category) => (
              <Card key={category.name} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <span className={`px-2 py-1 rounded text-sm ${category.color}`}>
                      {category.count}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Discover quality {category.name.toLowerCase()} services near you
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of businesses and customers already using DesiBazaar Hub
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8">
              Find Services
            </Button>
            <Button size="lg" variant="outline" className="px-8">
              List Your Business
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}