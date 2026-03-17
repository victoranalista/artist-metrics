import { prisma, ARTIST_ID } from "@/lib/db";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import { PlatformComparison } from "@/components/dashboard/platform-comparison";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default async function DashboardPage() {
  const [snapshots, connections] = await Promise.all([
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
        views: c.views,
        likes: c.likes,
        platform: s.platform,
      }))
    )
    .sort((a, b) => (b.views || 0) - (a.views || 0))
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

  return (
    <div className="space-y-6">
      <OverviewCards data={overviewData} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GrowthChart data={chartData} />
        </div>
        <div>
          <RecentActivity items={recentContent} />
        </div>
      </div>
      <PlatformComparison data={platformData} />
    </div>
  );
}
