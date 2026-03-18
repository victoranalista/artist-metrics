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
  trend: number; // positive = upward, negative = downward
}

function generateSparklineData(value: number, trend: number): { v: number }[] {
  const points = 8;
  const data: { v: number }[] = [];
  // Walk backwards from the current value, applying the trend direction
  // so the sparkline visually trends up or down toward the final point.
  const trendDirection = trend >= 0 ? 1 : -1;
  const base = Math.max(value * 0.7, 1);
  const range = Math.max(value * 0.3, 1);

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1); // 0 → 1
    const trendComponent = trendDirection * progress * range;
    // Add a small amount of noise so it doesn't look perfectly linear
    const noise = (Math.sin(i * 2.7 + value * 0.001) * 0.15 + Math.cos(i * 1.3) * 0.1) * range;
    data.push({ v: Math.max(0, base + trendComponent + noise) });
  }

  return data;
}

function MiniSparkline({ value, trend }: MiniSparklineProps) {
  const data = useMemo(() => generateSparklineData(value, trend), [value, trend]);

  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(161 161 170)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="rgb(161 161 170)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="rgb(161 161 170)"
            strokeWidth={1.5}
            fill="url(#sparkFill)"
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
  },
  {
    key: "views" as const,
    label: "Visualizações",
    icon: Eye,
    getValue: (d: OverviewData) => formatNumber(d.totalViews),
    getRaw: (d: OverviewData) => d.totalViews,
    getGrowth: (d: OverviewData) => d.growth.views,
  },
  {
    key: "content" as const,
    label: "Vídeos",
    icon: PlayCircle,
    getValue: (d: OverviewData) => formatNumber(d.totalContent),
    getRaw: (d: OverviewData) => d.totalContent,
    getGrowth: (d: OverviewData) => d.growth.content,
  },
  {
    key: "engagement" as const,
    label: "Engajamento",
    icon: Activity,
    getValue: (d: OverviewData) => `${d.avgEngagement.toFixed(1)}%`,
    getRaw: (d: OverviewData) => d.avgEngagement,
    getGrowth: (d: OverviewData) => d.growth.engagement,
  },
] as const;

export function OverviewCards({ data }: OverviewCardsProps) {
  return (
    <MotionStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const growth = card.getGrowth(data);
        const rawValue = card.getRaw(data);
        const isPositive = growth >= 0;

        return (
          <MotionItem key={card.key}>
            <Card className="border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
              <CardContent className="flex flex-col gap-3 py-5">
                {/* Top row: label + icon */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-400">
                    {card.label}
                  </span>
                  <Icon className="size-4 text-zinc-600" />
                </div>

                {/* Middle row: big number + sparkline */}
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold tracking-tight text-white">
                    {card.getValue(data)}
                  </p>
                  <MiniSparkline value={rawValue} trend={growth} />
                </div>

                {/* Bottom row: growth comparison */}
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
                    vs. período anterior
                  </span>
                </div>
              </CardContent>
            </Card>
          </MotionItem>
        );
      })}
    </MotionStagger>
  );
}
