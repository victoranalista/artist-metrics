import { getMetricsHistory, getLatestSnapshots } from "@/lib/actions";
import { MetricsClient } from "./metrics-client";

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

  return <MetricsClient history={serializedHistory} snapshots={serializedSnapshots} />;
}
