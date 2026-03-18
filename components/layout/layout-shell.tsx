"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
});

export const useSidebarState = () => useContext(SidebarContext);

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const mainPaddingLeft = isMobile ? 0 : collapsed ? 64 : 256;

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="relative min-h-screen bg-zinc-950">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div
          className="flex min-h-screen flex-col transition-[padding-left] duration-200 ease-out"
          style={{ paddingLeft: mainPaddingLeft }}
        >
          <Header />
          <main className="flex-1 p-4 pb-18 md:p-6 md:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <MobileNav />
      </div>
    </SidebarContext.Provider>
  );
}
