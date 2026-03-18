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
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ── Soft neutral palette ──

const PALETTE = [
  "#a8a29e", // stone-400
  "#d6d3d1", // stone-300
  "#78716c", // stone-500
  "#e7e5e4", // stone-200
  "#57534e", // stone-600
  "#c8c2bc", // warm gray
  "#9c9590", // muted beige
  "#b8b2ab", // soft taupe
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
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
      color: colors[i % colors.length],
    };
  });
  return config;
}

function fmt(v: unknown): string {
  if (typeof v !== "number") return String(v ?? "");
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("pt-BR");
}

// ── KPI Metric Cards ──

function MetricCards({ data }: { data: ChartData }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {data.data.map((item, i) => {
        const label = (item.label ?? item.name ?? item.platform ?? "") as string;
        const value = (item.value ?? item.count ?? 0) as number;
        const change = (item.change ?? item.growth ?? null) as number | null;
        const isUp = change !== null && change > 0;
        const isDown = change !== null && change < 0;

        return (
          <div
            key={i}
            className="rounded-xl border border-stone-200/10 bg-stone-100/[0.03] p-4"
          >
            <p className="text-[11px] font-medium text-stone-500">{label}</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-200">
              {fmt(value)}
            </p>
            {change !== null && (
              <div className="mt-2 flex items-center gap-1">
                {isUp ? (
                  <TrendingUp className="size-3 text-stone-400" />
                ) : isDown ? (
                  <TrendingDown className="size-3 text-stone-500" />
                ) : (
                  <Minus className="size-3 text-stone-600" />
                )}
                <span
                  className={`text-xs font-medium ${
                    isUp ? "text-stone-300" : isDown ? "text-stone-500" : "text-stone-600"
                  }`}
                >
                  {isUp && "+"}
                  {change}%
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Comparison Bars ──

function ComparisonBars({ data }: { data: ChartData }) {
  const items = data.data;
  const maxValue = Math.max(...items.map((d) => (d.value as number) || 0));

  return (
    <div className="space-y-4">
      {items.map((item, i) => {
        const label = (item.label ?? item.name ?? "") as string;
        const value = (item.value ?? 0) as number;
        const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

        return (
          <div key={i}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm text-stone-400">{label}</span>
              <span className="font-mono text-sm font-medium text-stone-300">
                {fmt(value)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-800/40">
              <div
                className="h-full rounded-full bg-stone-400/70 transition-all duration-1000 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Chart Renderer ──

export function InlineChart({ chartData }: { chartData: ChartData }) {
  const { type, title, description, data, keys, colors, footer } = chartData;
  const xKey = chartData.xKey || "name";
  const dataKeys =
    keys ||
    Object.keys(data[0] || {}).filter(
      (k) =>
        k !== xKey &&
        k !== "name" &&
        k !== "label" &&
        k !== "change" &&
        k !== "growth"
    );
  const chartColors = colors || PALETTE;
  const config = buildConfig(dataKeys, chartColors);

  const pieConfig: ChartConfig = {};
  if (type === "pie") {
    data.forEach((item, i) => {
      const name = (item[xKey] ?? item.name ?? `item${i}`) as string;
      pieConfig[name] = {
        label: name,
        color: chartColors[i % chartColors.length],
      };
    });
  }

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-stone-300/10 bg-stone-900/20">
      {/* Header */}
      {(title || description) && (
        <div className="border-b border-stone-300/5 px-5 py-3">
          {title && (
            <h4 className="text-[13px] font-semibold tracking-tight text-stone-300">
              {title}
            </h4>
          )}
          {description && (
            <p className="mt-0.5 text-[11px] text-stone-500">{description}</p>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-5">
        {type === "metric" && <MetricCards data={chartData} />}

        {(type === "comparison" || type === "progress") && (
          <ComparisonBars data={chartData} />
        )}

        {type === "bar" && (
          <ChartContainer config={config} className="min-h-[200px] w-full">
            <BarChart
              data={data as Record<string, string | number>[]}
              accessibilityLayer
            >
              <CartesianGrid
                vertical={false}
                stroke="rgba(168,162,158,0.08)"
              />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#78716c" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#57534e" }}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {dataKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={`var(--color-${key})`}
                  radius={[4, 4, 0, 0]}
                  opacity={0.85}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}

        {type === "line" && (
          <ChartContainer config={config} className="min-h-[200px] w-full">
            <LineChart
              data={data as Record<string, string | number>[]}
              accessibilityLayer
            >
              <CartesianGrid
                vertical={false}
                stroke="rgba(168,162,158,0.08)"
              />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#78716c" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#57534e" }}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {dataKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={{ fill: `var(--color-${key})`, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}

        {type === "area" && (
          <ChartContainer config={config} className="min-h-[200px] w-full">
            <AreaChart
              data={data as Record<string, string | number>[]}
              accessibilityLayer
            >
              <defs>
                {dataKeys.map((key) => (
                  <linearGradient
                    key={key}
                    id={`area-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="rgba(168,162,158,0.08)"
              />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#78716c" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#57534e" }}
                width={40}
              />
              <ChartTooltip
                content={<ChartTooltipContent indicator="dot" />}
              />
              {dataKeys.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={1.5}
                  fill={`url(#area-${key})`}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}

        {type === "pie" && (
          <ChartContainer
            config={pieConfig}
            className="mx-auto min-h-[220px] max-w-[260px]"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data as Record<string, string | number>[]}
                dataKey={dataKeys[0] || "value"}
                nameKey={xKey}
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={chartColors[i % chartColors.length]}
                    opacity={0.8}
                  />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const total = data.reduce(
                        (s, d) =>
                          s +
                          ((d[dataKeys[0] || "value"] as number) || 0),
                        0
                      );
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-stone-200 text-xl font-semibold"
                          >
                            {fmt(total)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 18}
                            className="fill-stone-500 text-[10px]"
                          >
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

        {type === "radar" && (
          <ChartContainer
            config={config}
            className="mx-auto min-h-[240px] max-w-[300px]"
          >
            <RadarChart data={data as Record<string, string | number>[]}>
              <ChartTooltip content={<ChartTooltipContent />} />
              <PolarGrid stroke="rgba(168,162,158,0.12)" />
              <PolarAngleAxis
                dataKey={xKey}
                tick={{ fontSize: 10, fill: "#78716c" }}
              />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: "#57534e" }} />
              {dataKeys.map((key) => (
                <Radar
                  key={key}
                  name={(config[key]?.label as string) ?? key}
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  fill={`var(--color-${key})`}
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
              ))}
            </RadarChart>
          </ChartContainer>
        )}

        {footer && (
          <p className="mt-3 text-center text-[10px] text-stone-600">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Parser ──

export function parseChartsFromContent(content: string): {
  segments: {
    type: "text" | "chart";
    content: string;
    chartData?: ChartData;
  }[];
} {
  const segments: {
    type: "text" | "chart";
    content: string;
    chartData?: ChartData;
  }[] = [];
  const chartRegex = /```chart\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = chartRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
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
