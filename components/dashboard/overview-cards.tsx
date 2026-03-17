"use client";

import { motion } from "framer-motion";
import { Users, Eye, PlayCircle, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    label: "Seguidores Total",
    icon: Users,
    getValue: (d: OverviewData) => formatNumber(d.totalFollowers),
    getGrowth: (d: OverviewData) => d.growth.followers,
  },
  {
    key: "views" as const,
    label: "Visualizacoes",
    icon: Eye,
    getValue: (d: OverviewData) => formatNumber(d.totalViews),
    getGrowth: (d: OverviewData) => d.growth.views,
  },
  {
    key: "content" as const,
    label: "Conteudos",
    icon: PlayCircle,
    getValue: (d: OverviewData) => formatNumber(d.totalContent),
    getGrowth: (d: OverviewData) => d.growth.content,
  },
  {
    key: "engagement" as const,
    label: "Engajamento Medio",
    icon: Activity,
    getValue: (d: OverviewData) => `${d.avgEngagement.toFixed(1)}%`,
    getGrowth: (d: OverviewData) => d.growth.engagement,
  },
] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function OverviewCards({ data }: OverviewCardsProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const growth = card.getGrowth(data);
        const isPositive = growth >= 0;

        return (
          <motion.div key={card.key} variants={item}>
            <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-400">
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold tracking-tight text-white">
                      {card.getValue(data)}
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10">
                    <Icon className="size-5 text-violet-400" />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  {isPositive ? (
                    <TrendingUp className="size-3.5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="size-3.5 text-red-400" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isPositive ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {growth.toFixed(1)}%
                  </span>
                  <span className="text-xs text-zinc-500">
                    vs. periodo anterior
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
