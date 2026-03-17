import { getAudienceData, getLatestSnapshots } from "@/lib/actions";
import { AudienceClient } from "./audience-client";

export default async function AudiencePage() {
  const [audienceData, snapshots] = await Promise.all([
    getAudienceData(),
    getLatestSnapshots(),
  ]);

  // Build a structured audience map per platform
  const platformAudience: Record<
    string,
    {
      ageRanges: Record<string, number> | null;
      genderSplit: Record<string, number> | null;
      topCountries: Record<string, number> | null;
      topCities: Record<string, number> | null;
    }
  > = {};

  for (const [platform, data] of Object.entries(audienceData)) {
    const d = data as {
      ageRanges?: unknown;
      genderSplit?: unknown;
      topCountries?: unknown;
      topCities?: unknown;
    };
    platformAudience[platform] = {
      ageRanges: (d.ageRanges as Record<string, number>) ?? null,
      genderSplit: (d.genderSplit as Record<string, number>) ?? null,
      topCountries: (d.topCountries as Record<string, number>) ?? null,
      topCities: (d.topCities as Record<string, number>) ?? null,
    };
  }

  // Also pull audience from snapshots if not already present
  for (const snapshot of snapshots) {
    if (!platformAudience[snapshot.platform] && snapshot.audienceMetrics) {
      const am = snapshot.audienceMetrics;
      platformAudience[snapshot.platform] = {
        ageRanges: (am.ageRanges as Record<string, number>) ?? null,
        genderSplit: (am.genderSplit as Record<string, number>) ?? null,
        topCountries: (am.topCountries as Record<string, number>) ?? null,
        topCities: (am.topCities as Record<string, number>) ?? null,
      };
    }
  }

  const platforms = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audiencia</h1>
        <p className="text-sm text-zinc-400">
          Dados demograficos e distribuicao do seu publico por plataforma
        </p>
      </div>

      <AudienceClient
        platforms={[...platforms]}
        audienceData={platformAudience}
      />
    </div>
  );
}
