import { prisma, ARTIST_ID } from "@/lib/db";
import { getConnections } from "@/lib/actions";
import { AudienceClient } from "./audience-client";

export const dynamic = "force-dynamic";

const TRAFFIC_SOURCE_NAMES = new Set([
  "ADVERTISING", "ANNOTATION", "BROWSE_FEATURES", "CAMPAIGN_CARD",
  "END_SCREEN", "EXT_URL", "EXTERNAL", "HASHTAGS", "LIVE_REDIRECT",
  "NO_LINK_EMBEDDED", "NO_LINK_OTHER", "NOTIFICATION", "PLAYLIST",
  "PROMOTED", "RELATED_VIDEO", "SEARCH", "SHORTS", "SUBSCRIBER",
  "SUGGESTED", "YT_CHANNEL", "YT_OTHER_PAGE", "YT_PLAYLIST_PAGE",
  "YT_SEARCH", "VIDEO_REMIXES",
]);

function isTrafficSourceData(data: Record<string, number> | null): boolean {
  if (!data) return false;
  const keys = Object.keys(data);
  if (keys.length === 0) return false;
  const trafficCount = keys.filter(
    (k) => TRAFFIC_SOURCE_NAMES.has(k) || /^[A-Z_]+$/.test(k)
  ).length;
  return trafficCount / keys.length > 0.5;
}

export default async function AudiencePage() {
  const connections = await getConnections();
  const connectedPlatforms = connections.map((c) => c.platform);

  // Fetch latest snapshot per platform (with audience + content metrics)
  const platforms = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const;
  const latestSnapshots = [];
  for (const platform of platforms) {
    const snapshot = await prisma.metricsSnapshot.findFirst({
      where: { artistId: ARTIST_ID, platform },
      orderBy: { date: "desc" },
      include: {
        contentMetrics: { orderBy: { views: "desc" }, take: 20 },
        audienceMetrics: true,
      },
    });
    if (snapshot) latestSnapshots.push(snapshot);
  }

  // Fetch 28 days of history for follower growth trends
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 28);
  const historySnapshots = await prisma.metricsSnapshot.findMany({
    where: {
      artistId: ARTIST_ID,
      date: { gte: dateFrom },
    },
    orderBy: { date: "asc" },
    select: {
      platform: true,
      date: true,
      followers: true,
      totalViews: true,
      totalLikes: true,
      totalComments: true,
      engagementRate: true,
      platformData: true,
    },
  });

  // Build per-platform follower data
  const platformFollowers: Record<string, number> = {};
  const followerGrowth28d: Record<string, number> = {};
  const totalReach28d: Record<string, number> = {};

  for (const plat of platforms) {
    const latest = latestSnapshots.find((s) => s.platform === plat);
    platformFollowers[plat] = latest?.followers ?? 0;

    const platHistory = historySnapshots.filter((s) => s.platform === plat);
    if (platHistory.length >= 2) {
      const first = platHistory[0].followers ?? 0;
      const last = platHistory[platHistory.length - 1].followers ?? 0;
      followerGrowth28d[plat] = last - first;
    } else {
      followerGrowth28d[plat] = 0;
    }

    // Compute reach: sum of dailyViews or totalViews across the period
    let reach = 0;
    for (const s of platHistory) {
      const pd = (s.platformData ?? {}) as Record<string, number>;
      reach += pd.dailyViews ?? pd.dailyStreams ?? pd.alcanceDiario ?? 0;
    }
    // If no daily data, use latest totalViews as fallback
    if (reach === 0 && latest?.totalViews) {
      reach = latest.totalViews;
    }
    totalReach28d[plat] = reach;
  }

  // YouTube hours watched from analytics
  let hoursWatched = 0;
  const ytSnapshot = latestSnapshots.find((s) => s.platform === "YOUTUBE");
  if (ytSnapshot?.platformData) {
    const pd = ytSnapshot.platformData as Record<string, unknown>;
    const analytics = pd.analytics as Record<string, number> | undefined;
    if (analytics?.horasAssistidas) {
      hoursWatched = analytics.horasAssistidas;
    }
  }

  // Audience data (countries, traffic sources)
  const audienceInfo: {
    topCountries: Record<string, number> | null;
    trafficSources: Record<string, number> | null;
  } = { topCountries: null, trafficSources: null };

  for (const snapshot of latestSnapshots) {
    if (snapshot.audienceMetrics) {
      const am = snapshot.audienceMetrics;
      if (!audienceInfo.topCountries && am.topCountries) {
        audienceInfo.topCountries = am.topCountries as Record<string, number>;
      }
      const rawTopCities = (am.topCities as Record<string, number>) ?? null;
      if (!audienceInfo.trafficSources && isTrafficSourceData(rawTopCities)) {
        audienceInfo.trafficSources = rawTopCities;
      }
    }
  }

  // Engagement analysis per platform
  const engagementByPlatform: Record<string, {
    avgLikes: number;
    avgComments: number;
    avgViews: number;
    engagementRate: number;
    contentCount: number;
  }> = {};

  for (const snapshot of latestSnapshots) {
    const items = snapshot.contentMetrics;
    if (items.length === 0) continue;
    const totalLikes = items.reduce((s, c) => s + (c.likes ?? 0), 0);
    const totalComments = items.reduce((s, c) => s + (c.comments ?? 0), 0);
    const totalViews = items.reduce((s, c) => s + (c.views ?? 0), 0);
    const avgLikes = Math.round(totalLikes / items.length);
    const avgComments = Math.round(totalComments / items.length);
    const avgViews = Math.round(totalViews / items.length);
    const engRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;

    engagementByPlatform[snapshot.platform] = {
      avgLikes,
      avgComments,
      avgViews,
      engagementRate: Math.round(engRate * 100) / 100,
      contentCount: items.length,
    };
  }

  // Top 5 best performing content across all platforms
  const allContent: {
    title: string;
    platform: string;
    likes: number;
    views: number;
    comments: number;
    date: string | null;
    url: string | null;
    contentType: string;
  }[] = [];

  for (const snapshot of latestSnapshots) {
    for (const c of snapshot.contentMetrics) {
      allContent.push({
        title: c.title ?? "Sem titulo",
        platform: snapshot.platform,
        likes: c.likes ?? 0,
        views: c.views ?? 0,
        comments: c.comments ?? 0,
        date: c.publishedAt ? c.publishedAt.toISOString() : null,
        url: c.url ?? null,
        contentType: c.contentType,
      });
    }
  }
  // Sort by engagement (likes + views)
  allContent.sort((a, b) => (b.likes + b.views) - (a.likes + a.views));
  const topContent = allContent.slice(0, 5);

  // Total content count
  const totalContentCount = allContent.length;

  // Weighted engagement rate across platforms
  let totalWeightedEng = 0;
  let totalWeightViews = 0;
  for (const snapshot of latestSnapshots) {
    for (const c of snapshot.contentMetrics) {
      const v = c.views ?? 0;
      const l = c.likes ?? 0;
      const co = c.comments ?? 0;
      totalWeightViews += v;
      totalWeightedEng += l + co;
    }
  }
  const overallEngagementRate = totalWeightViews > 0
    ? Math.round((totalWeightedEng / totalWeightViews) * 10000) / 100
    : 0;

  // Total followers, growth, reach
  const totalFollowers = Object.values(platformFollowers).reduce((s, v) => s + v, 0);
  const totalGrowth = Object.values(followerGrowth28d).reduce((s, v) => s + v, 0);
  const totalReach = Object.values(totalReach28d).reduce((s, v) => s + v, 0);

  return (
    <>
      {/* Hero Section */}
      <div className="mb-8 sm:mb-12">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              AUDIENCIA
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Quem ouve sua musica
            </h1>
            <p className="max-w-md text-base leading-relaxed text-zinc-400">
              Entenda quem ouve sua musica e de onde vem seu publico. Dados essenciais para direcionar sua estrategia.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <img
              src="/artist/closeup.webp"
              alt="Debora Kailany"
              className="h-[280px] w-full object-cover sm:h-[350px] md:h-[400px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
          </div>
        </div>
      </div>
      <AudienceClient
        hasConnections={connectedPlatforms.length > 0}
        totalFollowers={totalFollowers}
        totalGrowth28d={totalGrowth}
        totalReach28d={totalReach}
        overallEngagementRate={overallEngagementRate}
        hoursWatched={hoursWatched}
        totalContentCount={totalContentCount}
        platformFollowers={platformFollowers}
        topCountries={audienceInfo.topCountries}
        trafficSources={audienceInfo.trafficSources}
        engagementByPlatform={engagementByPlatform}
        topContent={topContent}
      />
    </>
  );
}
