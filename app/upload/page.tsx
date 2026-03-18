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
    <>
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/artist/studio.webp)" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Upload de Metricas</h1>
          <p className="mt-1 max-w-md text-sm text-zinc-400">Registre metricas manualmente</p>
        </div>
      </div>
      <UploadClient existingMetrics={serializedMetrics} />
    </>
  );
}
