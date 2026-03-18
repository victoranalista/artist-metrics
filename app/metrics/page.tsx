import { getMetricsHistory, getLatestSnapshots } from "@/lib/actions";
import { prisma, ARTIST_ID } from "@/lib/db";
import { MetricsClient } from "./metrics-client";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const [historyRaw, snapshots] = await Promise.all([
    prisma.metricsSnapshot.findMany({
      where: { artistId: ARTIST_ID, date: { gte: new Date(Date.now() - 90 * 86400000) } },
      orderBy: { date: "asc" },
      select: { id: true, platform: true, date: true, followers: true, totalViews: true, totalLikes: true, totalComments: true, totalShares: true, engagementRate: true, platformData: true },
    }),
    getLatestSnapshots(),
  ]);

  // Serialize com dados diários extraídos do platformData
  const serializedHistory = historyRaw.map((h) => {
    const pd = (h.platformData ?? {}) as Record<string, unknown>;
    const dailyViews = (pd.dailyViews as number) ?? (pd.dailyStreams as number) ?? (pd.alcanceDiario as number) ?? 0;
    const watchHours = (pd.hoursWatched as number) ?? (pd.horasAssistidas as number) ?? 0;
    const subsGained = (pd.subsGained as number) ?? (pd.novosSeguidores as number) ?? 0;
    return {
      id: h.id,
      platform: h.platform,
      date: h.date.toISOString(),
      followers: h.followers ?? 0,
      totalViews: h.totalViews ?? 0,
      dailyViews,
      totalLikes: h.totalLikes ?? 0,
      totalComments: h.totalComments ?? 0,
      totalShares: h.totalShares ?? 0,
      engagementRate: h.engagementRate ?? 0,
      watchHours,
      subsGained,
    };
  });

  const serializedSnapshots = snapshots.map((s) => {
    const pd = (s.platformData ?? {}) as Record<string, unknown>;
    const analytics = (pd.analytics ?? {}) as Record<string, number>;
    return {
      platform: s.platform,
      followers: s.followers ?? 0,
      totalViews: s.totalViews ?? 0,
      totalLikes: s.totalLikes ?? 0,
      totalComments: s.totalComments ?? 0,
      totalShares: s.totalShares ?? 0,
      engagementRate: s.engagementRate ?? 0,
      date: s.date.toISOString(),
      // YouTube Analytics extras
      watchHours: analytics.horasAssistidas ?? 0,
      retention: analytics.retencaoMedia ?? 0,
      avgDuration: analytics.duracaoMediaSegundos ?? 0,
      subsGained: analytics.inscritosGanhos ?? 0,
      subsLost: analytics.inscritosPerdidos ?? 0,
      shares: analytics.compartilhamentos ?? (s.totalShares ?? 0),
      // Spotify extras
      monthlyListeners: (pd.monthlyListeners as number) ?? 0,
      totalStreams: (pd.totalStreams as number) ?? 0,
      // Instagram extras
      mediaCount: (pd.mediaCount as number) ?? 0,
    };
  });

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
