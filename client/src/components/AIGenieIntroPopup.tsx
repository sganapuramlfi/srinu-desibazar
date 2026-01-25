import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  X, 
  Star, 
  Zap, 
  Brain, 
  Calendar, 
  Search, 
  MessageSquare,
  TrendingUp,
  Heart,
  Bell,
  CheckCircle
} from 'lucide-react';

interface AIGenieIntroPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe?: (email: string) => void;
}

export function AIGenieIntroPopup({ isOpen, onClose, onSubscribe }: AIGenieIntroPopupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowSparkles(true);
      const timer = setTimeout(() => setCurrentStep(1), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubscribe = async () => {
    if (!email) return;
    
    try {
      // API call to subscribe user for AI notifications
      await fetch('/api/ai/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, features: ['all'] })
      });
      
      setIsSubscribed(true);
      onSubscribe?.(email);
      
      // Auto close after success
      setTimeout(() => {
        onClose();
        setCurrentStep(0);
        setIsSubscribed(false);
        setEmail('');
      }, 3000);
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  const features = [
    { 
      icon: Search, 
      name: "Smart Search", 
      description: "Find businesses with natural language",
      example: '"Find hair salon near me with good reviews"'
    },
    { 
      icon: MessageSquare, 
      name: "Booking Assistant", 
      description: "Book appointments by chatting",
      example: '"Book haircut tomorrow 2pm"'
    },
    { 
      icon: Brain, 
      name: "Personal Insights", 
      description: "AI learns your preferences",
      example: "Suggests perfect businesses for you"
    },
    { 
      icon: TrendingUp, 
      name: "Smart Recommendations", 
      description: "Optimal booking times and services",
      example: "Best times to avoid crowds"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white border-0 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating sparkles */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`absolute animate-float ${showSparkles ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
          ))}
          
          {/* Gradient orbs */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse delay-1000"></div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="relative z-10 p-8">
          {/* Header with Genie */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              {/* Genie lamp/bottle effect */}
              <div className={`transition-all duration-1000 ${
                currentStep >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              }`}>
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-bounce-slow">
                    <div className="absolute inset-2 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white animate-spin-slow" />
                    </div>
                  </div>
                  {/* Magic smoke effect */}
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 bg-white rounded-full opacity-70 animate-float-up"
                        style={{
                          left: `${-10 + i * 10}px`,
                          animationDelay: `${i * 0.5}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-500 ${
              currentStep >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                ✨ ABRAKADABRA! ✨
              </h1>
              <p className="text-xl text-blue-100 mb-1">Your AI Genie has arrived!</p>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                🚀 Coming Soon
              </Badge>
            </div>
          </div>

          {!isSubscribed ? (
            <>
              {/* Features showcase */}
              <div className={`transition-all duration-1000 delay-1000 ${
                currentStep >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}>
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-center mb-6 text-yellow-300">
                    🧞‍♂️ I'm here to grant your booking wishes!
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {features.map((feature, index) => {
                      const Icon = feature.icon;
                      return (
                        <div
                          key={index}
                          className={`bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 transition-all duration-500 hover:bg-white/20 hover:scale-105 ${
                            currentStep >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                          }`}
                          style={{ transitionDelay: `${1500 + index * 200}ms` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-400 to-blue-400">
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white mb-1">{feature.name}</h3>
                              <p className="text-blue-100 text-sm mb-2">{feature.description}</p>
                              <p className="text-yellow-200 text-xs italic">💡 {feature.example}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Call to action */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold text-yellow-300 mb-2 flex items-center justify-center gap-2">
                      <Bell className="w-5 h-5 animate-bounce" />
                      Be the first to experience the magic!
                    </h3>
                    <p className="text-blue-100 text-sm">
                      Subscribe to get notified when ABRAKADABRA AI launches. Your booking experience will never be the same! ✨
                    </p>
                  </div>

                  <div className="flex gap-3 max-w-md mx-auto">
                    <Input
                      type="email"
                      placeholder="Enter your email for early access..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/20 border-white/30 text-white placeholder:text-blue-200 focus:bg-white/30"
                      onKeyPress={(e) => e.key === 'Enter' && handleSubscribe()}
                    />
                    <Button
                      onClick={handleSubscribe}
                      disabled={!email}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-6"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Notify Me!
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-4 mt-4 text-xs text-blue-200">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Free to use
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      No spam, ever
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Early access
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-green-300 mb-2">🎉 Your wish is granted!</h2>
              <p className="text-blue-100 mb-4">
                You'll be among the first to experience ABRAKADABRA AI magic!
              </p>
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/30">
                <p className="text-green-200 text-sm">
                  ✨ We'll notify you as soon as the genie is ready to help with your bookings!
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float-up {
          0% { transform: translateY(0px); opacity: 1; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-up {
          animation: float-up 2s ease-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </Dialog>
  );
}