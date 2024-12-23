import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Store, LogIn, LogOut, User, Menu } from "lucide-react";

export function Navbar() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    const result = await logout();
    if (result.ok) {
      navigate("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo and Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="font-bold">DesiBazaar</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-center">Categories</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {[
                        { name: "Salon & Spa", href: "/?type=salon" },
                        { name: "Restaurant & Cafés", href: "/?type=restaurant" },
                        { name: "Event Management", href: "/?type=event" },
                        { name: "Real Estate", href: "/?type=realestate" },
                        { name: "Retail Stores", href: "/?type=retail" },
                        { name: "Professional Services", href: "/?type=professional" },
                      ].map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {user.role === "business" && (
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                  className="hidden md:flex"
                >
                  <Store className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              )}
              <Button variant="ghost" onClick={handleLogout} className="hidden md:flex">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Button variant="default" onClick={() => navigate("/auth")} className="hidden md:flex">
              <LogIn className="mr-2 h-4 w-4" />
              Login / Register
            </Button>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="flex flex-col p-4 space-y-2">
            <Link
              href="/?type=salon"
              className="px-4 py-2 text-sm hover:bg-accent rounded-md"
            >
              Salon & Spa
            </Link>
            <Link
              href="/?type=restaurant"
              className="px-4 py-2 text-sm hover:bg-accent rounded-md"
            >
              Restaurant & Cafés
            </Link>
            <Link
              href="/?type=event"
              className="px-4 py-2 text-sm hover:bg-accent rounded-md"
            >
              Event Management
            </Link>
            <Link
              href="/?type=realestate"
              className="px-4 py-2 text-sm hover:bg-accent rounded-md"
            >
              Real Estate
            </Link>
            <Link
              href="/?type=retail"
              className="px-4 py-2 text-sm hover:bg-accent rounded-md"
            >
              Retail Stores
            </Link>
            <Link
              href="/?type=professional"
              className="px-4 py-2 text-sm hover:bg-accent rounded-md"
            >
              Professional Services
            </Link>

            {user ? (
              <>
                {user.role === "business" && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/dashboard")}
                    className="w-full justify-start"
                  >
                    <Store className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                onClick={() => navigate("/auth")}
                className="w-full justify-start"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login / Register
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}