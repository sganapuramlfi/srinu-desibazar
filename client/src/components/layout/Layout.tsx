import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { TopBanner } from "../advertising/TopBanner";
import { SidebarAd } from "../advertising/SidebarAd";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDE7] relative">
      <TopBanner />
      
      <Navbar />
      
      <SidebarAd position="sidebar_left" maxAds={3} />
      <SidebarAd position="sidebar_right" maxAds={3} />
      
      <main className="flex-1 w-full">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}