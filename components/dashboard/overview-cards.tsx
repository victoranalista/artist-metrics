"use client";

import { useMemo } from "react";
import { Users, Eye, PlayCircle, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import { MotionStagger, MotionItem } from "@/components/ui/motion-section";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

/* ---------- Mini Sparkline ---------- */

interface MiniSparklineProps {
  value: number;
  trend: number;
  color?: string;
}

function generateSparklineData(value: number, trend: number): { v: number }[] {
  const points = 14;
  const data: { v: number }[] = [];
  const dir = trend >= 0 ? 1 : -1;
  const base = Math.max(value * 0.65, 1);
  const range = Math.max(value * 0.35, 1);

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trendComponent = dir * progress * range;
    // Multiple sine waves for organic feel
    const noise = (
      Math.sin(i * 1.8 + value * 0.0017) * 0.18 +
      Math.sin(i * 3.1 + value * 0.003) * 0.12 +
      Math.cos(i * 0.7 + value * 0.002) * 0.08
    ) * range;
    data.push({ v: Math.max(0, base + trendComponent + noise) });
  }

  return data;
}

const CARD_COLORS = [
  "hsl(215, 70%, 60%)",  // azul
  "hsl(30, 60%, 65%)",   // bege/dourado
  "hsl(160, 45%, 55%)",  // verde suave
  "hsl(280, 40%, 60%)",  // lilás
];

function MiniSparkline({ value, trend, color }: MiniSparklineProps) {
  const data = useMemo(() => generateSparklineData(value, trend), [value, trend]);
  const c = color || CARD_COLORS[0];
  const id = `spark-${value}-${trend}`;

  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={0.3} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="basis"
            dataKey="v"
            stroke={c}
            strokeWidth={1.5}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Overview Cards ---------- */

interface OverviewData {
  totalFollowers: number;
  totalViews: number;
  totalContent: number;
  avgEngagement: number;
  growth: {
    followers: number;
    views: number;
    content: number;
    engagement: number;
  };
  viewsLabel?: string;
  watchHours?: number;
  recentLikes?: number;
  recentComments?: number;
  subsGained?: number;
}

interface OverviewCardsProps {
  data: OverviewData;
}

const cards = [
  {
    key: "followers" as const,
    label: "Inscritos",
    icon: Users,
    getValue: (d: OverviewData) => formatNumber(d.totalFollowers),
    getRaw: (d: OverviewData) => d.totalFollowers,
    getGrowth: (d: OverviewData) => d.growth.followers,
    getSubtext: (d: OverviewData) =>
      d.subsGained ? `+${d.subsGained} nos últimos 28 dias` : undefined,
  },
  {
    key: "views" as const,
    label: (d: OverviewData) => d.viewsLabel === "últimos 28 dias" ? "Views (28 dias)" : "Visualizações",
    icon: Eye,
    getValue: (d: OverviewData) => formatNumber(d.totalViews),
    getRaw: (d: OverviewData) => d.totalViews,
    getGrowth: (d: OverviewData) => d.growth.views,
    getSubtext: (d: OverviewData) =>
      d.watchHours ? `${formatNumber(d.watchHours)} horas assistidas` : undefined,
  },
  {
    key: "content" as const,
    label: "Vídeos Publicados",
    icon: PlayCircle,
    getValue: (d: OverviewData) => formatNumber(d.totalContent),
    getRaw: (d: OverviewData) => d.totalContent,
    getGrowth: (d: OverviewData) => d.growth.content,
    getSubtext: () => undefined,
  },
  {
    key: "engagement" as const,
    label: "Engajamento",
    icon: Activity,
    getValue: (d: OverviewData) => `${(d.avgEngagement * 100).toFixed(2)}%`,
    getRaw: (d: OverviewData) => d.avgEngagement * 100,
    getGrowth: (d: OverviewData) => d.growth.engagement,
    getSubtext: (d: OverviewData) => {
      const total = (d.recentLikes ?? 0) + (d.recentComments ?? 0);
      return total > 0 ? `${formatNumber(total)} interações (28 dias)` : undefined;
    },
  },
];

export function OverviewCards({ data }: OverviewCardsProps) {
  return (
    <MotionStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const growth = card.getGrowth(data);
        const rawValue = card.getRaw(data);
        const isPositive = growth > 0;
        const isZero = growth === 0;
        const label = typeof card.label === "function" ? card.label(data) : card.label;
        const subtext = card.getSubtext(data);

        return (
          <MotionItem key={card.key}>
            <Card className="border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
              <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-400">
                    {label}
                  </span>
                  <Icon className="size-4 text-zinc-600" />
                </div>

                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold tracking-tight text-white">
                    {card.getValue(data)}
                  </p>
                  <MiniSparkline value={rawValue} trend={growth} color={CARD_COLORS[cards.indexOf(card)]} />
                </div>

                {/* Subtext contextual ou growth */}
                {subtext ? (
                  <p className="text-xs text-zinc-500">{subtext}</p>
                ) : !isZero ? (
                  <div className="flex items-center gap-1">
                    {isPositive ? (
                      <TrendingUp className="size-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="size-3 text-red-500" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isPositive ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {growth.toFixed(1)}%
                    </span>
                    <span className="text-xs text-zinc-500">
                      últimos 28 dias
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">—</p>
                )}
              </CardContent>
            </Card>
          </MotionItem>
        );
      })}
    </MotionStagger>
  );
}
