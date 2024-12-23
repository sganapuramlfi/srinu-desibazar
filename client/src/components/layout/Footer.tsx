import { Link } from "wouter";
import { Store } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto px-4 py-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 justify-items-center">
          {/* Brand Section */}
          <div className="text-center w-full max-w-xs">
            <Link href="/" className="inline-flex items-center justify-center w-full space-x-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="font-bold">DesiBazaar</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Your one-stop platform for discovering and booking local businesses and services.
            </p>
          </div>

          {/* Categories Section */}
          <div className="text-center w-full max-w-xs">
            <h3 className="text-sm font-semibold mb-4">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/?type=salon" className="text-muted-foreground hover:text-primary">
                  Salon & Spa
                </Link>
              </li>
              <li>
                <Link href="/?type=restaurant" className="text-muted-foreground hover:text-primary">
                  Restaurant & Cafés
                </Link>
              </li>
              <li>
                <Link href="/?type=event" className="text-muted-foreground hover:text-primary">
                  Event Management
                </Link>
              </li>
              <li>
                <Link href="/?type=realestate" className="text-muted-foreground hover:text-primary">
                  Real Estate
                </Link>
              </li>
              <li>
                <Link href="/?type=retail" className="text-muted-foreground hover:text-primary">
                  Retail Stores
                </Link>
              </li>
              <li>
                <Link href="/?type=professional" className="text-muted-foreground hover:text-primary">
                  Professional Services
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Section */}
          <div className="text-center w-full max-w-xs">
            <h3 className="text-sm font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/auth" className="text-muted-foreground hover:text-primary">
                  List Your Business
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div className="text-center w-full max-w-xs">
            <h3 className="text-sm font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="mt-8 border-t pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DesiBazaar. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}