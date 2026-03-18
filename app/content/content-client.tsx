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
  Share2,
  Bookmark,
  Play,
  Music,
  FileVideo,
  ImageIcon,
  Inbox,
  Video,
  Trophy,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { cn, formatNumber, platformColors, platformNames } from "@/lib/utils";
import {
  MotionSection,
  MotionStagger,
  MotionItem,
} from "@/components/ui/motion-section";

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
  platformData: Record<string, unknown> | null;
}

interface ContentClientProps {
  content: ContentItem[];
}

type SortKey = "views" | "likes" | "comments" | "publishedAt";
type SortDirection = "asc" | "desc";

// ── Helpers ──

const contentTypeLabels: Record<string, string> = {
  VIDEO: "Video",
  video: "Video",
  SHORT: "Short",
  short: "Short",
  REEL: "Reel",
  reel: "Reel",
  POST: "Post",
  post: "Post",
  STORY: "Story",
  story: "Story",
  TRACK: "Musica",
  track: "Musica",
  ALBUM: "Album",
  album: "Album",
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

function displayVal(n: number): string {
  return n > 0 ? formatNumber(n) : "\u2014";
}

// ── Component ──

export function ContentClient({ content }: ContentClientProps) {
  const [platformFilter, setPlatformFilter] = useState("ALL");
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

    if (platformFilter === "YOUTUBE") {
      items = content.filter((c) => c.platform === "YOUTUBE");
    } else if (platformFilter === "INSTAGRAM") {
      items = content.filter((c) => c.platform === "INSTAGRAM");
    } else if (platformFilter === "SPOTIFY") {
      items = content.filter((c) => c.platform === "SPOTIFY");
    }

    items = [...items].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortKey === "publishedAt") {
        aVal = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        bVal = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      } else {
        aVal = a[sortKey] ?? 0;
        bVal = b[sortKey] ?? 0;
      }

      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return items;
  }, [content, platformFilter, sortKey, sortDir]);

  // Stats
  const totalCount = content.length;
  const topItem = content.length > 0 ? content[0] : null;
  const avgEngagement =
    totalCount > 0
      ? Math.round(
          content.reduce((s, c) => s + c.likes + c.comments, 0) / totalCount
        )
      : 0;

  // Group by platform
  const byPlatform = useMemo(() => {
    const groups: Record<string, ContentItem[]> = {};
    for (const c of content) {
      if (!groups[c.platform]) groups[c.platform] = [];
      groups[c.platform].push(c);
    }
    return groups;
  }, [content]);

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

  const filterTabs = [
    { key: "ALL", label: "Todos" },
    { key: "YOUTUBE", label: "YouTube" },
    { key: "INSTAGRAM", label: "Instagram" },
    { key: "SPOTIFY", label: "Spotify" },
  ];

  return (
    <div className="space-y-10">
      {/* ── Section 1: Resumo (3 cards) ── */}
      <MotionSection>
        <h2 className="mb-4 text-lg font-semibold text-white">Resumo</h2>
        <MotionStagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MotionItem>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                    <Video className="size-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Total de Conteudos</p>
                    <p className="text-2xl font-bold text-white">{totalCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionItem>
          <MotionItem>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                    <Trophy className="size-4 text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">Conteudo Mais Popular</p>
                    <p className="truncate text-sm font-bold text-white" title={topItem?.title}>
                      {topItem?.title ?? "\u2014"}
                    </p>
                    {topItem && (
                      <p className="text-xs text-zinc-600">
                        {platformNames[topItem.platform]} - {formatNumber(topItem.views)} views
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionItem>
          <MotionItem>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                    <BarChart3 className="size-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Engajamento Medio</p>
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(avgEngagement)}
                    </p>
                    <p className="text-xs text-zinc-600">curtidas + comentarios por conteudo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionItem>
        </MotionStagger>
      </MotionSection>

      {/* ── Section 2: Destaque (hero card) ── */}
      {topItem && (
        <MotionSection delay={0.1}>
          <h2 className="mb-4 text-lg font-semibold text-white">Destaque</h2>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="pt-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className="border-zinc-700 text-zinc-400"
                    >
                      <span
                        className="mr-1 inline-block size-1.5 rounded-full"
                        style={{ backgroundColor: platformColors[topItem.platform] }}
                      />
                      {platformNames[topItem.platform]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="gap-1 border-zinc-700 text-zinc-400"
                    >
                      {contentTypeIcons[topItem.contentType]}
                      {contentTypeLabels[topItem.contentType] ?? topItem.contentType}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {topItem.title}
                  </h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    {formatDate(topItem.publishedAt)}
                  </p>

                  {/* Mini KPI grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <p className="flex items-center gap-1 text-xs text-zinc-500">
                        <Eye className="size-3" /> Views
                      </p>
                      <p className="text-sm font-bold text-white">
                        {displayVal(topItem.views)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <p className="flex items-center gap-1 text-xs text-zinc-500">
                        <Heart className="size-3" /> Curtidas
                      </p>
                      <p className="text-sm font-bold text-white">
                        {displayVal(topItem.likes)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <p className="flex items-center gap-1 text-xs text-zinc-500">
                        <MessageCircle className="size-3" /> Comentarios
                      </p>
                      <p className="text-sm font-bold text-white">
                        {displayVal(topItem.comments)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <p className="flex items-center gap-1 text-xs text-zinc-500">
                        <Share2 className="size-3" /> Shares
                      </p>
                      <p className="text-sm font-bold text-white">
                        {displayVal(topItem.shares)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <p className="flex items-center gap-1 text-xs text-zinc-500">
                        <Bookmark className="size-3" /> Salvos
                      </p>
                      <p className="text-sm font-bold text-white">
                        {displayVal(topItem.saves)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Link */}
                {topItem.url && (
                  <div className="shrink-0">
                    <a
                      href={topItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                    >
                      <ExternalLink className="size-4" />
                      Abrir
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </MotionSection>
      )}

      {/* ── Section 3: Performance por Plataforma ── */}
      {Object.keys(byPlatform).length > 0 && (
        <MotionSection delay={0.15}>
          <h2 className="mb-4 text-lg font-semibold text-white">Performance por Plataforma</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const).map((plat) => {
              const items = byPlatform[plat];
              if (!items || items.length === 0) return null;
              const top3 = items.slice(0, 3);
              return (
                <Card key={plat} className="border-zinc-800 bg-zinc-900">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm font-medium text-zinc-300">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: platformColors[plat] }}
                        />
                        {platformNames[plat]}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {items.length} conteudo{items.length !== 1 ? "s" : ""}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {top3.map((item, i) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3"
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-xs font-bold text-zinc-500">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              {item.views > 0 && (
                                <span className="flex items-center gap-1">
                                  <Eye className="size-3" />
                                  {formatNumber(item.views)}
                                </span>
                              )}
                              {item.likes > 0 && (
                                <span className="flex items-center gap-1">
                                  <Heart className="size-3" />
                                  {formatNumber(item.likes)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </MotionSection>
      )}

      {/* ── Section 4: Todos os Conteudos (table) ── */}
      <MotionSection delay={0.2}>
        <h2 className="mb-4 text-lg font-semibold text-white">Todos os Conteudos</h2>

        {/* Filter tabs */}
        <div className="mb-4 flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 w-fit">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPlatformFilter(tab.key)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                platformFilter === tab.key
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-white">
              Conteudos
            </CardTitle>
            <CardDescription className="text-zinc-500">
              {filtered.length}{" "}
              {filtered.length === 1
                ? "conteudo encontrado"
                : "conteudos encontrados"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <Inbox className="mb-3 size-10 text-zinc-600" />
                <p className="text-sm font-medium">
                  Nenhum conteudo encontrado
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Conecte suas plataformas e colete metricas para ver seus
                  conteudos aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-xs text-zinc-500">
                        Titulo
                      </TableHead>
                      <TableHead className="text-xs text-zinc-500">
                        Plataforma
                      </TableHead>
                      <TableHead className="text-xs text-zinc-500">
                        Tipo
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="Alcance" column="views" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="Curtidas" column="likes" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="Comentarios" column="comments" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="Data" column="publishedAt" />
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

                        {/* Platform */}
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: platformColors[item.platform] }}
                            />
                            {platformNames[item.platform] ?? item.platform}
                          </span>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="gap-1 border-zinc-800 text-zinc-400"
                          >
                            {contentTypeIcons[item.contentType]}
                            {contentTypeLabels[item.contentType] ?? item.contentType}
                          </Badge>
                        </TableCell>

                        {/* Views */}
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                            <Eye className="size-3 text-zinc-600" />
                            {displayVal(item.views)}
                          </span>
                        </TableCell>

                        {/* Likes */}
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                            <Heart className="size-3 text-zinc-600" />
                            {displayVal(item.likes)}
                          </span>
                        </TableCell>

                        {/* Comments */}
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                            <MessageCircle className="size-3 text-zinc-600" />
                            {displayVal(item.comments)}
                          </span>
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
      </MotionSection>
    </div>
  );
}
