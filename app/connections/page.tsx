import { getConnections } from "@/lib/actions";
import { ConnectionsClient } from "./connections-client";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const connections = await getConnections();

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/artist/hero.webp)" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Conexoes</h1>
          <p className="mt-1 max-w-md text-sm text-zinc-400">Conecte suas plataformas para coletar dados</p>
        </div>
      </div>
      <ConnectionsClient connections={connections} />
    </>
  );
}
