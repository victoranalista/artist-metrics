"use client";

import { Users, Eye, PlayCircle, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

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
    getGrowth: (d: OverviewData) => d.growth.followers,
  },
  {
    key: "views" as const,
    label: "Visualizações",
    icon: Eye,
    getValue: (d: OverviewData) => formatNumber(d.totalViews),
    getGrowth: (d: OverviewData) => d.growth.views,
  },
  {
    key: "content" as const,
    label: "Vídeos",
    icon: PlayCircle,
    getValue: (d: OverviewData) => formatNumber(d.totalContent),
    getGrowth: (d: OverviewData) => d.growth.content,
  },
  {
    key: "engagement" as const,
    label: "Engajamento",
    icon: Activity,
    getValue: (d: OverviewData) => `${d.avgEngagement.toFixed(1)}%`,
    getGrowth: (d: OverviewData) => d.growth.engagement,
  },
] as const;

export function OverviewCards({ data }: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const growth = card.getGrowth(data);
        const isPositive = growth >= 0;

        return (
          <Card
            key={card.key}
            className="border-zinc-800 bg-zinc-900"
          >
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-400">
                  {card.label}
                </span>
                <Icon className="size-4 text-zinc-500" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-2xl font-bold tracking-tight text-white">
                {card.getValue(data)}
              </p>
              <div className="mt-1 flex items-center gap-1">
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
        );
      })}
    </div>
  );
}
