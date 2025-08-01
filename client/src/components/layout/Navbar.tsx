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
import { Badge } from "@/components/ui/badge";
import { Store, LogIn, LogOut, Menu, User, Calendar, Settings } from "lucide-react";
import { useModularAuth } from "../ModularAuthProvider";
import { ModularNavigation } from "../ModularNavigation";

export function Navbar() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  
  // Try to get modular auth, but handle gracefully if not available
  let session, availableModules, modularLogout;
  try {
    const modularAuth = useModularAuth();
    session = modularAuth.session;
    availableModules = modularAuth.availableModules;
    modularLogout = modularAuth.logout;
  } catch {
    // ModularAuth not available (on public pages)
    session = null;
    availableModules = [];
    modularLogout = null;
  }
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    // Use modular logout if available, fallback to user logout
    if (session && modularLogout) {
      await modularLogout();
    } else {
      const result = await logout();
      if (result.ok) {
        navigate("/");
      }
    }
    navigate("/");
  };

  const handleDashboardClick = () => {
    if (user?.role === "business" && user.business?.id) {
      navigate(`/dashboard/${user.business.id}`);
    } else if (user?.role === "customer") {
      navigate("/my-dashboard");
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
                  <NavigationMenuTrigger className="text-center">
                    Categories
                  </NavigationMenuTrigger>
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

                {/* Module-specific Navigation ONLY for business users */}
                {session && (session.role === 'owner' || session.role === 'admin' || session.role === 'manager') && (
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>
                      My Business
                      <Badge variant="outline" className="ml-2 text-xs">
                        {session.enabledModules.length}
                      </Badge>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="p-4 w-[300px]">
                        <ModularNavigation orientation="vertical" />
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-4">
          {(user || session) ? (
            <>
              {/* Module-aware business dashboard */}
              {session && (session.role === "owner" || session.role === "admin") ? (
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/dashboard/${session.businessId}`)}
                  className="hidden md:flex"
                >
                  <Store className="mr-2 h-4 w-4" />
                  Dashboard
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {session.enabledModules.length}
                  </Badge>
                </Button>
              ) : user?.role === "business" && user.business?.id ? (
                <Button
                  variant="ghost"
                  onClick={handleDashboardClick}
                  className="hidden md:flex"
                >
                  <Store className="mr-2 h-4 w-4" />
                  Business Dashboard
                </Button>
              ) : (user?.role === "customer" || session?.role === "customer") ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/my-dashboard")}
                    className="hidden md:flex"
                  >
                    <User className="mr-2 h-4 w-4" />
                    My Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/my-bookings")}
                    className="hidden md:flex"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    My Bookings
                  </Button>
                </>
              ) : null}
              
              {/* Settings for business owners */}
              {/* Settings ONLY for business owners and managers */}
              {session && (session.role === "owner" || session.role === "admin" || session.role === "manager") && (
                <Button
                  variant="ghost"
                  onClick={() => navigate("/settings")}
                  className="hidden md:flex"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              )}
              
              <Button variant="ghost" onClick={handleLogout} className="hidden md:flex">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => navigate("/auth?mode=register")} className="hidden md:flex">
                <User className="mr-2 h-4 w-4" />
                Register User
              </Button>
              <Button variant="outline" onClick={() => navigate("/register")} className="hidden md:flex">
                <Store className="mr-2 h-4 w-4" />
                List Business
              </Button>
              <Button variant="default" onClick={() => navigate("/auth")} className="hidden md:flex">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </>
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
            {[
              { href: "/?type=salon", label: "Salon & Spa" },
              { href: "/?type=restaurant", label: "Restaurant & Cafés" },
              { href: "/?type=event", label: "Event Management" },
              { href: "/?type=realestate", label: "Real Estate" },
              { href: "/?type=retail", label: "Retail Stores" },
              { href: "/?type=professional", label: "Professional Services" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm hover:bg-accent rounded-md"
              >
                {item.label}
              </Link>
            ))}

            {user ? (
              <>
                {user.role === "business" && user.business?.id ? (
                  <Button
                    variant="ghost"
                    onClick={handleDashboardClick}
                    className="w-full justify-start"
                  >
                    <Store className="mr-2 h-4 w-4" />
                    Business Dashboard
                  </Button>
                ) : user.role === "customer" ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleDashboardClick}
                      className="w-full justify-start"
                    >
                      <User className="mr-2 h-4 w-4" />
                      My Dashboard
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/my-bookings")}
                      className="w-full justify-start"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      My Bookings
                    </Button>
                  </>
                ) : null}
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
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/auth?mode=register")}
                  className="w-full justify-start"
                >
                  <User className="mr-2 h-4 w-4" />
                  Register User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/register")}
                  className="w-full justify-start"
                >
                  <Store className="mr-2 h-4 w-4" />
                  List Business
                </Button>
                <Button
                  variant="default"
                  onClick={() => navigate("/auth")}
                  className="w-full justify-start"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}