import { getAudienceData, getLatestSnapshots, getConnections } from "@/lib/actions";
import { AudienceClient } from "./audience-client";

export const dynamic = "force-dynamic";

// Known YouTube traffic source names
const TRAFFIC_SOURCE_NAMES = new Set([
  "ADVERTISING",
  "ANNOTATION",
  "BROWSE_FEATURES",
  "CAMPAIGN_CARD",
  "END_SCREEN",
  "EXT_URL",
  "EXTERNAL",
  "HASHTAGS",
  "LIVE_REDIRECT",
  "NO_LINK_EMBEDDED",
  "NO_LINK_OTHER",
  "NOTIFICATION",
  "PLAYLIST",
  "PROMOTED",
  "RELATED_VIDEO",
  "SEARCH",
  "SHORTS",
  "SUBSCRIBER",
  "SUGGESTED",
  "YT_CHANNEL",
  "YT_OTHER_PAGE",
  "YT_PLAYLIST_PAGE",
  "YT_SEARCH",
  "VIDEO_REMIXES",
]);

function isTrafficSourceData(data: Record<string, number> | null): boolean {
  if (!data) return false;
  const keys = Object.keys(data);
  if (keys.length === 0) return false;
  // If most keys look like traffic source names (all caps, underscores), it's traffic data
  const trafficCount = keys.filter(
    (k) => TRAFFIC_SOURCE_NAMES.has(k) || /^[A-Z_]+$/.test(k)
  ).length;
  return trafficCount / keys.length > 0.5;
}

export default async function AudiencePage() {
  const [audienceData, snapshots, connections] = await Promise.all([
    getAudienceData(),
    getLatestSnapshots(),
    getConnections(),
  ]);

  const connectedPlatforms = connections.map((c) => c.platform);

  // Build a structured audience map per platform
  const platformAudience: Record<
    string,
    {
      ageRanges: Record<string, number> | null;
      genderSplit: Record<string, number> | null;
      topCountries: Record<string, number> | null;
      topCities: Record<string, number> | null;
      trafficSources: Record<string, number> | null;
    }
  > = {};

  for (const [platform, data] of Object.entries(audienceData)) {
    const d = data as {
      ageRanges?: unknown;
      genderSplit?: unknown;
      topCountries?: unknown;
      topCities?: unknown;
    };

    const rawTopCities = (d.topCities as Record<string, number>) ?? null;
    const isTraffic = isTrafficSourceData(rawTopCities);

    platformAudience[platform] = {
      ageRanges: (d.ageRanges as Record<string, number>) ?? null,
      genderSplit: (d.genderSplit as Record<string, number>) ?? null,
      topCountries: (d.topCountries as Record<string, number>) ?? null,
      topCities: isTraffic ? null : rawTopCities,
      trafficSources: isTraffic ? rawTopCities : null,
    };
  }

  // Also pull audience from snapshots if not already present
  for (const snapshot of snapshots) {
    if (!platformAudience[snapshot.platform] && snapshot.audienceMetrics) {
      const am = snapshot.audienceMetrics;
      const rawTopCities = (am.topCities as Record<string, number>) ?? null;
      const isTraffic = isTrafficSourceData(rawTopCities);

      platformAudience[snapshot.platform] = {
        ageRanges: (am.ageRanges as Record<string, number>) ?? null,
        genderSplit: (am.genderSplit as Record<string, number>) ?? null,
        topCountries: (am.topCountries as Record<string, number>) ?? null,
        topCities: isTraffic ? null : rawTopCities,
        trafficSources: isTraffic ? rawTopCities : null,
      };
    }
  }

  // Only show tabs for connected platforms
  const platforms = (["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const).filter(
    (p) => connectedPlatforms.includes(p)
  );

  return (
    <>
      {/* Hero Section */}
      <div className="mb-8 sm:mb-12">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              AUDIÊNCIA
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Quem ouve sua música
            </h1>
            <p className="max-w-md text-base leading-relaxed text-zinc-400">
              Entenda quem ouve sua música e de onde vem seu público. Dados essenciais para direcionar sua estratégia.
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
        platforms={[...platforms]}
        audienceData={platformAudience}
        hasConnections={connectedPlatforms.length > 0}
      />
    </>
  );
}
