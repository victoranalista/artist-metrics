import { getMetricsHistory, getLatestSnapshots } from "@/lib/actions";
import { MetricsClient } from "./metrics-client";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const [history, snapshots] = await Promise.all([
    getMetricsHistory(undefined, 90),
    getLatestSnapshots(),
  ]);

  // Serialize dates for client component
  const serializedHistory = history.map((h) => ({
    id: h.id,
    platform: h.platform,
    date: h.date.toISOString(),
    followers: h.followers ?? 0,
    totalViews: h.totalViews ?? 0,
    totalLikes: h.totalLikes ?? 0,
    totalComments: h.totalComments ?? 0,
    engagementRate: h.engagementRate ?? 0,
  }));

  const serializedSnapshots = snapshots.map((s) => ({
    platform: s.platform,
    followers: s.followers ?? 0,
    totalViews: s.totalViews ?? 0,
    totalLikes: s.totalLikes ?? 0,
    totalComments: s.totalComments ?? 0,
    engagementRate: s.engagementRate ?? 0,
    date: s.date.toISOString(),
  }));

  return (
    <>
      {/* Hero Section */}
      <div className="mb-8 sm:mb-12">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              MÉTRICAS
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Acompanhe seu crescimento
            </h1>
            <p className="max-w-md text-base leading-relaxed text-zinc-400">
              Visualize o desempenho da sua música em todas as plataformas, Débora. Analise tendências e tome decisões baseadas em dados reais.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <img
              src="/artist/portrait.webp"
              alt="Debora Kailany"
              className="h-[280px] w-full object-cover sm:h-[350px] md:h-[400px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
          </div>
        </div>
      </div>
      <MetricsClient history={serializedHistory} snapshots={serializedSnapshots} />
    </>
  );
}
