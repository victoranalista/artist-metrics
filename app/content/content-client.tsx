"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  ImageIcon,
  FileVideo,
  Inbox,
} from "lucide-react";
import {
  cn,
  formatNumber,
  platformColors,
  platformNames,
} from "@/lib/utils";

// ── Types ──

interface ContentItem {
  id: string;
  contentId: string;
  contentType: string;
  title: string | null;
  thumbnailUrl: string | null;
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

type SortKey = "views" | "likes" | "comments" | "publishedAt";
type SortDirection = "asc" | "desc";

// ── Helpers ──

const contentTypeLabels: Record<string, string> = {
  VIDEO: "Video",
  SHORT: "Short",
  REEL: "Reel",
  POST: "Post",
  STORY: "Story",
  TRACK: "Faixa",
  ALBUM: "Album",
  PLAYLIST: "Playlist",
};

const contentTypeIcons: Record<string, React.ReactNode> = {
  VIDEO: <Play className="size-3" />,
  SHORT: <FileVideo className="size-3" />,
  REEL: <FileVideo className="size-3" />,
  POST: <ImageIcon className="size-3" />,
  STORY: <ImageIcon className="size-3" />,
  TRACK: <Music className="size-3" />,
  ALBUM: <Music className="size-3" />,
  PLAYLIST: <Music className="size-3" />,
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
    let items =
      platformFilter === "ALL"
        ? content
        : content.filter((c) => c.platform === platformFilter);

    items = [...items].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortKey === "publishedAt") {
        aVal = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        bVal = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }

      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return items;
  }, [content, platformFilter, sortKey, sortDir]);

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
          sortKey === column ? "text-violet-400" : "text-zinc-600"
        )}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Desempenho de Conteudo
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Analise detalhada do desempenho de cada conteudo publicado.
        </p>
      </div>

      {/* Platform Filter */}
      <Tabs
        defaultValue="ALL"
        onValueChange={(v) => setPlatformFilter(v as string)}
      >
        <TabsList>
          <TabsTrigger value="ALL">Todos</TabsTrigger>
          <TabsTrigger value="YOUTUBE">YouTube</TabsTrigger>
          <TabsTrigger value="INSTAGRAM">Instagram</TabsTrigger>
          <TabsTrigger value="SPOTIFY">Spotify</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Conteudos</CardTitle>
            <CardDescription>
              {filtered.length}{" "}
              {filtered.length === 1 ? "conteudo encontrado" : "conteudos encontrados"}
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
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="w-[60px] text-xs text-zinc-500">
                        Thumb
                      </TableHead>
                      <TableHead className="text-xs text-zinc-500">
                        Titulo
                      </TableHead>
                      <TableHead className="text-xs text-zinc-500">
                        Tipo
                      </TableHead>
                      <TableHead className="text-xs text-zinc-500">
                        Plataforma
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="Views" column="views" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader label="Curtidas" column="likes" />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader
                          label="Comentarios"
                          column="comments"
                        />
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
                        className="border-white/5 hover:bg-white/[0.02]"
                      >
                        {/* Thumbnail */}
                        <TableCell>
                          {item.thumbnailUrl ? (
                            <div className="relative size-10 overflow-hidden rounded-md bg-zinc-800">
                              <Image
                                src={item.thumbnailUrl}
                                alt={item.title ?? ""}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            </div>
                          ) : (
                            <div className="flex size-10 items-center justify-center rounded-md bg-zinc-800 text-zinc-600">
                              <Play className="size-4" />
                            </div>
                          )}
                        </TableCell>

                        {/* Title */}
                        <TableCell className="max-w-[260px]">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-1 text-sm font-medium text-white hover:text-violet-400 transition-colors"
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
                            className="gap-1 border-white/10 text-zinc-400"
                          >
                            {contentTypeIcons[item.contentType]}
                            {contentTypeLabels[item.contentType] ||
                              item.contentType}
                          </Badge>
                        </TableCell>

                        {/* Platform */}
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor:
                                  platformColors[item.platform],
                              }}
                            />
                            {platformNames[item.platform] || item.platform}
                          </div>
                        </TableCell>

                        {/* Views */}
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                            <Eye className="size-3 text-zinc-500" />
                            {formatNumber(item.views)}
                          </span>
                        </TableCell>

                        {/* Likes */}
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                            <Heart className="size-3 text-zinc-500" />
                            {formatNumber(item.likes)}
                          </span>
                        </TableCell>

                        {/* Comments */}
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-sm text-zinc-300">
                            <MessageCircle className="size-3 text-zinc-500" />
                            {formatNumber(item.comments)}
                          </span>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-right text-sm text-zinc-400">
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
      </motion.div>
    </div>
  );
}
