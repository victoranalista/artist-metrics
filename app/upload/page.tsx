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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Manual</h1>
        <p className="text-sm text-zinc-400">
          Adicione metricas manualmente para plataformas que nao possuem integracao automatica
        </p>
      </div>

      <UploadClient existingMetrics={serializedMetrics} />
    </div>
  );
}
