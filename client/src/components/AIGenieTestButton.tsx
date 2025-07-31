import React from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles } from 'lucide-react';
import { useAIGenieIntro } from '../hooks/useAIGenieIntro';

// Development component to test the AI Genie popup
export function AIGenieTestButton() {
  const { triggerPopup, resetIntro } = useAIGenieIntro();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2">
      <Button
        onClick={triggerPopup}
        className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
        size="sm"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Test AI Genie Popup
      </Button>
      <Button
        onClick={resetIntro}
        variant="outline"
        size="sm"
        className="block w-full"
      >
        Reset Intro
      </Button>
    </div>
  );
}