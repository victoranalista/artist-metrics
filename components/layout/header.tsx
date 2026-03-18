"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Visão geral" },
  "/metrics": { title: "Métricas", subtitle: "Análise de desempenho" },
  "/content": { title: "Conteúdo", subtitle: "Gerenciar lançamentos" },
  "/audience": { title: "Audiência", subtitle: "Dados demográficos" },
  "/upload": { title: "Upload", subtitle: "Enviar arquivos" },
  "/chat": { title: "Chat IA", subtitle: "Assistente inteligente" },
  "/connections": { title: "Conexões", subtitle: "Plataformas conectadas" },
};

function getPageInfo(pathname: string): { title: string; subtitle?: string } {
  if (pageTitles[pathname]) return pageTitles[pathname];

  const match = Object.keys(pageTitles).find((key) =>
    pathname.startsWith(key + "/")
  );
  return match ? pageTitles[match] : { title: "ArtistMetrics" };
}

export function Header() {
  const pathname = usePathname();
  const { title, subtitle } = getPageInfo(pathname);

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-sm md:px-6"
    >
      {/* Page Title + Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-sm font-semibold text-zinc-100">{title}</h1>
        {subtitle && (
          <>
            <ChevronRight className="size-3 text-zinc-600 shrink-0" />
            <span className="text-sm text-zinc-500 truncate">{subtitle}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-1.5 sm:flex"
        >
          <RefreshCw className="size-3" />
          Atualizar Métricas
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          className="sm:hidden"
        >
          <RefreshCw className="size-3.5" />
        </Button>

        <div className="ml-1 hidden md:block">
          <Avatar size="sm">
            <AvatarImage src="" alt="Avatar do artista" />
            <AvatarFallback className="bg-zinc-800 text-xs text-zinc-400">
              AR
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </motion.header>
  );
}
