"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  PlayCircle,
  Users,
  Upload,
  MessageSquare,
  Link2,
  Music2,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/metrics", label: "Métricas", icon: BarChart3 },
  { href: "/content", label: "Conteúdo", icon: PlayCircle },
  { href: "/audience", label: "Audiência", icon: Users },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/chat", label: "Chat IA", icon: MessageSquare },
  { href: "/connections", label: "Conexões", icon: Link2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r border-white/5 bg-zinc-950 md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/20">
          <Music2 className="size-4 text-violet-400" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">
          ArtistMetrics
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-violet-500/10 text-violet-400"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-violet-500"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon
                  className={`size-5 ${
                    isActive
                      ? "text-violet-400"
                      : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                />
                <span>{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-4">
        <p className="text-xs text-zinc-600">
          ArtistMetrics v0.1.0
        </p>
      </div>
    </aside>
  );
}
