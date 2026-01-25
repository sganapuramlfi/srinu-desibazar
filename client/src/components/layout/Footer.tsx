import { Link } from "wouter";
import { Store } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto px-4 py-4">
        {/* Compact Single Row Layout */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Brand */}
          <div className="flex items-center space-x-2">
            <Store className="h-4 w-4 text-primary" />
            <span className="font-semibold">DesiBazaar</span>
            <span className="text-muted-foreground">© {new Date().getFullYear()}</span>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Categories */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Categories:</span>
              <div className="flex gap-2">
                <Link href="/?type=salon" className="text-primary hover:underline">Salon</Link>
                <span className="text-muted-foreground">•</span>
                <Link href="/?type=restaurant" className="text-primary hover:underline">Restaurant</Link>
                <span className="text-muted-foreground">•</span>
                <Link href="/?type=event" className="text-primary hover:underline">Events</Link>
                <span className="text-muted-foreground">•</span>
                <Link href="/?type=realestate" className="text-primary hover:underline">Real Estate</Link>
              </div>
            </div>

            {/* Resources */}
            <div className="flex items-center gap-2">
              <Link href="/auth" className="text-primary hover:underline">List Business</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/help" className="text-primary hover:underline">Help</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/privacy" className="text-primary hover:underline">Privacy</Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/terms" className="text-primary hover:underline">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}