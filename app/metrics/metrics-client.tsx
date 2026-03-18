"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Users,
  Eye,
  BarChart3,
  Clock,
  UserPlus,
  Share2,
  Heart,
  MessageSquare,
  Music,
  Headphones,
  Image,
  TrendingUp,
  Activity,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

// ── Types ──

interface HistoryPoint {
  id: string;
  platform: string;
  date: string;
  followers: number;
  totalViews: number;
  dailyViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  engagementRate: number;
  watchHours: number;
  subsGained: number;
}

interface SnapshotSummary {
  platform: string;
  followers: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  engagementRate: number;
  date: string;
  watchHours: number;
  retention: number;
  avgDuration: number;
  subsGained: number;
  subsLost: number;
  shares: number;
  monthlyListeners: number;
  totalStreams: number;
  mediaCount: number;
}

interface MetricsClientProps {
  history: HistoryPoint[];
  snapshots: SnapshotSummary[];
}

// ── Constants ──

const PERIODS = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;

const ALL_PLATFORMS = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const;

const PLATFORM_COLORS: Record<string, string> = {
  YOUTUBE: "hsl(215,70%,60%)",
  INSTAGRAM: "hsl(30,60%,65%)",
  SPOTIFY: "hsl(160,45%,55%)",
};

const PLATFORM_NAMES: Record<string, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  SPOTIFY: "Spotify",
};

// ── Helpers ──

function formatDate(value: string) {
  const d = new Date(value);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function sumField(arr: HistoryPoint[], platform: string, field: keyof HistoryPoint): number {
  return arr
    .filter((h) => h.platform === platform)
    .reduce((sum, h) => sum + (Number(h[field]) || 0), 0);
}

// ── Component ──

export function MetricsClient({ history, snapshots }: MetricsClientProps) {
  const [period, setPeriod] = useState("30");
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(
    new Set(ALL_PLATFORMS)
  );

  const togglePlatform = (platform: string) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        if (next.size > 1) next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  };

  // Connected platforms (those that have snapshot data)
  const connectedPlatforms = useMemo(
    () => ALL_PLATFORMS.filter((p) => snapshots.some((s) => s.platform === p)),
    [snapshots]
  );

  // Filter history by period
  const filteredHistory = useMemo(() => {
    const days = parseInt(period);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return history.filter(
      (h) => new Date(h.date) >= cutoff && activePlatforms.has(h.platform)
    );
  }, [history, period, activePlatforms]);

  const platforms = useMemo(
    () => ALL_PLATFORMS.filter((p) => activePlatforms.has(p)),
    [activePlatforms]
  );

  // ── Daily Views / Alcance / Streams chart data ──
  const dailyViewsChartData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    const sorted = [...filteredHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (const point of sorted) {
      const dateKey = point.date.split("T")[0];
      if (!map.has(dateKey)) map.set(dateKey, { date: dateKey });
      const row = map.get(dateKey)!;
      row[point.platform] = point.dailyViews;
    }
    return Array.from(map.values());
  }, [filteredHistory]);

  // ── Followers chart data ──
  const followersChartData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    const sorted = [...filteredHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (const point of sorted) {
      const dateKey = point.date.split("T")[0];
      if (!map.has(dateKey)) map.set(dateKey, { date: dateKey });
      const row = map.get(dateKey)!;
      row[point.platform] = point.followers;
    }
    return Array.from(map.values());
  }, [filteredHistory]);

  // ── Engagement chart data (likes + comments stacked) ──
  const engagementChartData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    const sorted = [...filteredHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (const point of sorted) {
      const dateKey = point.date.split("T")[0];
      if (!map.has(dateKey)) map.set(dateKey, { date: dateKey });
      const row = map.get(dateKey)!;
      row[point.platform] = (point.totalLikes || 0) + (point.totalComments || 0);
    }
    return Array.from(map.values());
  }, [filteredHistory]);

  // Chart configs
  const dailyViewsConfig: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        platforms.map((p) => [
          p,
          { label: PLATFORM_NAMES[p], color: PLATFORM_COLORS[p] },
        ])
      ),
    [platforms]
  );

  const followersConfig: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        platforms.map((p) => [
          p,
          { label: PLATFORM_NAMES[p], color: PLATFORM_COLORS[p] },
        ])
      ),
    [platforms]
  );

  const engagementConfig: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        platforms.map((p) => [
          p,
          { label: PLATFORM_NAMES[p], color: PLATFORM_COLORS[p] },
        ])
      ),
    [platforms]
  );

  // Snapshot helpers
  const ytSnapshot = snapshots.find((s) => s.platform === "YOUTUBE");
  const igSnapshot = snapshots.find((s) => s.platform === "INSTAGRAM");
  const spSnapshot = snapshots.find((s) => s.platform === "SPOTIFY");

  const hasData = history.length > 0;

  // YouTube history for the period
  const ytHistory = useMemo(
    () => filteredHistory.filter((h) => h.platform === "YOUTUBE"),
    [filteredHistory]
  );
  const igHistory = useMemo(
    () => filteredHistory.filter((h) => h.platform === "INSTAGRAM"),
    [filteredHistory]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analise de Metricas</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Acompanhe a evolucao detalhada das suas metricas por plataforma
        </p>
      </div>

      {/* ── Section 1: Period Filter + Platform Filter ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Period buttons */}
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p.value
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Platform toggles */}
        <div className="flex flex-wrap gap-2">
          {connectedPlatforms.map((platform) => (
            <button
              key={platform}
              onClick={() => togglePlatform(platform)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                activePlatforms.has(platform)
                  ? "border-zinc-700 bg-zinc-800 text-white"
                  : "border-zinc-800 bg-transparent text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: PLATFORM_COLORS[platform],
                  opacity: activePlatforms.has(platform) ? 1 : 0.4,
                }}
              />
              {PLATFORM_NAMES[platform]}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <BarChart3 className="mb-4 size-10 text-zinc-700" />
          <h3 className="text-base font-medium text-zinc-400">
            Sem dados de metricas
          </h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-600">
            Conecte uma plataforma e colete metricas para acompanhar a evolucao
          </p>
        </div>
      ) : (
        <>
          {/* ── Section 2: KPI Summary Cards (per platform) ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* YouTube KPI Card */}
            {ytSnapshot && activePlatforms.has("YOUTUBE") && (
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-zinc-400">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: PLATFORM_COLORS.YOUTUBE }}
                    />
                    YouTube
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">Inscritos</p>
                      <p className="text-xl font-bold text-white">
                        {formatNumber(ytSnapshot.followers)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Views (28d)</p>
                      <p className="text-xl font-bold text-white">
                        {formatNumber(ytSnapshot.totalViews)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="size-3" />
                      <span>{formatNumber(ytSnapshot.watchHours)}h assistidas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Activity className="size-3" />
                      <span>Retencao {formatPercent(ytSnapshot.retention)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <UserPlus className="size-3" />
                      <span>{formatNumber(ytSnapshot.subsGained)} ganhos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Share2 className="size-3" />
                      <span>{formatNumber(ytSnapshot.shares)} compartilhamentos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instagram KPI Card */}
            {igSnapshot && activePlatforms.has("INSTAGRAM") && (
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-zinc-400">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: PLATFORM_COLORS.INSTAGRAM }}
                    />
                    Instagram
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">Seguidores</p>
                      <p className="text-xl font-bold text-white">
                        {formatNumber(igSnapshot.followers)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Alcance (28d)</p>
                      <p className="text-xl font-bold text-white">
                        {formatNumber(
                          sumField(
                            filteredHistory,
                            "INSTAGRAM",
                            "dailyViews"
                          )
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Heart className="size-3" />
                      <span>{formatNumber(igSnapshot.totalLikes)} curtidas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <MessageSquare className="size-3" />
                      <span>{formatNumber(igSnapshot.totalComments)} comentarios</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Share2 className="size-3" />
                      <span>{formatNumber(igSnapshot.totalShares)} compartilhamentos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Image className="size-3" />
                      <span>{formatNumber(igSnapshot.mediaCount)} posts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Spotify KPI Card */}
            {spSnapshot && activePlatforms.has("SPOTIFY") && (
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-zinc-400">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: PLATFORM_COLORS.SPOTIFY }}
                    />
                    Spotify
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-zinc-500">Seguidores</p>
                      <p className="text-xl font-bold text-white">
                        {formatNumber(spSnapshot.followers)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Ouvintes Mensais</p>
                      <p className="text-xl font-bold text-white">
                        {formatNumber(spSnapshot.monthlyListeners)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Streams Totais</p>
                      <p className="text-xl font-bold text-white">
                        {formatNumber(spSnapshot.totalStreams)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Section 3: Daily Views / Alcance / Streams Area Chart ── */}
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Eye className="size-4 text-zinc-500" />
                Views Diarios / Alcance / Streams
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Visualizacoes diarias por plataforma no periodo selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyViewsChartData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-zinc-600 sm:h-[300px]">
                  Nenhum dado disponivel para o periodo selecionado
                </div>
              ) : (
                <ChartContainer config={dailyViewsConfig} className="h-[220px] w-full sm:h-[300px]">
                  <AreaChart
                    data={dailyViewsChartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      axisLine={{ stroke: "#27272a" }}
                      tickLine={false}
                      tickFormatter={formatDate}
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      axisLine={{ stroke: "#27272a" }}
                      tickLine={false}
                      tickFormatter={(v: number) => formatNumber(v)}
                      width={50}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => formatDate(String(value))}
                        />
                      }
                    />
                    {platforms.map((platform) => (
                      <Area
                        key={platform}
                        type="monotone"
                        dataKey={platform}
                        name={platform}
                        stroke={PLATFORM_COLORS[platform]}
                        fill={PLATFORM_COLORS[platform]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* ── Section 4 & 5: Followers + Engagement side-by-side ── */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Followers Growth Chart */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <Users className="size-4 text-zinc-500" />
                  Crescimento de Seguidores
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Evolucao do numero de seguidores por plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {followersChartData.length === 0 ? (
                  <div className="flex h-[200px] sm:h-[280px] items-center justify-center text-sm text-zinc-600">
                    Nenhum dado disponivel para o periodo selecionado
                  </div>
                ) : (
                  <ChartContainer config={followersConfig} className="h-[200px] sm:h-[280px] w-full">
                    <LineChart
                      data={followersChartData}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        tickFormatter={formatDate}
                      />
                      <YAxis
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        tickFormatter={(v: number) => formatNumber(v)}
                        width={55}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => formatDate(String(value))}
                          />
                        }
                      />
                      {platforms.map((platform) => (
                        <Line
                          key={platform}
                          type="monotone"
                          dataKey={platform}
                          name={platform}
                          stroke={PLATFORM_COLORS[platform]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Engagement Bar Chart (stacked) */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <BarChart3 className="size-4 text-zinc-500" />
                  Engajamento por Plataforma
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Curtidas + comentarios diarios (barras empilhadas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {engagementChartData.length === 0 ? (
                  <div className="flex h-[200px] sm:h-[280px] items-center justify-center text-sm text-zinc-600">
                    Nenhum dado disponivel para o periodo selecionado
                  </div>
                ) : (
                  <ChartContainer config={engagementConfig} className="h-[200px] sm:h-[280px] w-full">
                    <BarChart
                      data={engagementChartData}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        tickFormatter={formatDate}
                      />
                      <YAxis
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        tickFormatter={(v: number) => formatNumber(v)}
                        width={50}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => formatDate(String(value))}
                          />
                        }
                      />
                      {platforms.map((platform) => (
                        <Bar
                          key={platform}
                          dataKey={platform}
                          name={platform}
                          fill={PLATFORM_COLORS[platform]}
                          radius={[4, 4, 0, 0]}
                          opacity={0.85}
                          stackId="engagement"
                        />
                      ))}
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Section 6: YouTube Specific ── */}
          {ytSnapshot && activePlatforms.has("YOUTUBE") && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-300">
                YouTube - Detalhes
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Watch Hours */}
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Clock className="mb-2 size-6 text-zinc-500" />
                    <p className="text-xs text-zinc-500">Horas Assistidas</p>
                    <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                      {formatNumber(ytSnapshot.watchHours)}
                    </p>
                  </CardContent>
                </Card>

                {/* Retention */}
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Activity className="mb-2 size-6 text-zinc-500" />
                    <p className="text-xs text-zinc-500">Retencao Media</p>
                    <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                      {formatPercent(ytSnapshot.retention)}
                    </p>
                  </CardContent>
                </Card>

                {/* Avg Duration */}
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Eye className="mb-2 size-6 text-zinc-500" />
                    <p className="text-xs text-zinc-500">Duracao Media (s)</p>
                    <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                      {formatNumber(ytSnapshot.avgDuration)}
                    </p>
                  </CardContent>
                </Card>

                {/* Subs gained vs lost */}
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <UserPlus className="mb-2 size-6 text-zinc-500" />
                    <p className="text-xs text-zinc-500">Inscritos (ganhos / perdidos)</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-400">
                        +{formatNumber(ytSnapshot.subsGained)}
                      </span>
                      <span className="text-lg font-semibold text-red-400">
                        -{formatNumber(ytSnapshot.subsLost)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── Section 7: Instagram Specific ── */}
          {igSnapshot && activePlatforms.has("INSTAGRAM") && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-300">
                Instagram - Detalhes
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Reach */}
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Eye className="mb-2 size-6 text-zinc-500" />
                    <p className="text-xs text-zinc-500">Alcance Total (periodo)</p>
                    <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                      {formatNumber(
                        sumField(filteredHistory, "INSTAGRAM", "dailyViews")
                      )}
                    </p>
                  </CardContent>
                </Card>

                {/* New followers in period */}
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <UserPlus className="mb-2 size-6 text-zinc-500" />
                    <p className="text-xs text-zinc-500">Novos Seguidores (periodo)</p>
                    <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                      {formatNumber(
                        sumField(filteredHistory, "INSTAGRAM", "subsGained")
                      )}
                    </p>
                  </CardContent>
                </Card>

                {/* Engagement Rate */}
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <TrendingUp className="mb-2 size-6 text-zinc-500" />
                    <p className="text-xs text-zinc-500">Taxa de Engajamento</p>
                    <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                      {formatPercent(igSnapshot.engagementRate)}
                    </p>
                  </CardContent>
                </Card>

                {/* Media Count */}
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Image className="mb-2 size-6 text-zinc-500" />
                    <p className="text-xs text-zinc-500">Total de Posts</p>
                    <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                      {formatNumber(igSnapshot.mediaCount)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
