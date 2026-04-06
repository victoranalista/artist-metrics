"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  Upload,
  Link2,
  Video,
} from "lucide-react";

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/metrics", label: "Métricas", icon: BarChart3 },
  { href: "/shorts", label: "Shorts", icon: Video },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/connections", label: "Conexões", icon: Link2 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-900 md:hidden">
      <div className="flex h-14 items-center justify-around px-1">
        {mobileNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1"
            >
              <motion.div
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className={`flex flex-col items-center gap-0.5 ${
                  isActive ? "text-zinc-100" : "text-zinc-500"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-active"
                    className="absolute -top-px left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-zinc-400"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}
                <Icon className="size-4.5" />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
