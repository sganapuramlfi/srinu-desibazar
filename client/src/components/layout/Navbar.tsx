import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Store, LogIn, LogOut, User } from "lucide-react";

export function Navbar() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();

  const handleLogout = async () => {
    const result = await logout();
    if (result.ok) {
      navigate("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Store className="h-6 w-6 text-primary" />
          <span className="font-bold">DesiBazaar</span>
        </Link>

        <NavigationMenu className="mx-6">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
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
                      <NavigationMenuLink asChild>
                        <Link 
                          href={item.href}
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          {item.name}
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            <>
              {user.role === "business" && (
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                >
                  <Store className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              )}
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Button variant="default" onClick={() => navigate("/auth")}>
              <LogIn className="mr-2 h-4 w-4" />
              Login / Register
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
