import { getAllContent } from "@/lib/actions";
import { ContentClient } from "./content-client";

export default async function ContentPage() {
  const content = await getAllContent();

  const serializedContent = content.map((c) => ({
    id: c.id,
    contentId: c.contentId,
    contentType: c.contentType,
    title: c.title,
    thumbnailUrl: c.thumbnailUrl,
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    url: c.url,
    views: c.views ?? 0,
    likes: c.likes ?? 0,
    comments: c.comments ?? 0,
    shares: c.shares ?? 0,
    saves: c.saves ?? 0,
    platform: c.platform,
  }));

  return <ContentClient content={serializedContent} />;
}
