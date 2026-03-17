"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Eye,
  TrendingUp,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  formatNumber,
  formatPercent,
  platformColors,
  platformNames,
} from "@/lib/utils";

// ── Types ──

interface HistoryPoint {
  id: string;
  platform: string;
  date: string;
  followers: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  engagementRate: number;
}

interface SnapshotSummary {
  platform: string;
  followers: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  engagementRate: number;
  date: string;
}

interface MetricsClientProps {
  history: HistoryPoint[];
  snapshots: SnapshotSummary[];
}

// ── Tooltip ──

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    name: string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="mb-1.5 text-xs font-medium text-zinc-400">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <div
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-300">{entry.name}:</span>
          <span className="font-medium text-white">
            {formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Constants ──

const PERIODS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
] as const;

const ALL_PLATFORMS = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

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

  // Filter history by period
  const filteredHistory = useMemo(() => {
    const days = parseInt(period);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return history.filter(
      (h) =>
        new Date(h.date) >= cutoff && activePlatforms.has(h.platform)
    );
  }, [history, period, activePlatforms]);

  // Pivot data for line chart (followers over time)
  const followersChartData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    const sorted = [...filteredHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const point of sorted) {
      const dateKey = point.date.split("T")[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, { date: dateKey });
      }
      const row = map.get(dateKey)!;
      row[point.platform] = point.followers;
    }

    return Array.from(map.values());
  }, [filteredHistory]);

  // Pivot data for engagement bar chart
  const engagementChartData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    const sorted = [...filteredHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const point of sorted) {
      const dateKey = point.date.split("T")[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, { date: dateKey });
      }
      const row = map.get(dateKey)!;
      row[point.platform] = point.totalLikes + point.totalComments;
    }

    return Array.from(map.values());
  }, [filteredHistory]);

  const platforms = useMemo(
    () => ALL_PLATFORMS.filter((p) => activePlatforms.has(p)),
    [activePlatforms]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Analise de Metricas
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Acompanhe a evolucao detalhada das suas metricas por plataforma.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs defaultValue="30" onValueChange={(v) => setPeriod(v as string)}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          {ALL_PLATFORMS.map((platform) => (
            <Button
              key={platform}
              variant={activePlatforms.has(platform) ? "default" : "outline"}
              size="sm"
              onClick={() => togglePlatform(platform)}
              className="gap-1.5"
              style={
                activePlatforms.has(platform)
                  ? { backgroundColor: platformColors[platform], color: "#fff" }
                  : undefined
              }
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: platformColors[platform] }}
              />
              {platformNames[platform]}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {snapshots
          .filter((s) => activePlatforms.has(s.platform))
          .map((snapshot, i) => (
            <motion.div
              key={snapshot.platform}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={i}
            >
              <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor: platformColors[snapshot.platform],
                        }}
                      />
                      {platformNames[snapshot.platform]}
                    </CardDescription>
                    <Badge
                      variant="outline"
                      className="border-violet-500/30 text-violet-400"
                    >
                      <Activity className="mr-1 size-3" />
                      {formatPercent(snapshot.engagementRate)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500">Seguidores</p>
                      <p className="text-xl font-bold text-white">
                        {formatNumber(snapshot.followers)}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500">Visualizacoes</p>
                      <p className="text-xl font-bold text-white">
                        {formatNumber(snapshot.totalViews)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="size-3 text-violet-400" />
                      {formatNumber(snapshot.totalLikes)} curtidas
                    </span>
                    <span>
                      {formatNumber(snapshot.totalComments)} comentarios
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Followers Line Chart */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="size-4 text-violet-400" />
                Seguidores ao Longo do Tempo
              </CardTitle>
              <CardDescription>
                Evolucao do numero de seguidores por plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {followersChartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-zinc-500">
                  Nenhum dado disponivel para o periodo selecionado.
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
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
                        tickFormatter={(value: string) => {
                          const d = new Date(value);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        tickFormatter={(value: number) => formatNumber(value)}
                        width={50}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend
                        formatter={(value: string) =>
                          platformNames[value] || value
                        }
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      {platforms.map((platform) => (
                        <Line
                          key={platform}
                          type="monotone"
                          dataKey={platform}
                          name={platform}
                          stroke={platformColors[platform] || "#8b5cf6"}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Engagement Bar Chart */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="size-4 text-violet-400" />
                Engajamento por Plataforma
              </CardTitle>
              <CardDescription>
                Curtidas + comentarios ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {engagementChartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-zinc-500">
                  Nenhum dado disponivel para o periodo selecionado.
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
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
                        tickFormatter={(value: string) => {
                          const d = new Date(value);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        tickFormatter={(value: number) => formatNumber(value)}
                        width={50}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend
                        formatter={(value: string) =>
                          platformNames[value] || value
                        }
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      {platforms.map((platform) => (
                        <Bar
                          key={platform}
                          dataKey={platform}
                          name={platform}
                          fill={platformColors[platform] || "#8b5cf6"}
                          radius={[4, 4, 0, 0]}
                          opacity={0.85}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
