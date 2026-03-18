import { getAllContent } from "@/lib/actions";
import { ContentClient } from "./content-client";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  let content: Awaited<ReturnType<typeof getAllContent>> = [];
  try {
    content = await getAllContent();
  } catch {
    content = [];
  }

  const serializedContent = content.map((c) => ({
    id: c.id,
    contentId: c.contentId,
    contentType: c.contentType ?? "VIDEO",
    title: c.title ?? "Sem título",
    publishedAt: c.publishedAt
      ? typeof c.publishedAt === "string"
        ? c.publishedAt
        : c.publishedAt instanceof Date
          ? c.publishedAt.toISOString()
          : null
      : null,
    url: c.url ?? null,
    views: typeof c.views === "number" ? c.views : 0,
    likes: typeof c.likes === "number" ? c.likes : 0,
    comments: typeof c.comments === "number" ? c.comments : 0,
    shares: typeof c.shares === "number" ? c.shares : 0,
    saves: typeof c.saves === "number" ? c.saves : 0,
    platform: c.platform ?? "YOUTUBE",
  }));

  // Sort by views desc by default (safe)
  serializedContent.sort((a, b) => b.views - a.views);

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
              Analise o desempenho de cada conteudo publicado. Descubra o que funciona e o que pode melhorar.
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
