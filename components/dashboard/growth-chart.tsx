"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ChartDataPoint {
  date: string;
  platform: string;
  followers: number;
  views: number;
}

interface GrowthChartProps {
  data: ChartDataPoint[];
}

const chartConfig = {
  YOUTUBE: {
    label: "YouTube",
    color: "hsl(0 0% 63%)",
  },
  INSTAGRAM: {
    label: "Instagram",
    color: "hsl(0 0% 45%)",
  },
  SPOTIFY: {
    label: "Spotify",
    color: "hsl(0 0% 83%)",
  },
} satisfies ChartConfig;

const periods = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

const metrics = [
  { value: "followers", label: "Inscritos" },
  { value: "views", label: "Views" },
];

export function GrowthChart({ data }: GrowthChartProps) {
  const [timeRange, setTimeRange] = useState("90d");
  const [metric, setMetric] = useState<"followers" | "views">("followers");

  const platforms = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => set.add(d.platform));
    return Array.from(set);
  }, [data]);

  const pivotedData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    const sorted = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (const point of sorted) {
      if (!map.has(point.date)) {
        map.set(point.date, { date: point.date });
      }
      const row = map.get(point.date)!;
      row[point.platform] =
        metric === "followers" ? point.followers : point.views;
    }
    return Array.from(map.values());
  }, [data, metric]);

  const filteredData = useMemo(() => {
    if (pivotedData.length === 0) return [];
    const dates = pivotedData.map((d) => new Date(d.date as string).getTime());
    const maxDate = Math.max(...dates);
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const cutoff = maxDate - days * 24 * 60 * 60 * 1000;
    return pivotedData.filter(
      (d) => new Date(d.date as string).getTime() >= cutoff
    );
  }, [pivotedData, timeRange]);

  return (
    <Card className="border-zinc-800 bg-zinc-900 pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b border-zinc-800 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-sm font-semibold text-zinc-100">
            Crescimento
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            {metric === "followers" ? "Inscritos" : "Visualizacoes"} ao longo do tempo
          </CardDescription>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Metric toggle */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            {metrics.map((m) => (
              <button
                key={m.value}
                onClick={() => setMetric(m.value as "followers" | "views")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  metric === m.value
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {/* Period toggle */}
          <div className="hidden rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 sm:flex">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setTimeRange(p.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  timeRange === p.value
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {filteredData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-sm text-zinc-500">
              Sem dados para o periodo selecionado
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                {platforms.map((platform) => (
                  <linearGradient
                    key={platform}
                    id={`fill-${platform}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${platform})`}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${platform})`}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("pt-BR", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("pt-BR", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              {platforms.map((platform) => (
                <Area
                  key={platform}
                  dataKey={platform}
                  type="natural"
                  fill={`url(#fill-${platform})`}
                  stroke={`var(--color-${platform})`}
                  stackId="a"
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
