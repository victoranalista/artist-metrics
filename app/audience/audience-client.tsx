"use client";

import {
  Users,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  FileText,
  Globe,
  Radio,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MotionSection,
  MotionStagger,
  MotionItem,
} from "@/components/ui/motion-section";
import { formatNumber, platformColors, platformNames } from "@/lib/utils";

// ── Types ──

interface EngagementData {
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  engagementRate: number;
  contentCount: number;
}

interface TopContentItem {
  title: string;
  platform: string;
  likes: number;
  views: number;
  comments: number;
  date: string | null;
  url: string | null;
  contentType: string;
}

interface AudienceClientProps {
  hasConnections: boolean;
  totalFollowers: number;
  totalGrowth28d: number;
  totalReach28d: number;
  overallEngagementRate: number;
  hoursWatched: number;
  totalContentCount: number;
  platformFollowers: Record<string, number>;
  topCountries: Record<string, number> | null;
  trafficSources: Record<string, number> | null;
  engagementByPlatform: Record<string, EngagementData>;
  topContent: TopContentItem[];
}

// ── Labels ──

const COUNTRY_LABELS: Record<string, string> = {
  BR: "Brasil",
  US: "Estados Unidos",
  PT: "Portugal",
  MZ: "Moçambique",
  AO: "Angola",
  CV: "Cabo Verde",
  GW: "Guiné-Bissau",
  TL: "Timor-Leste",
  FR: "França",
  ES: "Espanha",
  GB: "Reino Unido",
  DE: "Alemanha",
  IT: "Itália",
  JP: "Japão",
  MX: "México",
  AR: "Argentina",
  CO: "Colômbia",
  CL: "Chile",
  PE: "Peru",
  IN: "Índia",
};

const TRAFFIC_SOURCE_LABELS: Record<string, string> = {
  SHORTS: "YouTube Shorts",
  YT_SEARCH: "Busca no YouTube",
  SUBSCRIBER: "Inscritos",
  YT_CHANNEL: "Página do Canal",
  EXT_URL: "Links Externos",
  PLAYLIST: "Playlists",
  SEARCH: "Pesquisa",
  SUGGESTED: "Sugeridos",
  BROWSE_FEATURES: "Navegação",
  EXTERNAL: "Externo",
  NOTIFICATION: "Notificações",
  RELATED_VIDEO: "Vídeos Relacionados",
  ADVERTISING: "Publicidade",
  NO_LINK_EMBEDDED: "Incorporado",
  NO_LINK_OTHER: "Outro",
  END_SCREEN: "Tela Final",
  ANNOTATION: "Anotação",
  CAMPAIGN_CARD: "Cartão de Campanha",
  HASHTAGS: "Hashtags",
  LIVE_REDIRECT: "Redirect ao Vivo",
  PROMOTED: "Promovido",
  YT_OTHER_PAGE: "Outra Página YT",
  YT_PLAYLIST_PAGE: "Página Playlist",
  VIDEO_REMIXES: "Remixes",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  VIDEO: "Vídeo",
  video: "Vídeo",
  SHORT: "Short",
  short: "Short",
  REEL: "Reel",
  reel: "Reel",
  POST: "Post",
  post: "Post",
  TRACK: "Música",
  track: "Música",
  ALBUM: "Álbum",
  album: "Álbum",
};

// ── Helpers ──

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

// ── Stat Card ──

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-lg font-bold text-white">{value}</p>
            {detail && (
              <p className="text-xs text-zinc-500">{detail}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Horizontal Bar Section ──

function HorizontalBars({
  title,
  icon,
  data,
  labelMap,
  formatValue,
}: {
  title: string;
  icon: React.ReactNode;
  data: Record<string, number>;
  labelMap?: Record<string, string>;
  formatValue?: (v: number) => string;
}) {
  const sorted = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const maxValue = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sorted.map(([key, value]) => {
            const label = labelMap?.[key] || key;
            const displayValue = formatValue
              ? formatValue(value)
              : value.toLocaleString("pt-BR");
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{label}</span>
                  <span className="font-medium text-white">{displayValue}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-500 transition-all duration-500"
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <p className="text-sm text-zinc-600">Sem dados disponíveis</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty State ──

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 py-16 text-center">
      <Users className="mb-4 size-10 text-zinc-700" />
      <h3 className="text-base font-medium text-zinc-400">
        Sem dados de audiência
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-600">{message}</p>
    </div>
  );
}

// ── Main Component ──

export function AudienceClient({
  hasConnections,
  totalFollowers,
  totalGrowth28d,
  totalReach28d,
  overallEngagementRate,
  hoursWatched,
  totalContentCount,
  platformFollowers,
  topCountries,
  trafficSources,
  engagementByPlatform,
  topContent,
}: AudienceClientProps) {
  if (!hasConnections) {
    return (
      <EmptyState message="Conecte uma plataforma e colete métricas para ver dados de audiência" />
    );
  }

  const platformOrder = ["INSTAGRAM", "YOUTUBE", "SPOTIFY"] as const;
  const maxFollowers = Math.max(...Object.values(platformFollowers), 1);

  return (
    <div className="space-y-10">
      {/* ── Section 1: Overview Cards ── */}
      <MotionSection>
        <h2 className="mb-4 text-lg font-semibold text-white">Visão Geral</h2>
        <MotionStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MotionItem>
            <StatCard
              icon={<Users className="size-4 text-zinc-400" />}
              label="Total de Seguidores"
              value={totalFollowers.toLocaleString("pt-BR")}
              detail="Todas as plataformas"
            />
          </MotionItem>
          <MotionItem>
            <StatCard
              icon={<TrendingUp className="size-4 text-zinc-400" />}
              label="Crescimento 28 dias"
              value={`${totalGrowth28d >= 0 ? "+" : ""}${totalGrowth28d.toLocaleString("pt-BR")}`}
              detail="Novos seguidores"
            />
          </MotionItem>
          <MotionItem>
            <StatCard
              icon={<Eye className="size-4 text-zinc-400" />}
              label="Alcance Total 28d"
              value={formatNumber(totalReach28d)}
              detail="Views + alcance"
            />
          </MotionItem>
          <MotionItem>
            <StatCard
              icon={<Heart className="size-4 text-zinc-400" />}
              label="Taxa de Engajamento"
              value={`${overallEngagementRate}%`}
              detail="Ponderada por views"
            />
          </MotionItem>
          <MotionItem>
            <StatCard
              icon={<Clock className="size-4 text-zinc-400" />}
              label="Horas Assistidas"
              value={hoursWatched > 0 ? hoursWatched.toLocaleString("pt-BR") : "\u2014"}
              detail="YouTube (28 dias)"
            />
          </MotionItem>
          <MotionItem>
            <StatCard
              icon={<FileText className="size-4 text-zinc-400" />}
              label="Conteúdos Publicados"
              value={totalContentCount.toString()}
              detail="Total em todas as plataformas"
            />
          </MotionItem>
        </MotionStagger>
      </MotionSection>

      {/* ── Section 2: Público por Plataforma ── */}
      <MotionSection delay={0.1}>
        <h2 className="mb-4 text-lg font-semibold text-white">Público por Plataforma</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformOrder.map((plat) => {
            const followers = platformFollowers[plat] ?? 0;
            if (followers === 0) return null;
            const pct = (followers / maxFollowers) * 100;
            return (
              <Card key={plat} className="border-zinc-800 bg-zinc-900">
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: platformColors[plat] }}
                    />
                    <span className="text-sm font-medium text-zinc-300">
                      {platformNames[plat]}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mb-2">
                    {followers.toLocaleString("pt-BR")}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: platformColors[plat],
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    {Math.round((followers / totalFollowers) * 100)}% do total
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </MotionSection>

      {/* ── Section 3: De Onde Vem Seu Público (Countries) ── */}
      {topCountries && Object.keys(topCountries).length > 0 && (
        <MotionSection delay={0.15}>
          <h2 className="mb-4 text-lg font-semibold text-white">De Onde Vem Seu Público</h2>
          <HorizontalBars
            title="Países por visualizações"
            icon={<Globe className="size-4 text-zinc-500" />}
            data={topCountries}
            labelMap={COUNTRY_LABELS}
            formatValue={(v) => v.toLocaleString("pt-BR")}
          />
        </MotionSection>
      )}

      {/* ── Section 4: Como Te Encontram (Traffic Sources) ── */}
      {trafficSources && Object.keys(trafficSources).length > 0 && (
        <MotionSection delay={0.2}>
          <h2 className="mb-4 text-lg font-semibold text-white">Como Te Encontram</h2>
          <HorizontalBars
            title="Fontes de tráfego"
            icon={<Radio className="size-4 text-zinc-500" />}
            data={trafficSources}
            labelMap={TRAFFIC_SOURCE_LABELS}
            formatValue={(v) => v.toLocaleString("pt-BR")}
          />
        </MotionSection>
      )}

      {/* ── Section 5: Análise de Engajamento ── */}
      {Object.keys(engagementByPlatform).length > 0 && (
        <MotionSection delay={0.25}>
          <h2 className="mb-4 text-lg font-semibold text-white">Análise de Engajamento</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(["INSTAGRAM", "YOUTUBE", "SPOTIFY"] as const).map((plat) => {
              const data = engagementByPlatform[plat];
              if (!data) return null;
              return (
                <Card key={plat} className="border-zinc-800 bg-zinc-900">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: platformColors[plat] }}
                      />
                      {platformNames[plat]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Eye className="size-3" />
                          Média de views
                        </span>
                        <span className="text-sm font-medium text-white">
                          {formatNumber(data.avgViews)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Heart className="size-3" />
                          Média de curtidas
                        </span>
                        <span className="text-sm font-medium text-white">
                          {formatNumber(data.avgLikes)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <MessageCircle className="size-3" />
                          Média de comentários
                        </span>
                        <span className="text-sm font-medium text-white">
                          {formatNumber(data.avgComments)}
                        </span>
                      </div>
                      <div className="border-t border-zinc-800 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <BarChart3 className="size-3" />
                            Taxa de engajamento
                          </span>
                          <span className="text-sm font-bold text-white">
                            {data.engagementRate}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600">
                        Baseado em {data.contentCount} conteúdo{data.contentCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </MotionSection>
      )}

      {/* ── Section 6: Melhores Conteúdos ── */}
      {topContent.length > 0 && (
        <MotionSection delay={0.3}>
          <h2 className="mb-4 text-lg font-semibold text-white">Melhores Conteúdos</h2>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="pt-0">
              <div className="divide-y divide-zinc-800">
                {topContent.map((item, i) => (
                  <div
                    key={`${item.platform}-${item.title}-${i}`}
                    className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0 sm:flex-nowrap sm:gap-4"
                  >
                    {/* Rank */}
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-400">
                      {i + 1}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-sm font-medium text-white hover:text-zinc-300 transition-colors"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className="truncate text-sm font-medium text-white">
                            {item.title}
                          </span>
                        )}
                        {item.url && (
                          <ExternalLink className="size-3 shrink-0 text-zinc-600" />
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-zinc-700 text-zinc-400"
                        >
                          <span
                            className="mr-1 inline-block size-1.5 rounded-full"
                            style={{ backgroundColor: platformColors[item.platform] }}
                          />
                          {platformNames[item.platform] ?? item.platform}
                        </Badge>
                        <span className="text-xs text-zinc-600">
                          {CONTENT_TYPE_LABELS[item.contentType] ?? item.contentType}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {formatDate(item.date)}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-zinc-400 sm:gap-4">
                      {item.views > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="size-3 text-zinc-600" />
                          {formatNumber(item.views)}
                        </span>
                      )}
                      {item.likes > 0 && (
                        <span className="flex items-center gap-1">
                          <Heart className="size-3 text-zinc-600" />
                          {formatNumber(item.likes)}
                        </span>
                      )}
                      {item.comments > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="size-3 text-zinc-600" />
                          {formatNumber(item.comments)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </MotionSection>
      )}
    </div>
  );
}
