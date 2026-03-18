"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Label,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  LineChart as LineIcon,
  Radar as RadarIcon,
  Target,
} from "lucide-react";

// ── Colors ──

const COLORS = [
  "hsl(263, 70%, 58%)",   // violet
  "hsl(187, 72%, 55%)",   // cyan
  "hsl(349, 89%, 60%)",   // rose
  "hsl(160, 60%, 45%)",   // emerald
  "hsl(38, 92%, 60%)",    // amber
  "hsl(217, 91%, 60%)",   // blue
  "hsl(330, 81%, 60%)",   // pink
  "hsl(172, 66%, 50%)",   // teal
];

// ── Types ──

interface ChartData {
  type: "bar" | "line" | "pie" | "area" | "radar" | "metric" | "comparison" | "progress";
  title?: string;
  description?: string;
  data: Record<string, unknown>[];
  keys?: string[];
  colors?: string[];
  xKey?: string;
  footer?: string;
}

// ── Helpers ──

function buildConfig(keys: string[], colors: string[]): ChartConfig {
  const config: ChartConfig = {};
  keys.forEach((key, i) => {
    config[key] = {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: colors[i % colors.length],
    };
  });
  return config;
}

function formatVal(v: unknown): string {
  if (typeof v !== "number") return String(v ?? "");
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("pt-BR");
}

// ── Metric KPI Cards ──

function MetricCards({ data }: { data: ChartData }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {data.data.map((item, i) => {
        const label = (item.label ?? item.name ?? item.platform ?? "") as string;
        const value = (item.value ?? item.count ?? 0) as number;
        const change = (item.change ?? item.growth ?? null) as number | null;
        const isUp = change !== null && change > 0;
        const isDown = change !== null && change < 0;

        return (
          <Card key={i} className="border-white/5 bg-zinc-900/60 shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  {label}
                </p>
                {change !== null && (
                  <div
                    className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isUp
                        ? "bg-emerald-500/10 text-emerald-400"
                        : isDown
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-zinc-500/10 text-zinc-500"
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="size-2.5" />
                    ) : isDown ? (
                      <TrendingDown className="size-2.5" />
                    ) : (
                      <Minus className="size-2.5" />
                    )}
                    {isUp && "+"}
                    {change}%
                  </div>
                )}
              </div>
              <p className="mt-1 text-xl font-bold tracking-tight text-white">
                {formatVal(value)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Comparison / Progress Bars ──

function ComparisonBars({ data }: { data: ChartData }) {
  const items = data.data;
  const maxValue = Math.max(...items.map((d) => (d.value as number) || 0));

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const label = (item.label ?? item.name ?? "") as string;
        const value = (item.value ?? 0) as number;
        const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const color = data.colors?.[i] || COLORS[i % COLORS.length];

        return (
          <div key={i}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium text-zinc-300">{label}</span>
              <span className="text-sm font-bold text-white">{formatVal(value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Chart Icon ──

function ChartIcon({ type }: { type: string }) {
  switch (type) {
    case "pie":
      return <PieIcon className="size-3.5 text-violet-400" />;
    case "radar":
      return <RadarIcon className="size-3.5 text-violet-400" />;
    case "line":
      return <LineIcon className="size-3.5 text-violet-400" />;
    case "metric":
      return <Activity className="size-3.5 text-violet-400" />;
    case "comparison":
    case "progress":
      return <Target className="size-3.5 text-violet-400" />;
    default:
      return <BarChart3 className="size-3.5 text-violet-400" />;
  }
}

// ── Main Chart Renderer ──

export function InlineChart({ chartData }: { chartData: ChartData }) {
  const { type, title, description, data, keys, colors, footer } = chartData;
  const xKey = chartData.xKey || "name";
  const dataKeys =
    keys ||
    Object.keys(data[0] || {}).filter(
      (k) => k !== xKey && k !== "name" && k !== "label" && k !== "change" && k !== "growth"
    );
  const chartColors = colors || COLORS;
  const config = buildConfig(dataKeys, chartColors);

  // For pie charts, build config from data names
  const pieConfig: ChartConfig = {};
  if (type === "pie") {
    data.forEach((item, i) => {
      const name = (item[xKey] ?? item.name ?? `item${i}`) as string;
      pieConfig[name] = { label: name, color: chartColors[i % chartColors.length] };
    });
  }

  return (
    <Card className="my-3 border-white/5 bg-zinc-900/40 shadow-none">
      {(title || description) && (
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ChartIcon type={type} />
            {title && (
              <CardTitle className="text-sm font-semibold text-zinc-200">
                {title}
              </CardTitle>
            )}
          </div>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent className={title ? "pt-0" : ""}>
        {/* Metric KPI Cards */}
        {type === "metric" && <MetricCards data={chartData} />}

        {/* Comparison / Progress Bars */}
        {(type === "comparison" || type === "progress") && (
          <ComparisonBars data={chartData} />
        )}

        {/* Bar Chart */}
        {type === "bar" && (
          <ChartContainer config={config} className="min-h-[200px] w-full">
            <BarChart data={data as Record<string, string | number>[]} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={40} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {dataKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={`var(--color-${key})`}
                  radius={[6, 6, 0, 0]}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}

        {/* Line Chart */}
        {type === "line" && (
          <ChartContainer config={config} className="min-h-[200px] w-full">
            <LineChart data={data as Record<string, string | number>[]} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={40} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {dataKeys.map((key) => (
                <Line
                  key={key}
                  type="natural"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2.5}
                  dot={{ fill: `var(--color-${key})`, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}

        {/* Area Chart */}
        {type === "area" && (
          <ChartContainer config={config} className="min-h-[200px] w-full">
            <AreaChart data={data as Record<string, string | number>[]} accessibilityLayer>
              <defs>
                {dataKeys.map((key) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={40} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              {dataKeys.map((key) => (
                <Area
                  key={key}
                  type="natural"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  fill={`url(#fill-${key})`}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}

        {/* Pie / Donut Chart */}
        {type === "pie" && (
          <ChartContainer config={pieConfig} className="mx-auto min-h-[220px] max-w-[280px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data as Record<string, string | number>[]}
                dataKey={dataKeys[0] || "value"}
                nameKey={xKey}
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={chartColors[i % chartColors.length]} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const total = data.reduce(
                        (s, d) => s + ((d[dataKeys[0] || "value"] as number) || 0),
                        0
                      );
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-white text-2xl font-bold">
                            {formatVal(total)}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-zinc-500 text-[10px]">
                            Total
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}

        {/* Radar Chart */}
        {type === "radar" && (
          <ChartContainer config={config} className="mx-auto min-h-[250px] max-w-[320px]">
            <RadarChart data={data as Record<string, string | number>[]}>
              <ChartTooltip content={<ChartTooltipContent />} />
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} />
              {dataKeys.map((key, i) => (
                <Radar
                  key={key}
                  name={config[key]?.label as string ?? key}
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  fill={`var(--color-${key})`}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ChartContainer>
        )}

        {/* Footer */}
        {footer && (
          <p className="mt-2 text-center text-[10px] text-zinc-500">{footer}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Parser ──

export function parseChartsFromContent(content: string): {
  segments: { type: "text" | "chart"; content: string; chartData?: ChartData }[];
} {
  const segments: { type: "text" | "chart"; content: string; chartData?: ChartData }[] = [];
  const chartRegex = /```chart\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = chartRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }

    try {
      const chartData = JSON.parse(match[1]) as ChartData;
      segments.push({ type: "chart", content: match[0], chartData });
    } catch {
      segments.push({ type: "text", content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return { segments };
}
