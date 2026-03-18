import { getManualMetrics } from "@/lib/actions";
import { UploadClient } from "./upload-client";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const manualMetrics = await getManualMetrics();

  const serializedMetrics = manualMetrics.map((m) => ({
    id: m.id,
    platform: m.platform,
    date: m.date.toISOString().split("T")[0],
    data: m.data as Record<string, unknown>,
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
  }));

  return <UploadClient existingMetrics={serializedMetrics} />;
}
