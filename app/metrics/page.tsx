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
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/artist/portrait.webp)" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Metricas</h1>
          <p className="mt-1 max-w-md text-sm text-zinc-400">Acompanhe o desempenho da sua musica em todas as plataformas</p>
        </div>
      </div>
      <MetricsClient history={serializedHistory} snapshots={serializedSnapshots} />
    </>
  );
}
