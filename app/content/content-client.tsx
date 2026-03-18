"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  Eye,
  Heart,
  MessageCircle,
  Play,
  Music,
  FileVideo,
  ImageIcon,
  Inbox,
  BarChart3,
  TrendingUp,
  Video,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

// ── Types ──

interface ContentItem {
  id: string;
  contentId: string;
  contentType: string;
  title: string;
  publishedAt: string | null;
  url: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  platform: string;
}

interface ContentClientProps {
  content: ContentItem[];
}

type SortKey = "views" | "likes" | "comments" | "engagement" | "publishedAt";
type SortDirection = "asc" | "desc";

// ── Helpers ──

const contentTypeLabels: Record<string, string> = {
  VIDEO: "Vídeo",
  video: "Vídeo",
  SHORT: "Short",
  short: "Short",
  REEL: "Reel",
  reel: "Reel",
  POST: "Post",
  post: "Post",
  STORY: "Story",
  story: "Story",
  TRACK: "Música",
  track: "Música",
  ALBUM: "Álbum",
  album: "Álbum",
  PLAYLIST: "Playlist",
  playlist: "Playlist",
};

const contentTypeIcons: Record<string, React.ReactNode> = {
  VIDEO: <Play className="size-3" />,
  video: <Play className="size-3" />,
  SHORT: <FileVideo className="size-3" />,
  short: <FileVideo className="size-3" />,
  REEL: <FileVideo className="size-3" />,
  reel: <FileVideo className="size-3" />,
  POST: <ImageIcon className="size-3" />,
  post: <ImageIcon className="size-3" />,
  STORY: <ImageIcon className="size-3" />,
  story: <ImageIcon className="size-3" />,
  TRACK: <Music className="size-3" />,
  track: <Music className="size-3" />,
  ALBUM: <Music className="size-3" />,
  album: <Music className="size-3" />,
  PLAYLIST: <Music className="size-3" />,
  playlist: <Music className="size-3" />,
};

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "\u2014";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "\u2014";
  }
}

function calcEngagement(views: number, likes: number): string {
  if (!views || views === 0) return "0%";
  return `${((likes / views) * 100).toFixed(1)}%`;
}

const isVideoType = (type: string) =>
  ["VIDEO", "video", "SHORT", "short", "REEL", "reel"].includes(type);
const isMusicType = (type: string) =>
  ["TRACK", "track", "ALBUM", "album", "PLAYLIST", "playlist"].includes(type);

// ── Component ──

export function ContentClient({ content }: ContentClientProps) {
  const [contentFilter, setContentFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let items = content;

    if (contentFilter === "VIDEOS") {
      items = content.filter((c) => isVideoType(c.contentType));
    } else if (contentFilter === "MUSIC") {
      items = content.filter((c) => isMusicType(c.contentType));
    }

    items = [...items].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortKey === "publishedAt") {
        aVal = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        bVal = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      } else if (sortKey === "engagement") {
        aVal = a.views > 0 ? a.likes / a.views : 0;
        bVal = b.views > 0 ? b.likes / b.views : 0;
      } else {
        aVal = a[sortKey] ?? 0;
        bVal = b[sortKey] ?? 0;
      }

      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return items;
  }, [content, contentFilter, sortKey, sortDir]);

  // Stats
  const totalVideos = content.length;
  const avgViews =
    totalVideos > 0
      ? Math.round(content.reduce((s, c) => s + c.views, 0) / totalVideos)
      : 0;
  const topVideo = content.reduce(
    (best, c) => (c.views > (best?.views ?? 0) ? c : best),
    content[0] as ContentItem | undefined
  );

  const SortableHeader = ({
    label,
    column,
  }: {
    label: string;
    column: SortKey;
  }) => (
    <button
      onClick={() => handleSort(column)}
      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
    >
      {label}
      <ArrowUpDown
        className={cn(
          "size-3",
          sortKey === column ? "text-zinc-300" : "text-zinc-600"
        )}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Desempenho de Conteúdo
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Análise detalhada do desempenho de cada conteúdo publicado.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-800">
                <Video className="size-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Total de conteúdos</p>
                <p className="text-lg font-bold text-white">{totalVideos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-800">
                <BarChart3 className="size-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Média de views</p>
                <p className="text-lg font-bold text-white">
                  {formatNumber(avgViews)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-800">
                <TrendingUp className="size-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Mais visualizado</p>
                <p
                  className="max-w-[180px] truncate text-sm font-bold text-white"
                  title={topVideo?.title ?? ""}
                >
                  {topVideo
                    ? `${topVideo.title} (${formatNumber(topVideo.views)})`
                    : "\u2014"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs
        defaultValue="ALL"
        onValueChange={(v) => setContentFilter(v as string)}
      >
        <TabsList>
          <TabsTrigger value="ALL">Todos</TabsTrigger>
          <TabsTrigger value="VIDEOS">Vídeos</TabsTrigger>
          <TabsTrigger value="MUSIC">Músicas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Table */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-white">
            Conteúdos
          </CardTitle>
          <CardDescription className="text-zinc-500">
            {filtered.length}{" "}
            {filtered.length === 1
              ? "conteúdo encontrado"
              : "conteúdos encontrados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <Inbox className="mb-3 size-10 text-zinc-600" />
              <p className="text-sm font-medium">
                Nenhum conteúdo encontrado
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Conecte suas plataformas e colete métricas para ver seus
                conteúdos aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-xs text-zinc-500">
                      Título
                    </TableHead>
                    <TableHead className="text-xs text-zinc-500">
                      Tipo
                    </TableHead>
                    <TableHead className="text-right">
                      <SortableHeader label="Visualizações" column="views" />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortableHeader label="Curtidas" column="likes" />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortableHeader
                        label="Comentários"
                        column="comments"
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortableHeader
                        label="Engajamento"
                        column="engagement"
                      />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortableHeader
                        label="Publicação"
                        column="publishedAt"
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-zinc-800/50 hover:bg-white/[0.02]"
                    >
                      {/* Title */}
                      <TableCell className="max-w-[280px]">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="line-clamp-1 text-sm font-medium text-white hover:text-zinc-300 transition-colors"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className="line-clamp-1 text-sm font-medium text-white">
                            {item.title}
                          </span>
                        )}
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="gap-1 border-zinc-800 text-zinc-400"
                        >
                          {contentTypeIcons[item.contentType]}
                          {contentTypeLabels[item.contentType] ||
                            item.contentType}
                        </Badge>
                      </TableCell>

                      {/* Views */}
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                          <Eye className="size-3 text-zinc-600" />
                          {formatNumber(item.views)}
                        </span>
                      </TableCell>

                      {/* Likes */}
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                          <Heart className="size-3 text-zinc-600" />
                          {formatNumber(item.likes)}
                        </span>
                      </TableCell>

                      {/* Comments */}
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                          <MessageCircle className="size-3 text-zinc-600" />
                          {formatNumber(item.comments)}
                        </span>
                      </TableCell>

                      {/* Engagement Rate */}
                      <TableCell className="text-right text-sm text-zinc-400">
                        {calcEngagement(item.views, item.likes)}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-right text-sm text-zinc-500">
                        {formatDate(item.publishedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
