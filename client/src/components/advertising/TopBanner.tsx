import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, AlertCircle, Megaphone, Star, Zap, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: "news" | "promotion" | "feature" | "alert" | "maintenance";
  icon?: string;
  color: string;
  scrollSpeed: number;
  displayDuration: number;
  isActive: boolean;
  priority: number;
}

const iconMap = {
  AlertCircle,
  Megaphone,
  Star,
  Zap,
  Bell,
};

const colorMap = {
  blue: "bg-blue-500 text-white",
  green: "bg-green-500 text-white", 
  yellow: "bg-yellow-500 text-black",
  red: "bg-red-500 text-white",
  purple: "bg-purple-500 text-white",
  orange: "bg-orange-500 text-white",
};

export function TopBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements/active"],
    enabled: false, // Disabled until server API is working
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const activeAnnouncements = announcements?.filter(a => a.isActive) || [];

  useEffect(() => {
    if (activeAnnouncements.length === 0 || isPaused) return;

    const current = activeAnnouncements[currentIndex];
    if (!current) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
    }, current.displayDuration);

    return () => clearTimeout(timer);
  }, [currentIndex, activeAnnouncements, isPaused]);

  if (!isVisible || activeAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = activeAnnouncements[currentIndex];
  if (!currentAnnouncement) return null;

  const IconComponent = currentAnnouncement.icon 
    ? iconMap[currentAnnouncement.icon as keyof typeof iconMap] || Megaphone
    : Megaphone;

  const colorClass = colorMap[currentAnnouncement.color as keyof typeof colorMap] || colorMap.blue;

  return (
    <div 
      className={`w-full ${colorClass} shadow-sm border-b relative overflow-hidden z-40`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Animated Background Effect */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="h-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"
          style={{
            animation: `slide ${currentAnnouncement.scrollSpeed / 10}s linear infinite`
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-2 relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <IconComponent className="h-4 w-4 flex-shrink-0" />
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {currentAnnouncement.title}
                </span>
                {currentAnnouncement.type === 'promotion' && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    🔥 Hot
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90 truncate">
                {currentAnnouncement.content}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress indicators for multiple announcements */}
            {activeAnnouncements.length > 1 && (
              <div className="flex gap-1">
                {activeAnnouncements.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-opacity ${
                      index === currentIndex ? 'bg-white' : 'bg-white/40'
                    }`}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
            )}

            {/* Close button */}
            <Button
              variant="ghost" 
              size="sm"
              className="h-6 w-6 p-0 hover:bg-white/20"
              onClick={() => setIsVisible(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* CSS for sliding animation */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}