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
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart3, PieChart as PieIcon, Activity } from "lucide-react";

// ── Colors ──

const CHART_COLORS = [
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
];

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#FF0000",
  instagram: "#E4405F",
  spotify: "#1DB954",
  tiktok: "#000000",
};

// ── Types ──

interface ChartData {
  type: "bar" | "line" | "pie" | "area" | "radar" | "metric" | "comparison" | "progress";
  title?: string;
  data: Record<string, unknown>[];
  keys?: string[];
  colors?: string[];
  xKey?: string;
}

// ── Custom tooltip ──

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 shadow-xl backdrop-blur">
      {label && <p className="mb-1 text-xs font-medium text-zinc-400">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-300">{entry.name}:</span>
          <span className="font-semibold text-white">
            {typeof entry.value === "number" ? entry.value.toLocaleString("pt-BR") : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Metric Cards ──

function MetricCard({ data }: { data: ChartData }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {data.data.map((item, i) => {
        const label = (item.label ?? item.name ?? item.platform ?? "") as string;
        const value = (item.value ?? item.count ?? 0) as number;
        const change = (item.change ?? item.growth ?? null) as number | null;
        const isPositive = change !== null && change > 0;
        const isNegative = change !== null && change < 0;

        return (
          <div
            key={i}
            className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-3"
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {label}
            </span>
            <span className="text-lg font-bold text-white">
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </span>
            {change !== null && (
              <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-zinc-500"}`}>
                {isPositive ? <TrendingUp className="size-3" /> : isNegative ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
                {isPositive && "+"}{change}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Progress/Comparison Bars ──

function ComparisonBars({ data }: { data: ChartData }) {
  const items = data.data;
  const maxValue = Math.max(...items.map((d) => (d.value as number) || 0));

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const label = (item.label ?? item.name ?? "") as string;
        const value = (item.value ?? 0) as number;
        const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const color = data.colors?.[i] || CHART_COLORS[i % CHART_COLORS.length];

        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300">{label}</span>
              <span className="font-bold text-white">{value.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
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
  const { type, title, data, keys, colors } = chartData;
  const xKey = chartData.xKey || "name";
  const dataKeys = keys || Object.keys(data[0] || {}).filter((k) => k !== xKey && k !== "name" && k !== "label");
  const chartColors = colors || CHART_COLORS;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
      {/* Header */}
      {title && (
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
          {type === "pie" ? (
            <PieIcon className="size-3.5 text-violet-400" />
          ) : type === "metric" || type === "comparison" || type === "progress" ? (
            <Activity className="size-3.5 text-violet-400" />
          ) : (
            <BarChart3 className="size-3.5 text-violet-400" />
          )}
          <span className="text-xs font-semibold text-zinc-300">{title}</span>
        </div>
      )}

      {/* Chart body */}
      <div className="p-4">
        {/* Metric cards */}
        {type === "metric" && <MetricCard data={chartData} />}

        {/* Comparison/Progress bars */}
        {(type === "comparison" || type === "progress") && <ComparisonBars data={chartData} />}

        {/* Bar Chart */}
        {type === "bar" && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data as Record<string, string | number>[]} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {dataKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={chartColors[i % chartColors.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Line Chart */}
        {type === "line" && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data as Record<string, string | number>[]} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {dataKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={chartColors[i % chartColors.length]} strokeWidth={2} dot={{ r: 3, fill: chartColors[i % chartColors.length] }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Area Chart */}
        {type === "area" && (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data as Record<string, string | number>[]} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <defs>
                {dataKeys.map((key, i) => (
                  <linearGradient key={key} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {dataKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={chartColors[i % chartColors.length]} strokeWidth={2} fill={`url(#gradient-${i})`} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Pie Chart */}
        {type === "pie" && (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data as Record<string, string | number>[]}
                dataKey={dataKeys[0] || "value"}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={chartColors[i % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => <span className="text-xs text-zinc-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Radar Chart */}
        {type === "radar" && (
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={data as Record<string, string | number>[]} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: "#52525b" }} />
              {dataKeys.map((key, i) => (
                <Radar key={key} name={key} dataKey={key} stroke={chartColors[i % chartColors.length]} fill={chartColors[i % chartColors.length]} fillOpacity={0.15} strokeWidth={2} />
              ))}
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── Parser: extracts chart blocks from markdown ──

export function parseChartsFromContent(content: string): { segments: { type: "text" | "chart"; content: string; chartData?: ChartData }[] } {
  const segments: { type: "text" | "chart"; content: string; chartData?: ChartData }[] = [];
  const chartRegex = /```chart\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = chartRegex.exec(content)) !== null) {
    // Text before chart
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }

    // Parse chart JSON
    try {
      const chartData = JSON.parse(match[1]) as ChartData;
      segments.push({ type: "chart", content: match[0], chartData });
    } catch {
      // If JSON parse fails, treat as text
      segments.push({ type: "text", content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return { segments };
}
