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

  // Calculate totals
  const totalFollowers = Array.from(latestByPlatform.values()).reduce(
    (sum, s) => sum + (s.followers || 0),
    0
  );
  const totalViews = Array.from(latestByPlatform.values()).reduce(
    (sum, s) => sum + (s.totalViews || 0),
    0
  );
  const totalContent = snapshots.reduce(
    (sum, s) => sum + s.contentMetrics.length,
    0
  );
  const avgEngagement =
    Array.from(latestByPlatform.values()).reduce(
      (sum, s) => sum + (s.engagementRate || 0),
      0
    ) / Math.max(latestByPlatform.size, 1);

  // Calculate growth comparing latest vs previous period
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  const midpoint = Math.floor(sortedSnapshots.length / 2);
  const recentHalf = sortedSnapshots.slice(0, midpoint);
  const olderHalf = sortedSnapshots.slice(midpoint);

  const recentFollowers = recentHalf.reduce(
    (sum, s) => sum + (s.followers || 0),
    0
  );
  const olderFollowers = olderHalf.reduce(
    (sum, s) => sum + (s.followers || 0),
    0
  );
  const recentViews = recentHalf.reduce(
    (sum, s) => sum + (s.totalViews || 0),
    0
  );
  const olderViews = olderHalf.reduce(
    (sum, s) => sum + (s.totalViews || 0),
    0
  );

  const calcGrowth = (recent: number, older: number) =>
    older > 0 ? ((recent - older) / older) * 100 : 0;

  const overviewData = {
    totalFollowers,
    totalViews,
    totalContent,
    avgEngagement,
    growth: {
      followers: calcGrowth(recentFollowers, olderFollowers),
      views: calcGrowth(recentViews, olderViews),
      content: 0,
      engagement: 0,
    },
  };

  // Build chart data from snapshots
  const chartData = snapshots.map((s) => ({
    date: s.date.toISOString().split("T")[0],
    platform: s.platform,
    followers: s.followers || 0,
    views: s.totalViews || 0,
  }));

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
      {/* Welcome header */}
      <MotionSection delay={0}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bem-vindo, {artist.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400 capitalize">{dateStr}</p>
        </div>
      </MotionSection>

      {/* KPI cards */}
      <MotionSection delay={0.1}>
        <OverviewCards data={overviewData} />
      </MotionSection>

      {/* Hero stat — most impressive number */}
      <MotionSection delay={0.2}>
        <HeroStat value={totalViews} label="visualizações totais" />
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
