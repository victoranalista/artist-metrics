"use client";

import { motion } from "framer-motion";
import { Eye, Heart, Inbox } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, platformColors, platformNames } from "@/lib/utils";

interface ContentItem {
  id: string;
  title: string | null;
  contentType: string;
  views: number | null;
  likes: number | null;
  platform: string;
}

interface RecentActivityProps {
  items: ContentItem[];
}

const contentTypeLabels: Record<string, string> = {
  video: "Video",
  image: "Imagem",
  track: "Faixa",
  album: "Album",
  short: "Short",
  reel: "Reel",
  post: "Post",
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card className="h-full border-white/5 bg-zinc-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-800">
              <Inbox className="size-5 text-zinc-500" />
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-400">
              Nenhum conteudo encontrado
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Conecte suas plataformas para ver a atividade.
            </p>
          </div>
        ) : (
          <motion.div
            className="space-y-1"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {items.map((content) => (
              <motion.div
                key={content.id}
                variants={item}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
              >
                {/* Platform color dot */}
                <div
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      platformColors[content.platform] || "#8b5cf6",
                  }}
                />

                {/* Title and type */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">
                    {content.title || "Sem titulo"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {contentTypeLabels[content.contentType] ||
                        content.contentType}
                    </Badge>
                    <span className="text-[10px] text-zinc-500">
                      {platformNames[content.platform] || content.platform}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Eye className="size-3" />
                    {formatNumber(content.views || 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="size-3" />
                    {formatNumber(content.likes || 0)}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
