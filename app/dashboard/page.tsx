import { prisma, ARTIST_ID, getArtist } from "@/lib/db";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import { PlatformComparison } from "@/components/dashboard/platform-comparison";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { HeroStat } from "@/components/dashboard/hero-stat";
import { MotionSection } from "@/components/ui/motion-section";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [artist, snapshots, connections] = await Promise.all([
    getArtist(),
    prisma.metricsSnapshot.findMany({
      where: { artistId: ARTIST_ID },
      include: { contentMetrics: true, audienceMetrics: true },
      orderBy: { date: "desc" },
      take: 90,
    }),
    prisma.platformConnection.findMany({
      where: { artistId: ARTIST_ID },
      select: { platform: true, status: true, displayName: true },
    }),
  ]);

  // Get latest snapshot per platform
  const latestByPlatform = new Map<
    string,
    (typeof snapshots)[number]
  >();
  for (const s of snapshots) {
    if (!latestByPlatform.has(s.platform)) latestByPlatform.set(s.platform, s);
  }

  // Dados do canal
  const totalFollowers = Array.from(latestByPlatform.values()).reduce(
    (sum, s) => sum + (s.followers || 0),
    0
  );

  // Extrair dados do YouTube Analytics (últimos 28 dias) se disponível
  const ytSnapshot = latestByPlatform.get("YOUTUBE");
  const ytPlatformData = (ytSnapshot?.platformData ?? {}) as Record<string, unknown>;
  const ytAnalytics = (ytPlatformData?.analytics ?? {}) as Record<string, number>;

  // Views dos últimos 28 dias (do Analytics) ou total do canal
  const recentViews = ytAnalytics?.visualizacoes ?? 0;
  const totalViewsAllTime = Array.from(latestByPlatform.values()).reduce(
    (sum, s) => sum + (s.totalViews || 0),
    0
  );
  // Se temos dados do Analytics, mostrar os 28 dias. Senão, total.
  const displayViews = recentViews > 0 ? recentViews : totalViewsAllTime;
  const viewsLabel = recentViews > 0 ? "últimos 28 dias" : "total";

  // Vídeos únicos do último snapshot
  const latestVideoCount = ytSnapshot?.contentMetrics?.length ?? 0;
  const totalVideos = (ytPlatformData?.totalVideos as number) ?? latestVideoCount;

  // Engajamento dos últimos 28 dias
  const recentLikes = ytAnalytics?.curtidas ?? 0;
  const recentComments = ytAnalytics?.comentarios ?? 0;
  const avgEngagement =
    displayViews > 0
      ? ((recentLikes + recentComments) / displayViews)
      : Array.from(latestByPlatform.values()).reduce(
          (sum, s) => sum + (s.engagementRate || 0),
          0
        ) / Math.max(latestByPlatform.size, 1);

  // Inscritos ganhos nos últimos 28 dias
  const subsGained = ytAnalytics?.inscritosGanhos ?? 0;
  const subsLost = ytAnalytics?.inscritosPerdidos ?? 0;
  const subsGrowthPct = totalFollowers > 0
    ? ((subsGained - subsLost) / totalFollowers) * 100
    : 0;

  // Horas assistidas
  const watchHours = ytAnalytics?.horasAssistidas ?? 0;

  const overviewData = {
    totalFollowers,
    totalViews: displayViews,
    totalContent: totalVideos,
    avgEngagement,
    growth: {
      followers: Math.round(subsGrowthPct * 10) / 10,
      views: 0, // Sem dados históricos para comparar ainda
      content: 0,
      engagement: 0,
    },
    // Dados extras para exibir
    viewsLabel,
    watchHours,
    recentLikes,
    recentComments,
    subsGained,
  };

  // Build chart data from snapshots — usar dados diários, não cumulativos
  const chartData = snapshots.map((s) => {
    const pd = (s.platformData ?? {}) as Record<string, unknown>;
    // Dados diários: YouTube=dailyViews, Instagram=alcance(totalViews), Spotify=dailyStreams
    const dailyViews =
      (pd.dailyViews as number) ??
      (pd.dailyStreams as number) ??
      (s.platform === "INSTAGRAM" ? s.totalViews : null);
    return {
      date: s.date.toISOString().split("T")[0],
      platform: s.platform,
      followers: s.followers || 0,
      views: dailyViews ?? 0,
    };
  });

  // Recent content items sorted by views
  const recentContent = snapshots
    .flatMap((s) =>
      s.contentMetrics.map((c) => ({
        id: c.id,
        title: c.title,
        contentType: c.contentType,
        views: c.views ?? 0,
        likes: c.likes ?? 0,
        platform: s.platform,
        date: s.date.toISOString().split("T")[0],
      }))
    )
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 8);

  // Platform comparison data
  const platformData = Array.from(latestByPlatform.entries()).map(
    ([platform, s]) => ({
      platform,
      followers: s.followers || 0,
      views: s.totalViews || 0,
      engagement: s.engagementRate || 0,
      connected: true,
    })
  );

  // Add disconnected platforms
  for (const p of ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const) {
    if (!latestByPlatform.has(p)) {
      platformData.push({
        platform: p,
        followers: 0,
        views: 0,
        engagement: 0,
        connected: connections.some((c) => c.platform === p),
      });
    }
  }

  // Format current date in PT-BR
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-10">
      {/* Hero banner with artist photo */}
      <MotionSection delay={0}>
        <div className="relative overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/artist/hero.webp)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/40" />
          <div className="relative flex items-end gap-5 p-6 sm:p-8 md:min-h-[200px] md:items-center">
            <img
              src="/artist/avatar.webp"
              alt={artist.name}
              width={80}
              height={80}
              className="size-16 rounded-full border-2 border-zinc-700 object-cover sm:size-20"
            />
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">
                {artist.name}
              </h1>
              <p className="mt-0.5 text-sm text-zinc-400">
                {artist.style && artist.style !== "Não definido"
                  ? artist.style
                  : "Artista Gospel"}
                {" · "}
                <span className="capitalize">{dateStr}</span>
              </p>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* KPI cards */}
      <MotionSection delay={0.1}>
        <OverviewCards data={overviewData} />
      </MotionSection>

      {/* Hero stat — most impressive number */}
      <MotionSection delay={0.2}>
        <HeroStat value={totalViewsAllTime} label="visualizações totais de Débora" />
      </MotionSection>

      {/* Chart + Recent content */}
      <MotionSection delay={0.2}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GrowthChart data={chartData} />
          </div>
          <div>
            <RecentActivity items={recentContent} />
          </div>
        </div>
      </MotionSection>

      {/* Platform comparison */}
      <MotionSection delay={0.3}>
        <div>
          <h2 className="mb-4 text-base font-semibold text-white">
            Comparativo de Plataformas
          </h2>
          <PlatformComparison data={platformData} />
        </div>
      </MotionSection>
    </div>
  );
}
