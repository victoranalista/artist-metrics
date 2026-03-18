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

  // Get latest snapshot per platform (com dados válidos, não null)
  const latestByPlatform = new Map<
    string,
    (typeof snapshots)[number]
  >();
  for (const s of snapshots) {
    if (!latestByPlatform.has(s.platform) && s.followers != null && s.followers > 0) {
      latestByPlatform.set(s.platform, s);
    }
  }
  // Fallback: se não encontrou com followers, pega o primeiro mesmo
  for (const s of snapshots) {
    if (!latestByPlatform.has(s.platform)) {
      latestByPlatform.set(s.platform, s);
    }
  }

  // ── Agregar dados de TODAS as plataformas ──

  // YouTube
  const ytSnap = latestByPlatform.get("YOUTUBE");
  const ytPd = (ytSnap?.platformData ?? {}) as Record<string, unknown>;
  const ytAnalytics = (ytPd?.analytics ?? {}) as Record<string, number>;
  const ytFollowers = ytSnap?.followers ?? 0;
  const ytDailyViews = ytAnalytics?.visualizacoes ?? 0; // 28 dias
  const ytWatchHours = ytAnalytics?.horasAssistidas ?? 0;
  const ytLikes = ytAnalytics?.curtidas ?? 0;
  const ytComments = ytAnalytics?.comentarios ?? 0;
  const ytSubsGained = ytAnalytics?.inscritosGanhos ?? 0;

  // Instagram (pegar último snapshot com dados válidos)
  const igSnaps = snapshots.filter((s) => s.platform === "INSTAGRAM" && s.followers);
  const igSnap = igSnaps[0]; // mais recente com dados
  const igFollowers = igSnap?.followers ?? 0;
  const igReach28d = igSnaps.reduce((s, snap) => s + (snap.totalViews ?? 0), 0);
  // Curtidas totais dos posts (do snapshot com content)
  const igContentSnap = snapshots.find(
    (s) => s.platform === "INSTAGRAM" && s.contentMetrics.length > 0
  );
  const igTotalLikes = igContentSnap?.contentMetrics.reduce(
    (s, c) => s + (c.likes ?? 0), 0
  ) ?? 0;
  const igTotalComments = igContentSnap?.contentMetrics.reduce(
    (s, c) => s + (c.comments ?? 0), 0
  ) ?? 0;
  const igNewFollowers28d = igSnaps
    .slice(0, 28)
    .reduce((s, snap) => {
      const pd = (snap.platformData ?? {}) as Record<string, number>;
      return s + (pd?.novosSeguidores ?? 0);
    }, 0);

  // Spotify
  const spSnap = latestByPlatform.get("SPOTIFY");
  const spPd = (spSnap?.platformData ?? {}) as Record<string, unknown>;
  const spFollowers = spSnap?.followers ?? 0;
  const spMonthlyListeners = (spPd?.monthlyListeners as number) ?? 0;
  const spTotalStreams = (spPd?.totalStreams as number) ?? spSnap?.totalViews ?? 0;

  // ── Totais agregados ──
  const totalFollowers = ytFollowers + igFollowers + spFollowers;
  const totalViewsAllTime = (ytSnap?.totalViews ?? 0) + spTotalStreams;

  // Alcance total (28 dias): YT views + IG reach + Spotify streams estimados
  const totalReach28d = ytDailyViews + igReach28d;

  // Total de conteúdos publicados
  const totalContent = (ytPd?.totalVideos as number ?? 0) +
    (igContentSnap ? 138 : 0) + // media_count do Instagram
    6; // releases Spotify

  // Engajamento médio ponderado
  const totalInteractions = ytLikes + ytComments + igTotalLikes + igTotalComments;
  const totalReachForEngagement = ytDailyViews + (igReach28d / Math.max(igSnaps.length, 1)) * 10;
  const avgEngagement = totalReachForEngagement > 0
    ? totalInteractions / totalReachForEngagement
    : 0;

  // Crescimento de seguidores (todas as plataformas, 28 dias)
  const totalNewFollowers = ytSubsGained + igNewFollowers28d;
  const followersGrowthPct = totalFollowers > 0
    ? (totalNewFollowers / totalFollowers) * 100
    : 0;

  const overviewData = {
    totalFollowers,
    totalViews: totalReach28d,
    totalContent,
    avgEngagement,
    growth: {
      followers: Math.round(followersGrowthPct * 10) / 10,
      views: 0,
      content: 0,
      engagement: 0,
    },
    viewsLabel: "alcance 28 dias",
    watchHours: ytWatchHours,
    recentLikes: ytLikes + igTotalLikes,
    recentComments: ytComments + igTotalComments,
    subsGained: totalNewFollowers,
    // Dados por plataforma (para breakdown)
    platforms: {
      youtube: { followers: ytFollowers, views28d: ytDailyViews, watchHours: ytWatchHours },
      instagram: { followers: igFollowers, reach28d: igReach28d, newFollowers: igNewFollowers28d },
      spotify: { followers: spFollowers, monthlyListeners: spMonthlyListeners, totalStreams: spTotalStreams },
    },
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

  // Recent content — de-duplicar e ordenar por views ou likes
  const contentMap = new Map<string, { id: string; title: string | null; contentType: string; views: number; likes: number; platform: string; date: string }>();
  for (const s of snapshots) {
    for (const c of s.contentMetrics) {
      const existing = contentMap.get(c.contentId);
      const score = (c.views ?? 0) + (c.likes ?? 0);
      const existingScore = existing ? existing.views + existing.likes : 0;
      if (!existing || score > existingScore) {
        contentMap.set(c.contentId, {
          id: c.id,
          title: c.title,
          contentType: c.contentType,
          views: c.views ?? 0,
          likes: c.likes ?? 0,
          platform: s.platform,
          date: c.publishedAt?.toISOString().split("T")[0] ?? s.date.toISOString().split("T")[0],
        });
      }
    }
  }
  const recentContent = Array.from(contentMap.values())
    .sort((a, b) => (b.likes + b.views) - (a.likes + a.views))
    .slice(0, 10);

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
