import { Link } from "wouter";
import { Store } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center space-x-2">
              <Store className="h-6 w-6 text-primary" />
              <span className="font-bold">DesiBazaar</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Your one-stop platform for discovering and booking local businesses and services.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Categories</h3>
            <ul className="mt-4 space-y-2 text-sm">
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
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Resources</h3>
            <ul className="mt-4 space-y-2 text-sm">
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

          <div>
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm">
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

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DesiBazaar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
