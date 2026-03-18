"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  PlayCircle,
  Users,
  Upload,
  MessageSquare,
  Link2,
  Music2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebarState } from "@/components/layout/layout-shell";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/metrics", label: "Métricas", icon: BarChart3 },
  { href: "/content", label: "Conteúdo", icon: PlayCircle },
  { href: "/audience", label: "Audiência", icon: Users },
];

const toolNavItems = [
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/chat", label: "Chat IA", icon: MessageSquare },
  { href: "/connections", label: "Conexões", icon: Link2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebarState();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-zinc-800 bg-zinc-900 md:flex"
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 overflow-hidden"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-800">
            <Music2 className="size-4 text-zinc-300" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap text-sm font-semibold tracking-tight text-zinc-100"
              >
                DK Métricas
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      <Separator className="bg-zinc-800" />

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center px-2 pt-2">
          <button
            onClick={() => setCollapsed(false)}
            className="flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <PanelLeft className="size-4" />
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <TooltipProvider>
          <div className="space-y-0.5">
            {mainNavItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
              />
            ))}
          </div>

          <Separator className="my-3 bg-zinc-800" />

          <div className="space-y-0.5">
            {toolNavItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
              />
            ))}
          </div>
        </TooltipProvider>
      </nav>

      {/* Artist Footer */}
      <Separator className="bg-zinc-800" />
      <div className="p-2">
        <div
          className={`flex items-center rounded-md px-2 py-2 ${
            collapsed ? "justify-center px-0" : "gap-2.5"
          }`}
        >
          <Avatar size="sm">
            <AvatarImage src="/artist/avatar-sm.webp" alt="Debora Kailany" />
            <AvatarFallback className="bg-zinc-800 text-xs text-zinc-400">
              DK
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 overflow-hidden"
              >
                <p className="truncate text-sm font-medium text-zinc-200">
                  Débora Kailany
                </p>
                <p className="truncate text-xs text-zinc-500">
                  Artista Gospel · Brasília/DF
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

function NavItem({
  item,
  pathname,
  collapsed,
}: {
  item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  pathname: string;
  collapsed: boolean;
}) {
  const isActive =
    pathname === item.href || pathname?.startsWith(item.href + "/");
  const Icon = item.icon;

  const linkContent = (
    <Link href={item.href}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className={`group relative flex items-center rounded-md text-sm font-medium transition-colors ${
          collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-1.5"
        } ${
          isActive
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
        }`}
      >
        <Icon
          className={`size-4 shrink-0 ${
            isActive
              ? "text-zinc-100"
              : "text-zinc-500 group-hover:text-zinc-300"
          }`}
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}
