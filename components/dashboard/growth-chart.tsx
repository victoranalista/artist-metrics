"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatNumber, platformColors, platformNames } from "@/lib/utils";

interface ChartDataPoint {
  date: string;
  platform: string;
  followers: number;
  views: number;
}

interface GrowthChartProps {
  data: ChartDataPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
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

export function GrowthChart({ data }: GrowthChartProps) {
  const [activeTab, setActiveTab] = useState("followers");

  const platforms = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => set.add(d.platform));
    return Array.from(set);
  }, [data]);

  // Pivot data: group by date, each platform becomes a column
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
      row[`${point.platform}_followers`] = point.followers;
      row[`${point.platform}_views`] = point.views;
    }

    return Array.from(map.values());
  }, [data]);

  const metric = activeTab === "followers" ? "followers" : "views";

  return (
    <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Crescimento</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="followers"
          onValueChange={(val) => setActiveTab(val as string)}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="followers">Seguidores</TabsTrigger>
            <TabsTrigger value="views">Visualizacoes</TabsTrigger>
          </TabsList>

          <TabsContent value="followers">
            <ChartArea
              data={pivotedData}
              platforms={platforms}
              metric="followers"
            />
          </TabsContent>
          <TabsContent value="views">
            <ChartArea
              data={pivotedData}
              platforms={platforms}
              metric="views"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ChartArea({
  data,
  platforms,
  metric,
}: {
  data: Record<string, number | string>[];
  platforms: string[];
  metric: string;
}) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            {platforms.map((platform) => (
              <linearGradient
                key={platform}
                id={`gradient-${platform}-${metric}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={platformColors[platform] || "#8b5cf6"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={platformColors[platform] || "#8b5cf6"}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
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
            formatter={(value: string) => {
              const platform = value.replace(`_${metric}`, "");
              return platformNames[platform] || platform;
            }}
            wrapperStyle={{ fontSize: 12 }}
          />
          {platforms.map((platform) => (
            <Area
              key={platform}
              type="monotone"
              dataKey={`${platform}_${metric}`}
              name={`${platform}_${metric}`}
              stroke={platformColors[platform] || "#8b5cf6"}
              fill={`url(#gradient-${platform}-${metric})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
