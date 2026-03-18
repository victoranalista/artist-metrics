"use server";

import { prisma, ARTIST_ID } from "@/lib/db";
import { collectYouTubeMetrics } from "@/lib/platforms/youtube";
import { collectInstagramMetrics } from "@/lib/platforms/instagram";
import { collectSpotifyMetrics } from "@/lib/platforms/spotify";
import {
  fetchYouTubePublicData,
  fetchSpotifyPublicData,
  fetchInstagramPublicData,
} from "@/lib/platforms/public-fetch";
import { openai } from "@/lib/ai/client";
import {
  buildSystemPrompt,
  buildMetricsSummaryFromSnapshots,
} from "@/lib/ai/prompts";
import type { PlatformConnection } from "@prisma/client";
import type { CollectedMetrics, ContentItem } from "@/lib/platforms/types";
import { revalidatePath } from "next/cache";

// ── Artist ──

export async function getArtistData() {
  return prisma.artist.findUnique({ where: { id: ARTIST_ID } });
}

export async function updateArtist(data: {
  name?: string;
  style?: string;
  goals?: string;
  bio?: string;
  imageUrl?: string;
}) {
  const artist = await prisma.artist.update({
    where: { id: ARTIST_ID },
    data,
  });
  revalidatePath("/");
  return artist;
}

// ── Connections ──

export async function getConnections() {
  return prisma.platformConnection.findMany({
    where: { artistId: ARTIST_ID },
    select: {
      id: true,
      platform: true,
      displayName: true,
      status: true,
      connectedAt: true,
      metadata: true,
    },
  });
}

export async function disconnectPlatform(platform: string) {
  await prisma.platformConnection.delete({
    where: {
      artistId_platform: {
        artistId: ARTIST_ID,
        platform: platform.toUpperCase() as "YOUTUBE" | "INSTAGRAM" | "SPOTIFY",
      },
    },
  });
  revalidatePath("/connections");
}

// ── Connect by Profile (Public API) ──

export async function connectByProfile(platform: string, profileInput: string) {
  const platformKey = platform.toUpperCase() as "YOUTUBE" | "INSTAGRAM" | "SPOTIFY";

  try {
    if (platformKey === "INSTAGRAM") {
      const result = await fetchInstagramPublicData(profileInput);
      return { error: result.error };
    }

    if (platformKey === "YOUTUBE") {
      const data = await fetchYouTubePublicData(profileInput);

      // Upsert PlatformConnection
      await prisma.platformConnection.upsert({
        where: {
          artistId_platform: { artistId: ARTIST_ID, platform: "YOUTUBE" },
        },
        update: {
          accessToken: "public-api",
          refreshToken: null,
          tokenExpiry: null,
          externalId: data.channelId,
          displayName: data.name,
          status: "ACTIVE",
          metadata: {
            method: "public-api",
            thumbnailUrl: data.thumbnailUrl,
            description: data.description,
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "YOUTUBE",
          accessToken: "public-api",
          externalId: data.channelId,
          displayName: data.name,
          status: "ACTIVE",
          metadata: {
            method: "public-api",
            thumbnailUrl: data.thumbnailUrl,
            description: data.description,
          },
        },
      });

      // Save MetricsSnapshot
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const snapshot = await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: "YOUTUBE",
            date: today,
          },
        },
        update: {
          followers: data.subscribers,
          totalViews: data.totalViews,
          platformData: {
            videoCount: data.videoCount,
            channelId: data.channelId,
            method: "public-api",
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "YOUTUBE",
          date: today,
          followers: data.subscribers,
          totalViews: data.totalViews,
          platformData: {
            videoCount: data.videoCount,
            channelId: data.channelId,
            method: "public-api",
          },
        },
      });

      // Save content metrics (recent videos)
      if (data.recentVideos.length > 0) {
        await prisma.contentMetrics.deleteMany({
          where: { snapshotId: snapshot.id },
        });
        await prisma.contentMetrics.createMany({
          data: data.recentVideos.map((v) => ({
            snapshotId: snapshot.id,
            contentId: v.videoId,
            contentType: "video",
            title: v.title,
            url: `https://www.youtube.com/watch?v=${v.videoId}`,
            views: v.views,
            likes: v.likes,
          })),
        });
      }

      revalidatePath("/connections");
      revalidatePath("/");

      return {
        success: true,
        name: data.name,
        followers: data.subscribers,
        totalViews: data.totalViews,
        videoCount: data.videoCount,
        thumbnailUrl: data.thumbnailUrl,
      };
    }

    if (platformKey === "SPOTIFY") {
      const data = await fetchSpotifyPublicData(profileInput);

      // Upsert PlatformConnection
      await prisma.platformConnection.upsert({
        where: {
          artistId_platform: { artistId: ARTIST_ID, platform: "SPOTIFY" },
        },
        update: {
          accessToken: "public-api",
          refreshToken: null,
          tokenExpiry: null,
          externalId: data.artistId,
          displayName: data.name,
          status: "ACTIVE",
          metadata: {
            method: "public-api",
            imageUrl: data.imageUrl,
            genres: data.genres,
            popularity: data.popularity,
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "SPOTIFY",
          accessToken: "public-api",
          externalId: data.artistId,
          displayName: data.name,
          status: "ACTIVE",
          metadata: {
            method: "public-api",
            imageUrl: data.imageUrl,
            genres: data.genres,
            popularity: data.popularity,
          },
        },
      });

      // Save MetricsSnapshot
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const snapshot = await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: "SPOTIFY",
            date: today,
          },
        },
        update: {
          followers: data.followers,
          platformData: {
            popularity: data.popularity,
            genres: data.genres,
            artistId: data.artistId,
            method: "public-api",
          },
        },
        create: {
          artistId: ARTIST_ID,
          platform: "SPOTIFY",
          date: today,
          followers: data.followers,
          platformData: {
            popularity: data.popularity,
            genres: data.genres,
            artistId: data.artistId,
            method: "public-api",
          },
        },
      });

      // Save content metrics (top tracks + albums)
      const contentData = [
        ...data.topTracks.map((t, i) => ({
          snapshotId: snapshot.id,
          contentId: `track-${i}`,
          contentType: "track" as const,
          title: t.name,
          platformData: {
            popularity: t.popularity,
            previewUrl: t.previewUrl,
          },
        })),
        ...data.albums.map((a, i) => ({
          snapshotId: snapshot.id,
          contentId: `album-${i}`,
          contentType: a.type,
          title: a.name,
          publishedAt: a.releaseDate ? new Date(a.releaseDate) : undefined,
          platformData: { totalTracks: a.totalTracks },
        })),
      ];

      if (contentData.length > 0) {
        await prisma.contentMetrics.deleteMany({
          where: { snapshotId: snapshot.id },
        });
        await prisma.contentMetrics.createMany({ data: contentData });
      }

      revalidatePath("/connections");
      revalidatePath("/");

      return {
        success: true,
        name: data.name,
        followers: data.followers,
        popularity: data.popularity,
        genres: data.genres,
        imageUrl: data.imageUrl,
      };
    }

    return { error: `Plataforma "${platform}" não suportada para conexão por perfil.` };
  } catch (err) {
    console.error(`connectByProfile(${platform}) failed:`, err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao buscar dados do perfil.",
    };
  }
}

// ── Metrics ──

export async function getLatestSnapshots() {
  const platforms = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const;
  const snapshots = [];

  for (const platform of platforms) {
    const snapshot = await prisma.metricsSnapshot.findFirst({
      where: { artistId: ARTIST_ID, platform },
      orderBy: { date: "desc" },
      include: {
        contentMetrics: { orderBy: { views: "desc" }, take: 10 },
        audienceMetrics: true,
      },
    });
    if (snapshot) snapshots.push(snapshot);
  }

  return snapshots;
}

export async function getMetricsHistory(
  platform?: string,
  days: number = 30
) {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  return prisma.metricsSnapshot.findMany({
    where: {
      artistId: ARTIST_ID,
      ...(platform ? { platform: platform.toUpperCase() as "YOUTUBE" | "INSTAGRAM" | "SPOTIFY" } : {}),
      date: { gte: dateFrom },
    },
    orderBy: { date: "asc" },
  });
}

export async function getAllContent() {
  // Pegar último snapshot por plataforma (sem duplicar)
  const platforms = ["YOUTUBE", "INSTAGRAM", "SPOTIFY"] as const;
  const content: (Awaited<ReturnType<typeof prisma.contentMetrics.findMany>>[number] & { platform: string })[] = [];

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
        content.push({ ...c, platform: snapshot.platform });
      }
    }
  }

  // De-duplicar por contentId (manter o com mais views)
  const seen = new Map<string, typeof content[number]>();
  for (const item of content) {
    const existing = seen.get(item.contentId);
    if (!existing || (item.views ?? 0) > (existing.views ?? 0)) {
      seen.set(item.contentId, item);
    }
  }

  return Array.from(seen.values()).sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
}

export async function getAudienceData() {
  const snapshots = await prisma.metricsSnapshot.findMany({
    where: { artistId: ARTIST_ID },
    orderBy: { date: "desc" },
    include: { audienceMetrics: true },
  });

  // Get latest audience data per platform
  const audienceByPlatform: Record<string, unknown> = {};
  for (const s of snapshots) {
    if (s.audienceMetrics && !audienceByPlatform[s.platform]) {
      audienceByPlatform[s.platform] = s.audienceMetrics;
    }
  }

  return audienceByPlatform;
}

// ── Collect Metrics ──

const collectors: Record<
  string,
  (conn: PlatformConnection) => Promise<CollectedMetrics>
> = {
  YOUTUBE: collectYouTubeMetrics,
  INSTAGRAM: collectInstagramMetrics,
  SPOTIFY: collectSpotifyMetrics,
};

export async function collectAllMetrics() {
  const connections = await prisma.platformConnection.findMany({
    where: { artistId: ARTIST_ID, status: "ACTIVE" },
  });

  if (connections.length === 0) {
    return { error: "Nenhuma plataforma conectada" };
  }

  const results: { platform: string; status: string; message?: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const connection of connections) {
    const collector = collectors[connection.platform];
    if (!collector) continue;

    try {
      const metrics = await collector(connection);

      const snapshot = await prisma.metricsSnapshot.upsert({
        where: {
          artistId_platform_date: {
            artistId: ARTIST_ID,
            platform: connection.platform,
            date: today,
          },
        },
        update: {
          followers: metrics.followers,
          totalViews: metrics.totalViews,
          totalLikes: metrics.totalLikes,
          totalComments: metrics.totalComments,
          totalShares: metrics.totalShares,
          engagementRate: metrics.engagementRate,
          platformData: metrics.platformData as object,
        },
        create: {
          artistId: ARTIST_ID,
          platform: connection.platform,
          date: today,
          followers: metrics.followers,
          totalViews: metrics.totalViews,
          totalLikes: metrics.totalLikes,
          totalComments: metrics.totalComments,
          totalShares: metrics.totalShares,
          engagementRate: metrics.engagementRate,
          platformData: metrics.platformData as object,
        },
      });

      if (metrics.content.length > 0) {
        await prisma.contentMetrics.deleteMany({
          where: { snapshotId: snapshot.id },
        });
        await prisma.contentMetrics.createMany({
          data: metrics.content.map((c) => ({
            snapshotId: snapshot.id,
            contentId: c.contentId,
            contentType: c.contentType,
            title: c.title,
            thumbnailUrl: c.thumbnailUrl,
            publishedAt: c.publishedAt,
            url: c.url,
            views: c.views,
            likes: c.likes,
            comments: c.comments,
            shares: c.shares,
            saves: c.saves,
            platformData: c.platformData as object,
          })),
        });
      }

      if (metrics.audience) {
        const audienceData = {
          ageRanges: (metrics.audience.ageRanges ?? undefined) as object | undefined,
          genderSplit: (metrics.audience.genderSplit ?? undefined) as object | undefined,
          topCountries: (metrics.audience.topCountries ?? undefined) as object | undefined,
          topCities: (metrics.audience.topCities ?? undefined) as object | undefined,
        };
        await prisma.audienceMetrics.upsert({
          where: { snapshotId: snapshot.id },
          update: audienceData,
          create: { snapshotId: snapshot.id, ...audienceData },
        });
      }

      results.push({
        platform: connection.platform,
        status: "success",
        message: `${metrics.followers?.toLocaleString("pt-BR") ?? "?"} seguidores`,
      });
    } catch (error) {
      results.push({
        platform: connection.platform,
        status: "error",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  revalidatePath("/");
  return { results };
}

// ── Manual Metrics Upload ──

export async function uploadManualMetrics(data: {
  platform: string;
  date: string;
  metrics: object;
  notes?: string;
}) {
  const record = await prisma.manualMetrics.create({
    data: {
      artistId: ARTIST_ID,
      platform: data.platform,
      date: new Date(data.date),
      data: data.metrics as object,
      notes: data.notes,
    },
  });

  revalidatePath("/upload");
  return record;
}

export async function getManualMetrics() {
  return prisma.manualMetrics.findMany({
    where: { artistId: ARTIST_ID },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// ── Chat ──

export async function getChatHistory() {
  return prisma.chatMessage.findMany({
    where: { artistId: ARTIST_ID },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function sendChatMessage(content: string) {
  // Save user message
  await prisma.chatMessage.create({
    data: {
      artistId: ARTIST_ID,
      role: "USER",
      content,
    },
  });

  // Get context
  const artist = await prisma.artist.findUniqueOrThrow({
    where: { id: ARTIST_ID },
  });

  const snapshots = await getLatestSnapshots();
  const metricsSummary = buildMetricsSummaryFromSnapshots(snapshots);

  const allContent: ContentItem[] = snapshots.flatMap((s) =>
    s.contentMetrics.map((c) => ({
      contentId: c.contentId,
      contentType: c.contentType,
      title: c.title,
      thumbnailUrl: c.thumbnailUrl,
      publishedAt: c.publishedAt,
      url: c.url,
      views: c.views,
      likes: c.likes,
      comments: c.comments,
      shares: c.shares,
      saves: c.saves,
      platformData: (c.platformData ?? {}) as Record<string, unknown>,
    }))
  );

  const audienceSnapshot = snapshots.find((s) => s.audienceMetrics);
  const audience = audienceSnapshot?.audienceMetrics
    ? {
        ageRanges: (audienceSnapshot.audienceMetrics.ageRanges ?? null) as Record<string, number> | null,
        genderSplit: (audienceSnapshot.audienceMetrics.genderSplit ?? null) as Record<string, number> | null,
        topCountries: (audienceSnapshot.audienceMetrics.topCountries ?? null) as Record<string, number> | null,
        topCities: (audienceSnapshot.audienceMetrics.topCities ?? null) as Record<string, number> | null,
      }
    : null;

  const systemPrompt = buildSystemPrompt(
    artist,
    metricsSummary,
    allContent,
    audience
  );

  // Get recent chat history for context
  const history = await prisma.chatMessage.findMany({
    where: { artistId: ARTIST_ID },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const messages = history.reverse().map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const response = await openai.responses.create({
    model: "gpt-5.4-mini",
    instructions: systemPrompt,
    input: messages,
    tools: [
      {
        type: "web_search_preview",
        search_context_size: "medium",
      },
    ],
  });

  const assistantContent = response.output_text;

  // Save assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      artistId: ARTIST_ID,
      role: "ASSISTANT",
      content: assistantContent,
    },
  });

  return assistantMessage;
}

export async function clearChatHistory() {
  await prisma.chatMessage.deleteMany({
    where: { artistId: ARTIST_ID },
  });
  revalidatePath("/chat");
}
