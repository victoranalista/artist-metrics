"use client";

import { Eye, Heart, Inbox } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { MotionStagger, MotionItem } from "@/components/ui/motion-section";

interface ContentItem {
  id: string;
  title: string | null;
  contentType: string;
  views: number;
  likes: number;
  platform: string;
  date: string;
}

interface RecentActivityProps {
  items: ContentItem[];
}

const platformNames: Record<string, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  SPOTIFY: "Spotify",
};

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card className="h-full border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-white">
          Conteúdo Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-zinc-800">
              <Inbox className="size-4 text-zinc-500" />
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-400">
              Nenhum conteúdo encontrado
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Conecte suas plataformas para ver a atividade.
            </p>
          </div>
        ) : (
          <MotionStagger className="space-y-0.5">
            {items.filter(c => c.title && (c.views > 0 || c.likes > 0)).map((content) => (
              <MotionItem key={content.id}>
                <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
                  {/* Title and metadata */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {content.title || "Sem título"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {platformNames[content.platform] || content.platform}
                      {content.date ? ` · ${content.date}` : ""}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3 text-zinc-600" />
                      {formatNumber(content.views || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="size-3 text-zinc-600" />
                      {formatNumber(content.likes || 0)}
                    </span>
                  </div>
                </div>
              </MotionItem>
            ))}
          </MotionStagger>
        )}
      </CardContent>
    </Card>
  );
}
