import { prisma, ARTIST_ID } from "@/lib/db";
import { ContentClient } from "./content-client";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  // Fetch latest snapshot per platform with content metrics + platformData
  const platforms = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const;
  const allContent: {
    id: string;
    contentId: string;
    contentType: string;
    title: string;
    publishedAt: string | null;
    url: string | null;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    platform: string;
    platformData: Record<string, unknown> | null;
  }[] = [];

  for (const platform of platforms) {
    const snapshot = await prisma.metricsSnapshot.findFirst({
      where: { artistId: ARTIST_ID, platform },
      orderBy: { date: "desc" },
      include: {
        contentMetrics: {
          orderBy: { views: "desc" },
        },
      },
    });
    if (snapshot) {
      for (const c of snapshot.contentMetrics) {
        allContent.push({
          id: c.id,
          contentId: c.contentId,
          contentType: c.contentType ?? "VIDEO",
          title: c.title ?? "Sem titulo",
          publishedAt: c.publishedAt
            ? c.publishedAt instanceof Date
              ? c.publishedAt.toISOString()
              : typeof c.publishedAt === "string"
                ? c.publishedAt
                : null
            : null,
          url: c.url ?? null,
          views: typeof c.views === "number" ? c.views : 0,
          likes: typeof c.likes === "number" ? c.likes : 0,
          comments: typeof c.comments === "number" ? c.comments : 0,
          shares: typeof c.shares === "number" ? c.shares : 0,
          saves: typeof c.saves === "number" ? c.saves : 0,
          platform: snapshot.platform,
          platformData: c.platformData as Record<string, unknown> | null,
        });
      }
    }
  }

  // De-duplicate by contentId (keep highest views)
  const seen = new Map<string, (typeof allContent)[number]>();
  for (const item of allContent) {
    const existing = seen.get(item.contentId);
    if (!existing || item.views > existing.views) {
      seen.set(item.contentId, item);
    }
  }

  const serializedContent = Array.from(seen.values()).sort(
    (a, b) => b.views - a.views
  );

  return (
    <>
      {/* Hero Section */}
      <div className="mb-8 sm:mb-12">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              CONTEUDO
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Seus videos e musicas
            </h1>
            <p className="max-w-md text-base leading-relaxed text-zinc-400">
              Analise o desempenho de cada video e musica que voce publicou. Descubra o que mais engaja seu publico.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <img
              src="/artist/content.webp"
              alt="Debora Kailany"
              className="h-[280px] w-full object-cover sm:h-[350px] md:h-[400px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
          </div>
        </div>
      </div>
      <ContentClient content={serializedContent} />
    </>
  );
}
