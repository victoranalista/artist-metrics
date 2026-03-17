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
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MapPin, Globe, BarChart3 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatPercent, platformColors, platformNames } from "@/lib/utils";

interface AudienceInfo {
  ageRanges: Record<string, number> | null;
  genderSplit: Record<string, number> | null;
  topCountries: Record<string, number> | null;
  topCities: Record<string, number> | null;
}

interface AudienceClientProps {
  platforms: string[];
  audienceData: Record<string, AudienceInfo>;
}

const GENDER_COLORS: Record<string, string> = {
  male: "#8b5cf6",
  female: "#c084fc",
  masculino: "#8b5cf6",
  feminino: "#c084fc",
  other: "#a1a1aa",
  outro: "#a1a1aa",
  unknown: "#52525b",
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

function GenderPieChart({
  genderSplit,
}: {
  genderSplit: Record<string, number>;
}) {
  const data = Object.entries(genderSplit).map(([key, value]) => ({
    name: GENDER_LABELS[key.toLowerCase()] || key,
    value,
    color: GENDER_COLORS[key.toLowerCase()] || "#8b5cf6",
  }));

  return (
    <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="size-4 text-violet-400" />
          Distribuicao por Genero
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  return (
                    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 shadow-xl">
                      <p className="text-xs text-zinc-300">
                        {item.name}:{" "}
                        <span className="font-medium text-white">
                          {formatPercent((item.value as number) / 100)}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-zinc-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function AgeBarChart({ ageRanges }: { ageRanges: Record<string, number> }) {
  const data = Object.entries(ageRanges)
    .map(([range, value]) => ({
      range,
      value,
    }))
    .sort((a, b) => {
      const numA = parseInt(a.range);
      const numB = parseInt(b.range);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.range.localeCompare(b.range);
    });

  return (
    <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BarChart3 className="size-4 text-violet-400" />
          Faixa Etaria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
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
                width={60}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  return (
                    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 shadow-xl">
                      <p className="text-xs text-zinc-300">
                        {(item.payload as { range: string }).range}:{" "}
                        <span className="font-medium text-white">
                          {item.value}%
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="value"
                fill="#8b5cf6"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function TopCountries({
  countries,
}: {
  countries: Record<string, number>;
}) {
  const sorted = Object.entries(countries)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const maxValue = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Globe className="size-4 text-violet-400" />
          Principais Paises
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sorted.map(([country, value]) => (
            <div key={country} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{country}</span>
                <span className="font-medium text-white">{value}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  className="h-full rounded-full bg-violet-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(value / maxValue) * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-zinc-500">Sem dados disponíveis</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TopCities({ cities }: { cities: Record<string, number> }) {
  const sorted = Object.entries(cities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return (
    <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <MapPin className="size-4 text-violet-400" />
          Principais Cidades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {sorted.map(([city, value], index) => (
            <div
              key={city}
              className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-500">
                  {index + 1}
                </span>
                <span className="text-sm text-zinc-300">{city}</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-violet-500/10 text-violet-400"
              >
                {value}%
              </Badge>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-zinc-500">Sem dados disponíveis</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-zinc-900/40 py-16 text-center"
    >
      <Users className="mb-4 size-12 text-zinc-600" />
      <h3 className="text-lg font-medium text-zinc-300">
        Sem dados de audiencia
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        Conecte sua conta e colete metricas para ver dados de audiencia
      </p>
    </motion.div>
  );
}

export function AudienceClient({
  platforms,
  audienceData,
}: AudienceClientProps) {
  const availablePlatforms = platforms.filter((p) => p in audienceData);
  const defaultPlatform =
    availablePlatforms.length > 0 ? availablePlatforms[0] : platforms[0];
  const [activePlatform, setActivePlatform] = useState(defaultPlatform);

  const currentData = audienceData[activePlatform] ?? null;
  const hasData =
    currentData &&
    (currentData.genderSplit ||
      currentData.ageRanges ||
      currentData.topCountries ||
      currentData.topCities);

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue={defaultPlatform}
        onValueChange={(val) => setActivePlatform(val as string)}
      >
        <TabsList>
          {platforms.map((platform) => (
            <TabsTrigger key={platform} value={platform}>
              <span
                className="mr-1.5 inline-block size-2 rounded-full"
                style={{
                  backgroundColor: platformColors[platform] || "#8b5cf6",
                }}
              />
              {platformNames[platform] || platform}
            </TabsTrigger>
          ))}
        </TabsList>

        {platforms.map((platform) => (
          <TabsContent key={platform} value={platform}>
            <AnimatePresence mode="wait">
              <motion.div
                key={platform}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <PlatformAudienceContent
                  data={audienceData[platform] ?? null}
                />
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function PlatformAudienceContent({
  data,
}: {
  data: AudienceInfo | null;
}) {
  const hasData =
    data &&
    (data.genderSplit || data.ageRanges || data.topCountries || data.topCities);

  if (!hasData) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data.genderSplit && <GenderPieChart genderSplit={data.genderSplit} />}
        {data.ageRanges && <AgeBarChart ageRanges={data.ageRanges} />}
      </div>

      {/* Location row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data.topCountries && <TopCountries countries={data.topCountries} />}
        {data.topCities && <TopCities cities={data.topCities} />}
      </div>
    </div>
  );
}
