"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/metrics": "Métricas",
  "/content": "Conteúdo",
  "/audience": "Audiência",
  "/upload": "Upload",
  "/chat": "Chat IA",
  "/connections": "Conexões",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];

  const match = Object.keys(pageTitles).find((key) =>
    pathname.startsWith(key + "/")
  );
  return match ? pageTitles[match] : "ArtistMetrics";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-zinc-950/80 px-4 backdrop-blur-xl md:px-6"
    >
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white">{title}</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white sm:flex"
        >
          <RefreshCw className="size-3.5" />
          Atualizar Métricas
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white sm:hidden"
        >
          <RefreshCw className="size-3.5" />
        </Button>

        <Avatar size="sm">
          <AvatarImage src="" alt="Avatar do artista" />
          <AvatarFallback className="bg-violet-500/20 text-xs text-violet-400">
            AR
          </AvatarFallback>
        </Avatar>
      </div>
    </motion.header>
  );
}
