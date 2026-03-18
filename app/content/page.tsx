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

  return <ContentClient content={serializedContent} />;
}
