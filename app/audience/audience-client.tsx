"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, MapPin, Globe, BarChart3, Radio } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { platformColors, platformNames } from "@/lib/utils";

interface AudienceInfo {
  ageRanges: Record<string, number> | null;
  genderSplit: Record<string, number> | null;
  topCountries: Record<string, number> | null;
  topCities: Record<string, number> | null;
  trafficSources: Record<string, number> | null;
}

interface AudienceClientProps {
  platforms: string[];
  audienceData: Record<string, AudienceInfo>;
  hasConnections: boolean;
}

const GENDER_COLORS: Record<string, string> = {
  male: "#a1a1aa",
  female: "#71717a",
  masculino: "#a1a1aa",
  feminino: "#71717a",
  other: "#52525b",
  outro: "#52525b",
  unknown: "#3f3f46",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
  masculino: "Masculino",
  feminino: "Feminino",
  other: "Outro",
  outro: "Outro",
  unknown: "Desconhecido",
};

const TRAFFIC_SOURCE_LABELS: Record<string, string> = {
  SEARCH: "Pesquisa",
  SUGGESTED: "Sugeridos",
  BROWSE_FEATURES: "Navegação",
  EXT_URL: "URL Externa",
  EXTERNAL: "Externo",
  NOTIFICATION: "Notificação",
  PLAYLIST: "Playlist",
  SHORTS: "Shorts",
  RELATED_VIDEO: "Vídeos Relacionados",
  YT_SEARCH: "Pesquisa YouTube",
  SUBSCRIBER: "Inscritos",
  YT_CHANNEL: "Página do Canal",
  ADVERTISING: "Publicidade",
  NO_LINK_EMBEDDED: "Incorporado",
  NO_LINK_OTHER: "Outro",
  END_SCREEN: "Tela Final",
  ANNOTATION: "Anotação",
  CAMPAIGN_CARD: "Cartão de Campanha",
  HASHTAGS: "Hashtags",
  LIVE_REDIRECT: "Redirect ao Vivo",
  PROMOTED: "Promovido",
  YT_OTHER_PAGE: "Outra Página YT",
  YT_PLAYLIST_PAGE: "Página Playlist",
  VIDEO_REMIXES: "Remixes",
};

function ChartTooltip({
  active,
  payload,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-lg">
      <p className="text-xs text-zinc-400">
        {item.name}:{" "}
        <span className="font-medium text-white">
          {typeof item.value === "number" ? item.value.toLocaleString("pt-BR") : item.value}
          {suffix}
        </span>
      </p>
    </div>
  );
}

function GenderChart({ genderSplit }: { genderSplit: Record<string, number> }) {
  const data = Object.entries(genderSplit).map(([key, value]) => ({
    name: GENDER_LABELS[key.toLowerCase()] || key,
    value,
    color: GENDER_COLORS[key.toLowerCase()] || "#52525b",
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Users className="size-4 text-zinc-500" />
          Distribuição por Gênero
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => (
                    <ChartTooltip active={active} payload={payload as Array<{ name: string; value: number }>} suffix="%" />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-zinc-400">{entry.name}</span>
                <span className="ml-auto text-sm font-medium text-white">
                  {total > 0 ? `${Math.round((entry.value / total) * 100)}%` : `${entry.value}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgeBarChart({ ageRanges }: { ageRanges: Record<string, number> }) {
  const data = Object.entries(ageRanges)
    .map(([range, value]) => ({ range, value }))
    .sort((a, b) => {
      const numA = parseInt(a.range);
      const numB = parseInt(b.range);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.range.localeCompare(b.range);
    });

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <BarChart3 className="size-4 text-zinc-500" />
          Faixa Etária
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={{ stroke: "#27272a" }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="range"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                axisLine={{ stroke: "#27272a" }}
                tickLine={false}
                width={56}
              />
              <RechartsTooltip
                content={({ active, payload }) => (
                  <ChartTooltip active={active} payload={payload as Array<{ name: string; value: number }>} suffix="%" />
                )}
              />
              <Bar
                dataKey="value"
                fill="#a1a1aa"
                radius={[0, 4, 4, 0]}
                barSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function HorizontalBarSection({
  title,
  icon,
  data,
  labelMap,
  suffix,
  formatValue,
}: {
  title: string;
  icon: React.ReactNode;
  data: Record<string, number>;
  labelMap?: Record<string, string>;
  suffix?: string;
  formatValue?: (v: number) => string;
}) {
  const sorted = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const maxValue = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sorted.map(([key, value]) => {
            const label = labelMap?.[key] || key;
            const displayValue = formatValue
              ? formatValue(value)
              : `${value.toLocaleString("pt-BR")}${suffix || ""}`;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{label}</span>
                  <span className="font-medium text-white">{displayValue}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-600 transition-all duration-500"
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <p className="text-sm text-zinc-600">Sem dados disponíveis</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 py-16 text-center">
      <Users className="mb-4 size-10 text-zinc-700" />
      <h3 className="text-base font-medium text-zinc-400">
        Sem dados de audiência
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-600">{message}</p>
    </div>
  );
}

export function AudienceClient({
  platforms,
  audienceData,
  hasConnections,
}: AudienceClientProps) {
  const defaultPlatform = platforms.length > 0 ? platforms[0] : "";
  const [activePlatform, setActivePlatform] = useState(defaultPlatform);

  if (!hasConnections || platforms.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Audiência</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Dados demográficos e distribuição do seu público por plataforma
          </p>
        </div>
        <EmptyState message="Conecte uma plataforma e colete métricas para ver dados de audiência" />
      </div>
    );
  }

  const currentData = audienceData[activePlatform] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Audiência</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Dados demográficos e distribuição do seu público por plataforma
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
        {platforms.map((platform) => (
          <button
            key={platform}
            onClick={() => setActivePlatform(platform)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activePlatform === platform
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor: platformColors[platform] || "#71717a",
              }}
            />
            {platformNames[platform] || platform}
          </button>
        ))}
      </div>

      {/* Content */}
      <PlatformAudienceContent data={currentData} />
    </div>
  );
}

function PlatformAudienceContent({ data }: { data: AudienceInfo | null }) {
  const hasData =
    data &&
    (data.genderSplit ||
      data.ageRanges ||
      data.topCountries ||
      data.topCities ||
      data.trafficSources);

  if (!hasData) {
    return (
      <EmptyState message="Colete métricas desta plataforma para ver dados de audiência" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Demographics row */}
      {(data.genderSplit || data.ageRanges) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {data.genderSplit && <GenderChart genderSplit={data.genderSplit} />}
          {data.ageRanges && <AgeBarChart ageRanges={data.ageRanges} />}
        </div>
      )}

      {/* Geography + Traffic row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data.topCountries && (
          <HorizontalBarSection
            title="Principais Países"
            icon={<Globe className="size-4 text-zinc-500" />}
            data={data.topCountries}
            formatValue={(v) => v.toLocaleString("pt-BR")}
          />
        )}

        {data.topCities && (
          <HorizontalBarSection
            title="Principais Cidades"
            icon={<MapPin className="size-4 text-zinc-500" />}
            data={data.topCities}
            suffix="%"
          />
        )}

        {data.trafficSources && (
          <HorizontalBarSection
            title="Fontes de Tráfego"
            icon={<Radio className="size-4 text-zinc-500" />}
            data={data.trafficSources}
            labelMap={TRAFFIC_SOURCE_LABELS}
            formatValue={(v) => v.toLocaleString("pt-BR")}
          />
        )}
      </div>
    </div>
  );
}
